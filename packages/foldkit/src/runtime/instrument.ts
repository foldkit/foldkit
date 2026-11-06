import { Option, Predicate } from 'effect'

import { currentDispatchingEvent } from '../snabbdom/eventlisteners.js'
import { type Visibility, isVisible } from './visibility.js'

/** One Message processed during a frame. */
export type InstrumentMessage<Message> = Readonly<{
  message: Message
  /** The Message tag, nested Submodel tags joined with `>`
   *  (`GotTimeline>ClickedRow`). */
  tag: string
  updateMs: number
  /** The DOM event being dispatched when the Message was enqueued (`click`,
   *  `keydown`, `scroll`), or undefined for Messages from Commands,
   *  Subscriptions, Mounts and navigation. */
  eventType: string | undefined
  /** `event.timeStamp` of that DOM event, on the `performance.now()` clock.
   *  The gap to `processedAt` is input delay. */
  eventTimeStamp: number | undefined
  enqueuedAt: number
  processedAt: number
}>

/** The work one frame did, from the first Message it processed to the next
 *  paint after its commit. */
export type InstrumentFrame<Message> = Readonly<{
  /** Messages processed since the previous frame, in order. Empty for the
   *  initial render. */
  messages: ReadonlyArray<InstrumentMessage<Message>>
  /** False when no Message changed the Model, so nothing rendered. */
  isRendered: boolean
  /** The earliest event timestamp or enqueue time among `messages`, or the
   *  render start for the initial render. */
  startTime: number
  updateMs: number
  viewMs: number
  patchMs: number
  /** `performance.now()` after the patch committed. */
  commitEnd: number
  /** `performance.now()` in the first task after the commit's frame, an
   *  approximation of when the browser painted it. Undefined when nothing
   *  rendered. */
  paintEnd: number | undefined
  /** `paintEnd` (or `commitEnd`) minus `startTime`. For a frame triggered by
   *  a DOM event this is the input-to-paint latency INP measures. */
  durationMs: number
  isDocumentVisible: boolean
}>

/**
 * Frame instrumentation. `onFrame` receives one record per rendered frame,
 * plus one for Messages that did not change the Model. Records arrive after
 * the frame painted, outside the render path, so the callback may do I/O.
 *
 * - `show`: `'Always'` (default) or `'Development'`.
 * - `minDurationMs`: skip frames faster than this. Defaults to 0.
 * - `sampleRate`: fraction of frames to report, 0 to 1. Defaults to 1.
 */
export type InstrumentConfig<Message> = Readonly<{
  show?: Visibility
  minDurationMs?: number
  sampleRate?: number
  onFrame: (frame: InstrumentFrame<Message>) => void
}>

/** Where a queued Message came from, captured at enqueue time. */
export type MessageOrigin = Readonly<{
  eventType: string | undefined
  eventTimeStamp: number | undefined
  enqueuedAt: number
}>

/** @internal The runtime's side of instrumentation. */
export type FrameRecorder<Message> = Readonly<{
  captureOrigin: () => MessageOrigin
  recordMessage: (
    message: Message,
    origin: MessageOrigin | undefined,
    processedAt: number,
    updateMs: number,
    isDirty: boolean,
  ) => void
  recordCommit: (viewStartedAt: number, viewMs: number, patchMs: number) => void
}>

const MAX_TAG_DEPTH = 4
// NOTE: a paused DevTools session or a crash stops commits; the cap keeps the
// pending list bounded until the next frame reports it.
const MAX_PENDING_MESSAGES = 200

const isTaggedObject = (value: unknown): boolean =>
  Predicate.isObject(value) &&
  Predicate.hasProperty(value, '_tag') &&
  Predicate.isString(value._tag)

/** Names a Message by its tag path. Submodel Messages wrap the child Message
 *  in a field, so the first tagged field is followed
 *  (`GotTimeline>ClickedRow`). */
export const messageTagPath = (message: unknown): string => {
  const tags: Array<string> = []
  let current: unknown = message
  while (
    tags.length < MAX_TAG_DEPTH &&
    Predicate.isObject(current) &&
    Predicate.hasProperty(current, '_tag') &&
    Predicate.isString(current._tag)
  ) {
    tags.push(current._tag)
    current = Object.values(current).find(isTaggedObject)
  }
  return tags.length === 0 ? 'unknown' : tags.join('>')
}

// NOTE: Foldkit's own listener records the event its handlers run under, and
// handlers enqueue on that stack. `window.event` covers raw listeners, such as
// a Mount's, in browsers that still set it.
const currentEvent = (): Option.Option<Event> => {
  const ownEvent = currentDispatchingEvent()
  if (ownEvent !== undefined) {
    return Option.some(ownEvent)
  }
  const globalEvent: unknown = Reflect.get(globalThis, 'event')
  return globalEvent instanceof Event ? Option.some(globalEvent) : Option.none()
}

const afterPaint = (callback: () => void): void => {
  const channel = new MessageChannel()
  channel.port1.onmessage = () => {
    channel.port1.close()
    callback()
  }
  channel.port2.postMessage(null)
}

/** @internal Builds the recorder, or none when instrumentation is off. */
export const __makeFrameRecorder = <Message>(
  config: InstrumentConfig<Message> | undefined,
  isDevelopment: boolean,
): Option.Option<FrameRecorder<Message>> => {
  if (
    config === undefined ||
    !isVisible(config.show ?? 'Always', isDevelopment)
  ) {
    return Option.none()
  }
  const { onFrame, minDurationMs = 0, sampleRate = 1 } = config

  let messages: Array<InstrumentMessage<Message>> = []
  let isRenderPending = false

  const report = (frame: InstrumentFrame<Message>): void => {
    if (frame.durationMs >= minDurationMs && Math.random() < sampleRate) {
      onFrame(frame)
    }
  }

  const startTimeOf = (
    frameMessages: ReadonlyArray<InstrumentMessage<Message>>,
    fallback: number,
  ): number =>
    frameMessages.reduce(
      (earliest, { eventTimeStamp, enqueuedAt }) =>
        Math.min(earliest, eventTimeStamp ?? enqueuedAt),
      fallback,
    )

  const updateMsOf = (
    frameMessages: ReadonlyArray<InstrumentMessage<Message>>,
  ): number =>
    frameMessages.reduce((total, { updateMs }) => total + updateMs, 0)

  const takeMessages = (): ReadonlyArray<InstrumentMessage<Message>> => {
    const taken = messages
    messages = []
    return taken
  }

  return Option.some({
    captureOrigin: () => {
      const maybeEvent = currentEvent()
      return {
        eventType: Option.getOrUndefined(
          Option.map(maybeEvent, ({ type }) => type),
        ),
        eventTimeStamp: Option.getOrUndefined(
          Option.map(maybeEvent, ({ timeStamp }) => timeStamp),
        ),
        enqueuedAt: performance.now(),
      }
    },
    recordMessage: (message, origin, processedAt, updateMs, isDirty) => {
      if (messages.length >= MAX_PENDING_MESSAGES) {
        messages.shift()
      }
      messages.push({
        message,
        tag: messageTagPath(message),
        updateMs,
        eventType: origin?.eventType,
        eventTimeStamp: origin?.eventTimeStamp,
        enqueuedAt: origin?.enqueuedAt ?? processedAt,
        processedAt,
      })
      if (isDirty) {
        isRenderPending = true
        return
      }
      if (!isRenderPending) {
        const frameMessages = takeMessages()
        const commitEnd = performance.now()
        const startTime = startTimeOf(frameMessages, processedAt)
        report({
          messages: frameMessages,
          isRendered: false,
          startTime,
          updateMs: updateMsOf(frameMessages),
          viewMs: 0,
          patchMs: 0,
          commitEnd,
          paintEnd: undefined,
          durationMs: commitEnd - startTime,
          isDocumentVisible: document.visibilityState === 'visible',
        })
      }
    },
    recordCommit: (viewStartedAt, viewMs, patchMs) => {
      isRenderPending = false
      const frameMessages = takeMessages()
      const commitEnd = performance.now()
      const startTime = startTimeOf(frameMessages, viewStartedAt)
      const isDocumentVisible = document.visibilityState === 'visible'
      afterPaint(() => {
        const paintEnd = performance.now()
        report({
          messages: frameMessages,
          isRendered: true,
          startTime,
          updateMs: updateMsOf(frameMessages),
          viewMs,
          patchMs,
          commitEnd,
          paintEnd,
          durationMs: paintEnd - startTime,
          isDocumentVisible,
        })
      })
    },
  })
}
