export const OUTLINE_ENABLED_KEY = '__foldkitOutlinesEnabled'

export const OUTLINE_CUSTOM_EVENT = 'foldkit:outline'

export const shouldRecordOutline = (): boolean =>
  typeof window !== 'undefined' &&
  Reflect.get(window, OUTLINE_ENABLED_KEY) === true

export const setOutlineRecordingEnabled = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    Reflect.set(window, OUTLINE_ENABLED_KEY, enabled)
  }
}
