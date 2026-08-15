;(function () {
  var pref = localStorage.getItem('theme-preference')
  var theme = pref ? JSON.parse(pref) : 'System'
  var isDark =
    theme === 'Dark' ||
    (theme === 'System' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) document.documentElement.classList.add('dark')
  // NOTE: mirrors --color-cream and --color-gray-900 in styles.css.
  // src/themeColor.test.ts fails when these drift.
  var themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? '#1e1c21' : '#f8f7fb')
  }
})()
