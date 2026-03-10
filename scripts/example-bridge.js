// Bridge script for embedded examples. Injected by build-examples.sh.
// Strips the embed base path so the app's router sees "/" on boot, and encodes
// the example slug in ?embedded= so reloads resolve back to the correct example
// (see embeddedExampleRedirectPlugin in vite.config.ts).
;(function () {
  var params = new URLSearchParams(location.search)
  if (!params.has('embedded')) {
    return
  }

  var slug =
    params.get('embedded') ||
    location.pathname.replace(/\/index\.html$/, '').split('/')[2] ||
    ''

  var originalPushState = history.pushState.bind(history)
  var originalReplaceState = history.replaceState.bind(history)

  var bootUrl = new URL('/', location.origin)
  bootUrl.searchParams.set('embedded', slug)
  originalReplaceState(
    null,
    '',
    bootUrl.pathname + bootUrl.search + location.hash,
  )

  function addEmbedParam(url) {
    if (!url || typeof url !== 'string') {
      return url
    }
    var parsed = new URL(url, location.origin)
    parsed.searchParams.set('embedded', slug)
    return parsed.pathname + parsed.search + parsed.hash
  }

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
