import { Schema as S } from 'effect'

import { ts } from '../schema/index.js'

// SHARED

/** A serialized history entry as it appears on the wire. `submodelPath` lists `Got<Child>Message` wrapper tags from outer to inner when the entry came up through a Submodel chain; `maybeLeafTag` is `Some` with the innermost child Message tag when one exists. */
export const SerializedEntry = S.Struct({
  index: S.Number,
  tag: S.String,
  message: S.Unknown,
  commandNames: S.Array(S.String),
  timestamp: S.Number,
  isModelChanged: S.Boolean,
  changedPaths: S.Array(S.String),
  affectedPaths: S.Array(S.String),
  submodelPath: S.Array(S.String),
  maybeLeafTag: S.Option(S.String),
})
/** A serialized history entry suitable for transmission over the WS protocol. */
export type SerializedEntry = typeof SerializedEntry.Type

/** Metadata about a single keyframe. The index identifies the point in history where the runtime can replay back to. */
export const KeyframeInfo = S.Struct({
  index: S.Number,
})
/** Metadata about a single keyframe. */
export type KeyframeInfo = typeof KeyframeInfo.Type

/** Metadata about a connected browser runtime. */
export const RuntimeInfo = S.Struct({
  connectionId: S.String,
  url: S.String,
  title: S.String,
})
/** Metadata about a connected browser runtime. */
export type RuntimeInfo = typeof RuntimeInfo.Type

// REQUEST

/** Request the current Model snapshot, optionally narrowed to a path and/or expanded. */
export const RequestGetModel = ts('RequestGetModel', {
  maybePath: S.Option(S.String),
  expand: S.Boolean,
})

/** Request a historical Model snapshot at an absolute history index, optionally narrowed to a path and/or expanded. Use `index: -1` for the initial Model. */
export const RequestGetModelAt = ts('RequestGetModelAt', {
  index: S.Number,
  maybePath: S.Option(S.String),
  expand: S.Boolean,
})

/** Request recent history entries, optionally starting from a given index. */
export const RequestListMessages = ts('RequestListMessages', {
  limit: S.Number,
  maybeSinceIndex: S.Option(S.Number),
})

/** Request a single history entry by index. To inspect the Model around the entry, call `RequestGetModelAt` with `index - 1` (before) and `index` (after). */
export const RequestGetMessage = ts('RequestGetMessage', {
  index: S.Number,
})

/** Request the list of available keyframes. */
export const RequestListKeyframes = ts('RequestListKeyframes')

/** Request the runtime jump to a specific keyframe. The runtime is paused on success; resume via RequestResume. */
export const RequestReplayToKeyframe = ts('RequestReplayToKeyframe', {
  keyframeIndex: S.Number,
})

/** Request the runtime resume normal execution from a paused state. */
export const RequestResume = ts('RequestResume')

/** Request the recorded init data: the initial Model and the names of Commands returned from `init`. */
export const RequestGetInit = ts('RequestGetInit')

/** Request a snapshot of the runtime's DevTools state: history bounds, current paused/live status, and whether init is recorded. */
export const RequestGetRuntimeState = ts('RequestGetRuntimeState')

/** Request the runtime dispatch a Message at the current state. The payload is opaque to the protocol; the runtime validates against the app's Message Schema. */
export const RequestDispatchMessage = ts('RequestDispatchMessage', {
  message: S.Unknown,
})

/** Request the list of currently connected browser runtimes. Handled by the Vite plugin, not forwarded to a runtime. */
export const RequestListRuntimes = ts('RequestListRuntimes')

/** A request from the MCP server. RequestListRuntimes is handled at the Vite plugin layer; all other requests are routed to a browser runtime. */
export const Request = S.Union(
  RequestGetModel,
  RequestGetModelAt,
  RequestListMessages,
  RequestGetMessage,
  RequestListKeyframes,
  RequestReplayToKeyframe,
  RequestResume,
  RequestDispatchMessage,
  RequestListRuntimes,
  RequestGetInit,
  RequestGetRuntimeState,
)
/** A request from the MCP server. */
export type Request = typeof Request.Type

// RESPONSE

/** Response carrying a Model snapshot. The `value` is the resolved subtree at `atPath` (or the whole Model when no path was supplied). When `summarized` is true, large arrays/records/strings have been collapsed to `_summary` placeholders to keep payloads small for AI agents; pass `expand: true` on the Request to receive the literal value. */
export const ResponseModel = ts('ResponseModel', {
  value: S.Unknown,
  atPath: S.String,
  summarized: S.Boolean,
})

/** Response carrying a page of history entries. `maybeNextIndex` is `Some` when more entries are available beyond this page (pass it as `RequestListMessages.maybeSinceIndex` to fetch the next page) and `None` when this page reaches the current end of history. */
export const ResponseMessages = ts('ResponseMessages', {
  entries: S.Array(SerializedEntry),
  maybeNextIndex: S.Option(S.Number),
})

/** Response carrying a single history entry. Model snapshots are not included; use `RequestGetModelAt` with `index - 1` and `index` to inspect Model state around the entry. */
export const ResponseMessage = ts('ResponseMessage', {
  entry: SerializedEntry,
})

/** Response carrying the list of available keyframes. */
export const ResponseKeyframes = ts('ResponseKeyframes', {
  keyframes: S.Array(KeyframeInfo),
})

/** Response confirming a successful replay. The runtime is paused at this Model. */
export const ResponseReplayed = ts('ResponseReplayed', {
  model: S.Unknown,
})

/** Response confirming the runtime resumed normal execution. */
export const ResponseResumed = ts('ResponseResumed')

/** Response confirming a Message was dispatched. The `acceptedAtIndex` is the absolute history index where the entry is predicted to land. Computed from the runtime's history length at dispatch time. The Message reaches the runtime's update loop asynchronously, so concurrent Messages produced by the runtime itself could in principle shift ordering; in practice the bridge is the only external dispatch source and the runtime queue serializes Messages, so this index is reliable for correlation. */
export const ResponseDispatched = ts('ResponseDispatched', {
  acceptedAtIndex: S.Number,
})

/** Response carrying the list of connected runtimes. */
export const ResponseRuntimes = ts('ResponseRuntimes', {
  runtimes: S.Array(RuntimeInfo),
})

/** Response carrying the recorded init data. `maybeModel` is `None` until the runtime has finished its first render and recorded init; once set it stays set for the rest of the runtime's life. `commandNames` lists the Commands returned from the application's `init` function in the order they were produced. */
export const ResponseInit = ts('ResponseInit', {
  maybeModel: S.Option(S.Unknown),
  commandNames: S.Array(S.String),
})

/** Response carrying a snapshot of the runtime's DevTools state. `currentIndex` is the absolute index of the most recently recorded Message, or -1 when no Messages have been recorded yet. `startIndex` is the earliest absolute index still retained in the rolling buffer (older entries are evicted past `maxEntries`). `totalEntries` is the number of retained entries. `isPaused` is true while the runtime is paused at a replayed snapshot; `maybePausedAtIndex` is `Some(index)` then and `None` otherwise. `hasInitModel` is true once the runtime has finished initialising. */
export const ResponseRuntimeState = ts('ResponseRuntimeState', {
  currentIndex: S.Number,
  startIndex: S.Number,
  totalEntries: S.Number,
  isPaused: S.Boolean,
  maybePausedAtIndex: S.Option(S.Number),
  hasInitModel: S.Boolean,
})

/** Response carrying an error reason for a failed Request. */
export const ResponseError = ts('ResponseError', {
  reason: S.String,
})

/** A response replying to a Request. */
export const Response = S.Union(
  ResponseModel,
  ResponseMessages,
  ResponseMessage,
  ResponseKeyframes,
  ResponseReplayed,
  ResponseResumed,
  ResponseDispatched,
  ResponseRuntimes,
  ResponseInit,
  ResponseRuntimeState,
  ResponseError,
)
/** A response replying to a Request. */
export type Response = typeof Response.Type

// EVENT

/** A new browser runtime connected. */
export const EventConnected = ts('EventConnected', {
  runtime: RuntimeInfo,
})

/** A previously connected runtime disconnected. */
export const EventDisconnected = ts('EventDisconnected', {
  connectionId: S.String,
})

/** A runtime lifecycle event used by the Vite plugin to track which browser tabs are connected. Not forwarded to MCP clients. */
export const Event = S.Union(EventConnected, EventDisconnected)
/** A runtime lifecycle event. */
export type Event = typeof Event.Type

// FRAME

/** A wire frame carrying a Request from the MCP server. The id is opaque, used only by the MCP server to correlate the matching Response. The maybeConnectionId routes the request to a specific runtime when present. */
export const RequestFrame = S.Struct({
  id: S.String,
  maybeConnectionId: S.Option(S.String),
  request: Request,
})
/** A wire frame carrying a Request from the MCP server. */
export type RequestFrame = typeof RequestFrame.Type

/** A wire frame carrying a Response, correlated to a Request by id. */
export const ResponseFrame = S.Struct({
  id: S.String,
  response: Response,
})
/** A wire frame carrying a Response, correlated to a Request by id. */
export type ResponseFrame = typeof ResponseFrame.Type

/** A wire frame carrying a runtime lifecycle event from the bridge to the Vite plugin. */
export const EventFrame = S.Struct({
  maybeConnectionId: S.Option(S.String),
  event: Event,
})
/** A wire frame carrying a runtime lifecycle event. */
export type EventFrame = typeof EventFrame.Type
