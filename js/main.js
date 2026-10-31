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
