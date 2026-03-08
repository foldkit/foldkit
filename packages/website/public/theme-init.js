;(function () {
  var pref = localStorage.getItem('theme-preference')
  var theme = pref ? JSON.parse(pref) : 'System'
  var isDark =
    theme === 'Dark' ||
    (theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) document.documentElement.classList.add('dark')
})()
