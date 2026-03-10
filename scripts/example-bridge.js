// Bridge script for embedded examples.
// Injected into built example HTML by build-examples.sh.
// Only activates when ?embedded is in the URL.
;(function () {
  var params = new URLSearchParams(location.search)
  if (!params.has('embedded')) {
    return
  }

  // Resolve the example slug from the query param (on reload after redirect)
  // or from the pathname (on initial load from the iframe tag).
  var slug =
    params.get('embedded') ||
    location.pathname.replace(/\/index\.html$/, '').split('/')[2] ||
    ''

  var originalPushState = history.pushState.bind(history)
  var originalReplaceState = history.replaceState.bind(history)

  // Strip the embed base path so the app's router sees "/" on boot.
  // Encode the slug in the embedded param so the dev server can resolve
  // the correct example on reload (see embeddedExampleRedirectPlugin).
  originalReplaceState(null, '', '/?embedded=' + slug + location.hash)

  // Ensure the embedded param is present on every URL the app sets,
  // so a reload from any route resolves back to the correct example.
  function addEmbedParam(url) {
    if (!url || typeof url !== 'string') {
      return url
    }
    var parsed = new URL(url, location.origin)
    parsed.searchParams.set('embedded', slug)
    return parsed.pathname + parsed.search + parsed.hash
  }

  // Strip the embedded param before reporting the URL to the parent,
  // so the parent sees clean app-level URLs like "/" or "/login".
  function cleanUrl() {
    var url = new URL(location.href)
    url.searchParams.delete('embedded')
    var search = url.searchParams.toString()
    return url.pathname + (search ? '?' + search : '') + url.hash
  }

  function notifyParent() {
    window.parent.postMessage(
      {
        type: 'foldkit-example-url',
        url: cleanUrl(),
      },
      window.location.origin,
    )
  }

  history.pushState = function (state, title, url) {
    originalPushState(state, title, addEmbedParam(url))
    notifyParent()
  }

  history.replaceState = function (state, title, url) {
    originalReplaceState(state, title, addEmbedParam(url))
    notifyParent()
  }

  window.addEventListener('popstate', notifyParent)

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) {
      return
    }

    if (event.data && event.data.type === 'foldkit-example-navigate') {
      originalPushState(null, '', addEmbedParam(event.data.url))
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  })

  notifyParent()
})()
