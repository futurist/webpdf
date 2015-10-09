// http://codepen.io/CrocoDillon/pen/dkcbs?editors=001
// http://crocodillon.com/blog/non-blocking-web-fonts-using-localstorage
/**
 * Should be in the head to prevent FOUT on subsequent page views.
 * http://crocodillon.com/blog/non-blocking-web-fonts-using-localstorage
 *
 * Make sure to edit md5 and path to your fonts json!
 */
(function(window, document) {

  var isModernBrowser = (
        'querySelector' in document &&
        'localStorage' in window &&
        'addEventListener' in window
      ),
      md5 = 'e90ba95faca6e63b5516ed839f451',
      key = 'glyphiconFonts',
      cache;

  if (!isModernBrowser) {
    // Sorry, browser is too old!
    return;
  }

  function insertFont(value) {
    var style = document.createElement('style');
    style.innerHTML = value;
    document.head.appendChild(style);
  }

  // PRE-RENDER
  try {
    cache = window.localStorage.getItem(key);
    if (cache) {
      cache = JSON.parse(cache);
      if (cache.md5 == md5) {
        insertFont(cache.value);
      } else {
        // Busting cache when md5 doesn't match
        window.localStorage.removeItem(key);
        cache = null;
      }
    }
  } catch(e) {
    // Most likely LocalStorage disabled, so hopeless...
    return;
  }

  // POST-RENDER
  if (!cache) {
    window.addEventListener('load', function() {
      var request = new XMLHttpRequest(),
          response;
      request.open('GET', 'js/glyphicon.json', true);
      request.onload = function() {

        if (this.status == 200) {
          try {
            response = JSON.parse(this.response);
            insertFont(response.value);
            window.localStorage.setItem(key, this.response);
          } catch(e) {
            // LocalStorage is probably full
          }
        }
      };
      request.send();
    });
  }
})(window, document);

/**
 * Inspired by: https://github.com/guardian/frontend/blob/dea76ec06878986a417b9fc0f87e11965f504d27/common/app/assets/javascripts/modules/ui/fonts.js
 */
