const announceUrlChange = (): void => {
  window.dispatchEvent(new CustomEvent('foldkit:urlchange'))
}

export const pushHistory = (url: string): void => {
  window.history.pushState({}, '', url)
  announceUrlChange()
}

export const replaceHistory = (url: string): void => {
  window.history.replaceState({}, '', url)
  announceUrlChange()
}
