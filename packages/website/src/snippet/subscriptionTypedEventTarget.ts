import { Dom } from 'foldkit'

const slowWarningTarget: Dom.TypedEventTarget<{
  'foldkit:slow-warning': CustomEvent<{ durationMs: number }>
}> = new EventTarget()

const slowWarnings = Dom.streamFromEvent({
  target: slowWarningTarget,
  type: 'foldkit:slow-warning',
  mapEvent: event => event.detail.durationMs,
})
