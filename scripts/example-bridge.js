// Bridge script for embedded examples.
// Injected into built example HTML by build-examples.sh.
// Only activates when ?embedded is in the URL.
;(function () {
  if (!new URLSearchParams(location.search).has('embedded')) {
    return
  }

  // Strip the embed base path so the app's router sees "/" on boot.
  // Vite's --base flag makes asset URLs absolute, so this is safe.
  var originalPushState = history.pushState.bind(history)
  var originalReplaceState = history.replaceState.bind(history)
  originalReplaceState(null, '', '/' + location.search + location.hash)

  function notifyParent() {
    window.parent.postMessage(
      {
        type: 'foldkit-example-url',
        url: location.pathname + location.search + location.hash,
      },
      window.location.origin,
    )
  }

  history.pushState = function () {
    originalPushState.apply(history, arguments)
    notifyParent()
  }

  history.replaceState = function () {
    originalReplaceState.apply(history, arguments)
    notifyParent()
  }

  window.addEventListener('popstate', notifyParent)

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) {
      return
    }

    if (event.data && event.data.type === 'foldkit-example-navigate') {
      originalPushState(null, '', event.data.url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  })

  notifyParent()
})()
