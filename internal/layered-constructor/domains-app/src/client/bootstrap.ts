import type { SearchInputConfig } from './searchInput'

// NOTE: The server serializes this function into a classic script; shared values must arrive through its config.
export const bootstrapSearchInput = ({
  id,
  touchMediaQuery,
  desktopMediaQuery,
}: SearchInputConfig) => {
  const input = document.getElementById(id)
  const app = document.getElementById('domains-app')

  if (!(input instanceof HTMLInputElement) || !app) {
    return
  }

  const controller = new AbortController()
  const options = { signal: controller.signal }
  const updatePendingResults = () => {
    const label =
      input.value
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .split(/[./]/)
        .at(0) ?? ''

    const isReturningToEmpty =
      !input.value && app.getAttribute('data-search') === 'active'

    app.setAttribute('data-search', input.value ? 'active' : 'idle')

    if (input.value) {
      app.setAttribute('data-search-layout', 'Search')
      document.documentElement.setAttribute('data-domains-search-started', '')
    }

    if (isReturningToEmpty) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    app.querySelectorAll('[data-domain-label]').forEach(labelElement => {
      labelElement.textContent = label
    })
  }
  const restoreQueryFromUrl = () => {
    const query = new URLSearchParams(location.search).get('q') ?? ''

    if (input.value !== query) {
      input.value = query
    }

    updatePendingResults()
  }
  const replaceSearchUrl = () => {
    const url = new URL(location.href)

    if (input.value) {
      url.searchParams.set('q', input.value)
    } else {
      url.searchParams.delete('q')
    }

    history.replaceState(history.state, '', url)
    updatePendingResults()
  }

  if (input.value !== input.defaultValue) {
    replaceSearchUrl()
  } else {
    restoreQueryFromUrl()
  }

  input.addEventListener('input', replaceSearchUrl, options)
  input.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape' && !event.isComposing) {
        event.preventDefault()
        input.value = ''
        replaceSearchUrl()
      }
    },
    options,
  )
  input.form?.addEventListener(
    'submit',
    event => {
      event.preventDefault()

      if (window.matchMedia(touchMediaQuery).matches) {
        input.blur()
      }
    },
    options,
  )
  app.querySelector('.clear-search')?.addEventListener(
    'click',
    () => {
      input.value = ''
      replaceSearchUrl()
      input.focus({ preventScroll: true })
    },
    options,
  )
  const domainsHome = app.querySelector('a.brand')

  if (domainsHome instanceof HTMLAnchorElement) {
    domainsHome.addEventListener(
      'click',
      event => {
        const isClientNavigationAllowed =
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !event.defaultPrevented

        if (!isClientNavigationAllowed) {
          return
        }

        event.preventDefault()
        history.pushState(history.state, '', domainsHome.href)
        restoreQueryFromUrl()
        input.focus({ preventScroll: true })
      },
      options,
    )
  }

  window.addEventListener('popstate', restoreQueryFromUrl, options)
  document.addEventListener(
    'domains:ready',
    () => {
      controller.abort()
    },
    { once: true },
  )

  if (
    window.matchMedia(desktopMediaQuery).matches &&
    document.activeElement === document.body
  ) {
    input.focus({ preventScroll: true })
  }
}
