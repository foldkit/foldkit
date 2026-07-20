import { Effect, Schema as S } from 'effect'

import { ts } from '../schema/index.js'

// SHARED

/** A serialized Command produced during a Message dispatch (or `init`). `args` is `Some` when the Command's definition declared an args record, and carries the runtime values used to construct the Command instance. */
export const SerializedCommand = S.Struct({
  name: S.String,
  args: S.OptionFromNullOr(S.Record(S.String, S.Unknown)),
})
/** A serialized Command suitable for transmission over the WS protocol. */
export type SerializedCommand = typeof SerializedCommand.Type

/** A serialized Mount lifecycle event (start or end). `args` is `Some` when the Mount's definition declared an args record, and carries the runtime values used to construct the MountAction instance. */
export const SerializedMount = S.Struct({
  name: S.String,
  args: S.OptionFromNullOr(S.Record(S.String, S.Unknown)),
})
/** A serialized Mount lifecycle event suitable for transmission over the WS protocol. */
export type SerializedMount = typeof SerializedMount.Type

/** A serialized history entry as it appears on the wire. `submodelPath` lists `Got<Child>Message` wrapper tags from outer to inner when the entry came up through a Submodel chain; `maybeLeafTag` is `Some` with the innermost child Message tag when one exists. `mountStarts` lists Mounts that fired during the render after this Message; `mountEnds` lists Mounts whose elements were unmounted during that render. The Messages dispatched by mount Effects appear as their own entries elsewhere in history. */
export const SerializedEntry = S.Struct({
  index: S.Number,
  tag: S.String,
  message: S.Unknown,
  commands: S.Array(SerializedCommand),
  mountStarts: S.Array(SerializedMount),
  mountEnds: S.Array(SerializedMount),
  timestamp: S.Number,
  isModelChanged: S.Boolean,
  changedPaths: S.Array(S.String),
  affectedPaths: S.Array(S.String),
  submodelPath: S.Array(S.String),
  maybeLeafTag: S.OptionFromNullOr(S.String),
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
  maybePath: S.OptionFromNullOr(S.String),
  expand: S.Boolean,
})

/** Request a historical Model snapshot at an absolute history index, optionally narrowed to a path and/or expanded. Use `index: -1` for the initial Model. */
export const RequestGetModelAt = ts('RequestGetModelAt', {
  index: S.Number,
  maybePath: S.OptionFromNullOr(S.String),
  expand: S.Boolean,
})

/** Request recent history entries. `maybeSinceIndex` starts the page at an absolute index; `fromEnd` returns the final entries instead (the two are mutually exclusive). `maybeChangedPathsMatch` filters entries server-side to those whose `changedPaths` match at least one dot-string pattern: segments compare pairwise for the length of the shorter list and `*` matches any single segment, so `root.grid` matches changes anywhere inside the grid subtree and `root.grid.5.3` also matches a wholesale replacement recorded at `root.grid`. The two newer fields decode with defaults when absent, so requests from an older MCP server keep working against a newer runtime. */
export const RequestListMessages = ts('RequestListMessages', {
  limit: S.Number,
  maybeSinceIndex: S.OptionFromNullOr(S.Number),
  maybeChangedPathsMatch: S.OptionFromNullOr(S.Array(S.String)).pipe(
    S.withDecodingDefault(Effect.succeed(null)),
  ),
  fromEnd: S.Boolean.pipe(S.withDecodingDefault(Effect.succeed(false))),
})

/** Request a histogram of retained history entries by Message tag. Accepts the same `maybeSinceIndex` / `maybeChangedPathsMatch` filters as `RequestListMessages` but returns only counts, so the response stays small regardless of history size. */
export const RequestCountMessagesByTag = ts('RequestCountMessagesByTag', {
  maybeSinceIndex: S.OptionFromNullOr(S.Number),
  maybeChangedPathsMatch: S.OptionFromNullOr(S.Array(S.String)),
})

/** Request a path-level diff between the Models at two absolute history indices. Each index follows `RequestGetModelAt` semantics (the Model right after that entry was applied; -1 is the initial Model). `maybeChangedPathsMatch` narrows the reported changes with the same pattern semantics as `RequestListMessages`. */
export const RequestDiffModels = ts('RequestDiffModels', {
  fromIndex: S.Number,
  toIndex: S.Number,
  maybeChangedPathsMatch: S.OptionFromNullOr(S.Array(S.String)),
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

/** Request a description of the app's Message Schema. The runtime derives a JSON Schema document once at bridge boot from the configured `DevToolsConfig.Message`; the response is `None` when no Message Schema was configured. With `maybeVariantTag: None`, the response carries a small variant index (tag names plus payload field names and a tagged-union indicator) so MCP clients can enumerate the top-level variants without paying for the full schema. With `maybeVariantTag: Some(path)`, the value is interpreted as a dot-separated path of variant `_tag` values walked through each variant's single tagged-union payload field; the response carries the JSON Schema document narrowed along that chain, with any deeper unions collapsed to summary placeholders. Use the index to discover variants, then fetch one variant before calling `RequestDispatchMessage`. */
export const RequestGetMessageSchema = ts('RequestGetMessageSchema', {
  maybeVariantTag: S.OptionFromNullOr(S.String),
})

/** Request the list of currently connected browser runtimes. Handled by the Vite plugin, not forwarded to a runtime. */
export const RequestListRuntimes = ts('RequestListRuntimes')

/** A request from the MCP server. RequestListRuntimes is handled at the Vite plugin layer; all other requests are routed to a browser runtime. */
export const Request = S.Union([
  RequestGetModel,
  RequestGetModelAt,
  RequestListMessages,
  RequestCountMessagesByTag,
  RequestDiffModels,
  RequestGetMessage,
  RequestListKeyframes,
  RequestReplayToKeyframe,
  RequestResume,
  RequestDispatchMessage,
  RequestListRuntimes,
  RequestGetInit,
  RequestGetRuntimeState,
  RequestGetMessageSchema,
])
/** A request from the MCP server. */
export type Request = typeof Request.Type

// RESPONSE

/** Response carrying a Model snapshot. The `value` is the resolved subtree at `atPath` (or the whole Model when no path was supplied). When `summarized` is true, large arrays/records/strings have been collapsed to `_summary` placeholders to keep payloads small for AI agents; pass `expand: true` on the Request to receive the literal value. */
export const ResponseModel = ts('ResponseModel', {
  value: S.Unknown,
  atPath: S.String,
  summarized: S.Boolean,
})

/** Response carrying a page of history entries. For forward reads, `maybeNextIndex` is `Some` of the absolute index of the next entry matching the request's filters (pass it as `RequestListMessages.maybeSinceIndex` to fetch the next page) and `None` when the page reaches the end of matching history. Tail reads (`fromEnd`) always carry `None`. */
export const ResponseMessages = ts('ResponseMessages', {
  entries: S.Array(SerializedEntry),
  maybeNextIndex: S.OptionFromNullOr(S.Number),
})

/** Response carrying a single history entry. Model snapshots are not included; use `RequestGetModelAt` with `index - 1` and `index` to inspect Model state around the entry. */
export const ResponseMessage = ts('ResponseMessage', {
  entry: SerializedEntry,
})

/** One row of a Message-tag histogram. */
export const MessageTagCount = S.Struct({
  tag: S.String,
  count: S.Number,
})
/** One row of a Message-tag histogram. */
export type MessageTagCount = typeof MessageTagCount.Type

/** Response carrying a Message-tag histogram, sorted by count descending then tag ascending. `totalCount` is the number of entries counted after filters. `scannedFromIndex` / `scannedToIndex` bound the absolute index range scanned (`scannedToIndex` is -1 when no entries are retained), so callers learn the live history bounds without a separate runtime-state call. */
export const ResponseMessageCounts = ts('ResponseMessageCounts', {
  counts: S.Array(MessageTagCount),
  totalCount: S.Number,
  scannedFromIndex: S.Number,
  scannedToIndex: S.Number,
})

/** The value on one side of a Model diff path: `Present` carries the summarized value; `Absent` means the path does not exist on that side (an added or removed key or element). The tagged shape is deliberate: a nullable encoding could not distinguish an absent path from a path whose value is literally `null`. `undefined`, which JSON cannot represent, is reported as `null`. */
export const DiffValueAbsent = ts('Absent')
/** The value on one side of a Model diff path. See `DiffValue`. */
export const DiffValuePresent = ts('Present', { value: S.Unknown })
/** The value on one side of a Model diff path. */
export const DiffValue = S.Union([DiffValueAbsent, DiffValuePresent])
/** The value on one side of a Model diff path. */
export type DiffValue = typeof DiffValue.Type

/** One changed path in a Model diff. `before` is the value at `fromIndex`, `after` the value at `toIndex`. */
export const ModelDiffChange = S.Struct({
  path: S.String,
  before: DiffValue,
  after: DiffValue,
})
/** One changed path in a Model diff. */
export type ModelDiffChange = typeof ModelDiffChange.Type

/** Response carrying a path-level Model diff between two history indices. Changes list the leaf paths where the Models differ, sorted by path with numeric segments in numeric order; values are summarized with the same rules `ResponseModel` applies when `expand` is false. */
export const ResponseModelDiff = ts('ResponseModelDiff', {
  fromIndex: S.Number,
  toIndex: S.Number,
  changes: S.Array(ModelDiffChange),
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

/** Response confirming a Message was dispatched. The `acceptedAtIndex` is the absolute history index where the entry is predicted to land. Computed from the runtime's history length at dispatch time. The runtime processes Messages in arrival order and the bridge is the only external dispatch source, so this index is reliable for correlation. */
export const ResponseDispatched = ts('ResponseDispatched', {
  acceptedAtIndex: S.Number,
})

/** One variant entry in a `MessageSchemaIndex`. `payloadFields` lists the variant's payload property names (excluding `_tag`); `unionFields` lists the subset of those properties whose schemas are themselves `_tag`-discriminated unions. A Submodel-wrapper variant always shows up with `unionFields: ['message']`, but the same flag also catches plain tagged-union value types like `UrlRequest = Internal | External`. Either way, the agent will need to pick a variant when filling these fields. */
export const MessageSchemaIndexEntry = S.Struct({
  tag: S.String,
  payloadFields: S.Array(S.String),
  unionFields: S.Array(S.String),
})
/** One variant entry in a `MessageSchemaIndex`. */
export type MessageSchemaIndexEntry = typeof MessageSchemaIndexEntry.Type

/** A flat directory of every top-level Message variant the runtime accepts, designed to fit in an agent context regardless of Message-union size. Use the tag names to make a follow-up `RequestGetMessageSchema` with `maybeVariantTag` set to fetch the full JSON Schema for one variant. */
export const MessageSchemaIndex = S.Struct({
  variants: S.Array(MessageSchemaIndexEntry),
})
/** A flat directory of every top-level Message variant. */
export type MessageSchemaIndex = typeof MessageSchemaIndex.Type

/** The result payload carried by `ResponseMessageSchema`. `MessageSchemaIndexResult` is returned when the request omitted `maybeVariantTag`; `MessageSchemaDocumentResult` carries a JSON Schema document narrowed to one variant when a tag was supplied. */
export const MessageSchemaIndexResult = ts('MessageSchemaIndexResult', {
  index: MessageSchemaIndex,
})

/** A JSON Schema document carrying a single variant of the runtime's Message union, plus the original `definitions` block so any `$ref`s the variant carries still resolve. */
export const MessageSchemaDocumentResult = ts('MessageSchemaDocumentResult', {
  document: S.Unknown,
})

const MessageSchemaResult = S.Union([
  MessageSchemaIndexResult,
  MessageSchemaDocumentResult,
])
/** The result payload carried by `ResponseMessageSchema`. */
export type MessageSchemaResult = typeof MessageSchemaResult.Type

/** Response describing the app's Message Schema. `maybeResult` is `Some(MessageSchemaIndexResult)` for index requests, `Some(MessageSchemaDocumentResult)` for variant-narrowed requests, and `None` when the runtime has not configured `DevToolsConfig.Message` or when JSON Schema derivation failed. Variant tags appear as `_tag` enums in the document, nested Submodel Messages recurse correctly, and `S.Option` fields render as `anyOf: [{_tag: 'Some', value}, {_tag: 'None'}]`. Apps using `S.OptionFromNullishOr(T)` (the Foldkit-canonical option codec for shapes that cross a JSON boundary) instead see the field as nullable `anyOf: [T, null]`; agents dispatching against that shape send either the bare value or `null`, not a tagged `Some`/`None` envelope. Fields with no JSON representation, such as `S.instanceOf(File)`, render as `{ type: 'null' }` rather than throwing; those variants cannot be dispatched via the bridge because their values live in browser memory. A few AST nodes (symbol-keyed structs, symbol-indexed records, tuples with post-rest elements) still cause the derivation to throw; the bridge guards the call and returns `None` in that case while logging a warning to the dev console. */
export const ResponseMessageSchema = ts('ResponseMessageSchema', {
  maybeResult: S.OptionFromNullOr(MessageSchemaResult),
})

/** Response carrying the list of connected runtimes. */
export const ResponseRuntimes = ts('ResponseRuntimes', {
  runtimes: S.Array(RuntimeInfo),
})

/** Response carrying the recorded init data. `maybeModel` is `None` until the runtime has finished its first render and recorded init; once set it stays set for the rest of the runtime's life. `commands` lists the Commands returned from the application's `init` function in the order they were produced, with their args when declared. `mountStarts` lists the Mounts that fired during the initial render, with their args when declared. */
export const ResponseInit = ts('ResponseInit', {
  maybeModel: S.OptionFromNullOr(S.Unknown),
  commands: S.Array(SerializedCommand),
  mountStarts: S.Array(SerializedMount),
})

/** Response carrying a snapshot of the runtime's DevTools state. `currentIndex` is the absolute index of the most recently recorded Message, or -1 when no Messages have been recorded yet. `startIndex` is the earliest absolute index still retained in the rolling buffer (older entries are evicted past `maxEntries`). `totalEntries` is the number of retained entries. `isPaused` is true while the runtime is paused at a replayed snapshot; `maybePausedAtIndex` is `Some(index)` then and `None` otherwise. `hasInitModel` is true once the runtime has finished initialising. */
export const ResponseRuntimeState = ts('ResponseRuntimeState', {
  currentIndex: S.Number,
  startIndex: S.Number,
  totalEntries: S.Number,
  isPaused: S.Boolean,
  maybePausedAtIndex: S.OptionFromNullOr(S.Number),
  hasInitModel: S.Boolean,
})

/** Response carrying an error reason for a failed Request. */
export const ResponseError = ts('ResponseError', {
  reason: S.String,
})

/** A response replying to a Request. */
export const Response = S.Union([
  ResponseModel,
  ResponseMessages,
  ResponseMessage,
  ResponseMessageCounts,
  ResponseModelDiff,
  ResponseKeyframes,
  ResponseReplayed,
  ResponseResumed,
  ResponseDispatched,
  ResponseRuntimes,
  ResponseInit,
  ResponseRuntimeState,
  ResponseMessageSchema,
  ResponseError,
])
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
export const Event = S.Union([EventConnected, EventDisconnected])
/** A runtime lifecycle event. */
export type Event = typeof Event.Type

// FRAME

/** A wire frame carrying a Request from the MCP server. The id is opaque, used only by the MCP server to correlate the matching Response. The maybeConnectionId routes the request to a specific runtime when present. */
export const RequestFrame = S.Struct({
  id: S.String,
  maybeConnectionId: S.OptionFromNullOr(S.String),
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
  maybeConnectionId: S.OptionFromNullOr(S.String),
  event: Event,
})
/** A wire frame carrying a runtime lifecycle event. */
export type EventFrame = typeof EventFrame.Type
