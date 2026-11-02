/** @internal Canonical Tabs implementation. */
export const tabId = (id: string, index: number): string => `${id}-tab-${index}`

/** @internal Canonical Tabs implementation. */
export const tabPanelId = (id: string, index: number): string =>
  `${id}-panel-${index}`
