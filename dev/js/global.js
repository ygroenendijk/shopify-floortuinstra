/* eslint no-unused-vars: 0 */

window.drawerToggleClasses = {
  filters: 'filter-is-open',
  cartDrawer: 'cart-drawer-is-open',
  mobileMenu: 'mobile-menu-is-open',
  headerSearch: 'search-is-open',
};

/**
  * debug function check, returns true when on localhost or myshopify.com domain
*/
const debug = () => window.location.hostname === '127.0.0.1' || window.location.hostname.indexOf('myshopify.com') !== -1;

const windowWidth = () => window.innerWidth;

const trapFocusHandlers = {};
/**
 * @param {Object} element the element to check
 * @returns true if the element is in the viewport
 */
function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'summary, a[href], button:enabled, [tabindex]:not([tabindex^=\'-\']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe',
    ),
  );
}

/**
 * Traps focus within a container
 * @param {Object} container the container to trap focus within
 * @param {Object} elementToFocus the element to focus when trapFocus is called
 */
function trapFocus(container, elementToFocus = container) {
  const elements = getFocusableElements(container);
  console.log('container', container);
  console.log('elementToFocus', elementToFocus);

  const first = elements[0];
  const last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    console.log('here');
    if (event?.code.toUpperCase() !== 'TAB') return; // If not TAB key

    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();
}

/**
 * Removes the event listeners added by trapFocus()
 * @param {Object} elementToFocus
 */
function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

/**
 * Pauses all media on the page
 */
function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + 'pauseVideo' + '","args":""}',
      '*',
    );
  } );
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  } );
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => model.modelViewerUI?.pause());
}

/**
 * A custom element that wraps a quantity input
*/
if (!customElements.get('quantity-input')) {
  class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('input');
      this.changeEvent = new Event('change', {
        bubbles: true,
      } );

      this.querySelectorAll('button').forEach((button) =>
        button.addEventListener('click', this.onButtonClick.bind(this)),
      );
    }

    onButtonClick(event) {
      event.preventDefault();
      const previousValue = this.input.value;

      event.currentTarget.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
      if (previousValue !== this.input.value) {
        this.input.dispatchEvent(this.changeEvent);
      }
    }
  }

  customElements.define('quantity-input', QuantityInput);
}

/**
 * @param {Function} fn function to debounce
 * @param {Integer} wait time in ms
 * @returns a timeout function that will only execute fn after wait ms have passed since the last time it was called
 */
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * @param {Object} form the form to serialize
 * @returns a JSON string of the form data
 */
const serializeForm = (form) => {
  const obj = {};
  const formData = new FormData(form);
  for (const key of formData.keys()) {
    obj[key] = formData.get(key);
  }
  return JSON.stringify(obj);
};

/**
 * @param {*} type the type of data to fetch
 * @returns a config object for fetch
 */
function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: `application/${type}`,
    },
  };
}

/**
 * Prevents the default action of an event
 */
document.querySelectorAll('.prevent-hashjump').forEach((link) => {
  link.addEventListener('click', (e) => {
    const hashtag = e.target.href.split('#');
    if (hashtag[1]) {
      const targetElem = document.querySelector('#' + hashtag[1]);
      if (targetElem) {
        const scrollTop = window.pageYOffset;

        window.scrollTo( {
          top: scrollTop,
        } );
        setTimeout(function () {
          window.scrollTo( {
            top: scrollTop,
          } );
        }, 1);
      }
    }
  } );
} );

// listen for resize event
window.addEventListener( 'resize', debounce(() => {
  windowWidth();
}, 50));

/*
 * Shopify Common JS - Don't change
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {
  };
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    }
    else {
      for (var i = 0; i < provinces.length; i++) {
        var opt2 = document.createElement('option');
        opt2.value = provinces[i][0];
        opt2.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt2);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};
