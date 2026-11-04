/*
  WAIACAN — language routing. Loaded in <head> of both language versions.

  Rule: visitors in Colombia get Spanish (/es/), everyone else English (/).
  - Only the English home page redirects, and only to Spanish. The Spanish page never
    redirects, so a shared /es/ link always opens in Spanish.
  - A language the visitor picks with the EN/ES switch is remembered (localStorage) and
    always wins over the IP check.
  - Country comes from GeoJS (free, keyless IP lookup; same service as sweat440.com),
    cached for the browser session so it's looked up once.
  - Crawlers are never redirected; both versions are indexed via hreflang.
  Testing: ?country=CO (or any code) fakes the visitor's country; ?country= clears the cache.
*/
(function () {
  var script = document.currentScript;
  var pageLang = script.getAttribute('data-page-lang');
  var altHref = script.getAttribute('data-alt-href');
  var PREF_KEY = 'waiacan_lang';
  var COUNTRY_KEY = 'waiacan_country';
  var GEO_URL = 'https://get.geojs.io/v1/ip/country.json';
  var SPANISH_COUNTRIES = ['CO'];

  function read(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } }
  function write(store, key, value) { try { window[store].setItem(key, value); } catch (e) {} }

  // Remember an explicit choice from the EN/ES switch (header, footer).
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-set-lang]');
    if (link) write('localStorage', PREF_KEY, link.getAttribute('data-set-lang'));
  });

  if (pageLang !== 'en') return;
  if (/bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)) return;

  // Keep the query string (UTM tags, click IDs) so campaign traffic stays attributable.
  function toSpanish() { location.replace(altHref + location.search + location.hash); }

  var pref = read('localStorage', PREF_KEY);
  if (pref === 'es') return toSpanish();
  if (pref === 'en') return;

  var override = /[?&]country=([A-Za-z]{0,2})(?:&|$)/.exec(location.search);
  if (override) write('sessionStorage', COUNTRY_KEY, override[1].toUpperCase());

  function route(country) {
    if (SPANISH_COUNTRIES.indexOf(country) !== -1) toSpanish();
  }

  var cached = read('sessionStorage', COUNTRY_KEY);
  if (cached) return route(cached);

  if (!window.fetch) return;
  fetch(GEO_URL)
    .then(function (r) { if (!r.ok) throw new Error('geo ' + r.status); return r.json(); })
    .then(function (g) {
      var country = String(g.country || '').toUpperCase();
      if (!country) return;
      write('sessionStorage', COUNTRY_KEY, country);
      route(country);
    })
    .catch(function () { /* lookup failed: stay on English */ });
})();
