/*
  WAIACAN — site behavior.
  Mobile nav toggle, header border on scroll, footer year. No dependencies.
*/
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  var header = document.querySelector('.site-header');

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    // Close the mobile menu after jumping to a section.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Hero word rotator: slides the accent word up through data-words, looping back to the first.
  // The original word stays as screen-reader text so the heading still reads "…Can Achieve."
  // Skipped entirely for reduced-motion users, who just see the static first word.
  var rotator = document.querySelector('.rotator[data-words]');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (rotator && !reduceMotion) {
    var words = rotator.getAttribute('data-words').split(',');
    var track = document.createElement('span');
    track.className = 'rotator-track';
    track.setAttribute('aria-hidden', 'true');
    // Repeat the first word at the end so the last step slides up into it seamlessly.
    words.concat(words[0]).forEach(function (w) {
      var s = document.createElement('span');
      s.textContent = w;
      track.appendChild(s);
    });
    var label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = rotator.textContent;
    rotator.textContent = '';
    rotator.appendChild(label);
    rotator.appendChild(track);
    rotator.classList.add('is-ready');

    var items = track.children;
    var index = 0;
    var fitWidth = function () {
      rotator.style.width = items[index].offsetWidth + 'px';
    };
    fitWidth();
    window.addEventListener('resize', fitWidth);
    // Webfont swap changes word widths after first paint.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWidth);

    setInterval(function () {
      if (document.hidden) return;
      index += 1;
      track.style.transform = 'translateY(' + (-1.2 * index) + 'em)';
      fitWidth();
      if (index === words.length) {
        // On the duplicate first word: jump back to the real one without animating.
        setTimeout(function () {
          track.style.transition = 'none';
          index = 0;
          track.style.transform = 'translateY(0)';
          track.offsetHeight; // flush so the next change animates again
          track.style.transition = '';
        }, 650);
      }
    }, 2400);
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Contact form: post to FormSubmit's AJAX endpoint so the visitor stays on the page.
  // If fetch fails outright, fall back to the form's normal POST (which redirects to thanks.html).
  var form = document.getElementById('contact-form');
  if (form && window.fetch && window.FormData) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var buttonHtml = button.innerHTML;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      button.disabled = true;
      button.textContent = 'Sending…';
      status.textContent = '';
      status.classList.remove('is-error');

      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || 'Send failed');
          });
        })
        .then(function () {
          form.innerHTML =
            '<div class="form-success" role="status">' +
            '<h3>Thank you. We\'ve received your message.</h3>' +
            '<p>We\'ll get back to you shortly at the email you provided.</p>' +
            '</div>';
        })
        .catch(function () {
          button.disabled = false;
          button.innerHTML = buttonHtml;
          status.classList.add('is-error');
          status.innerHTML = 'Something went wrong sending your message. Please try again or email us at ' +
            '<a href="mailto:santiago@waiacan.com">santiago@waiacan.com</a>.';
        });
    });
  }
})();
