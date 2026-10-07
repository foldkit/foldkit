import { Browser } from 'foldkit'

const slowWarningTarget: Browser.TypedEventTarget<{
  'foldkit:slow-warning': CustomEvent<{ durationMs: number }>
}> = new EventTarget()

const slowWarnings = Browser.streamFromEvent({
  target: slowWarningTarget,
  type: 'foldkit:slow-warning',
  mapEvent: event => event.detail.durationMs,
})
