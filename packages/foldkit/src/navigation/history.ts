// The one place history is written and the change announced. `pushUrl` and
// `replaceUrl` go through here, and so does the runtime when it handles a
// link click itself, so every path reaches `onUrlChange` the same way.

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
