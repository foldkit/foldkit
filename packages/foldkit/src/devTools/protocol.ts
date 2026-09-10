import { Effect, Schema } from 'effect'

import { defineTaggedUnion } from '../schema/index.js'

// SHARED

/** A serialized Command produced during a Message dispatch (or `init`). `args` is `Some` when the Command's definition declared an args record, and carries the runtime values used to construct the Command instance. */
export const SerializedCommand = Schema.Struct({
  name: Schema.String,
  args: Schema.OptionFromNullOr(Schema.Record(Schema.String, Schema.Unknown)),
})
/** A serialized Command suitable for transmission over the WS protocol. */
export type SerializedCommand = typeof SerializedCommand.Type

/** A serialized Mount lifecycle event (start or end). `args` is `Some` when the Mount's definition declared an args record, and carries the runtime values used to construct the MountAction instance. */
export const SerializedMount = Schema.Struct({
  name: Schema.String,
  args: Schema.OptionFromNullOr(Schema.Record(Schema.String, Schema.Unknown)),
})
/** A serialized Mount lifecycle event suitable for transmission over the WS protocol. */
export type SerializedMount = typeof SerializedMount.Type

/** A serialized history entry as it appears on the wire. `submodelPath` lists `Got<Child>Message` wrapper tags from outer to inner when the entry came up through a Submodel chain; `maybeLeafTag` is `Some` with the innermost child Message tag when one exists. `mountStarts` lists Mounts that fired during the render after this Message; `mountEnds` lists Mounts whose elements were unmounted during that render. The Messages dispatched by mount Effects appear as their own entries elsewhere in history. */
export const SerializedEntry = Schema.Struct({
  index: Schema.Number,
  tag: Schema.String,
  message: Schema.Unknown,
  commands: Schema.Array(SerializedCommand),
  mountStarts: Schema.Array(SerializedMount),
  mountEnds: Schema.Array(SerializedMount),
  timestamp: Schema.Number,
  isModelChanged: Schema.Boolean,
  changedPaths: Schema.Array(Schema.String),
  affectedPaths: Schema.Array(Schema.String),
  submodelPath: Schema.Array(Schema.String),
  maybeLeafTag: Schema.OptionFromNullOr(Schema.String),
})
/** A serialized history entry suitable for transmission over the WS protocol. */
export type SerializedEntry = typeof SerializedEntry.Type

/** Metadata about a single keyframe. The index identifies the point in history where the runtime can replay back to. */
export const KeyframeInfo = Schema.Struct({
  index: Schema.Number,
})
/** Metadata about a single keyframe. */
export type KeyframeInfo = typeof KeyframeInfo.Type

/** Metadata about a connected browser runtime. */
export const RuntimeInfo = Schema.Struct({
  connectionId: Schema.String,
  url: Schema.String,
  title: Schema.String,
})
/** Metadata about a connected browser runtime. */
export type RuntimeInfo = typeof RuntimeInfo.Type

// REQUEST

/** The largest batch `RequestDispatchMessages` accepts. Matches the DevTools store's default history size, so a batch cannot evict its own earliest entries before the caller reads them back. The runtime rejects a larger batch with `ResponseError`, and MCP clients reject it earlier still, at their own input boundary. */
export const MAX_DISPATCH_BATCH_SIZE = 100

/** A request from the MCP server. The Vite plugin handles
 * `Request.RequestListRuntimes`; it forwards every other request to a browser
 * runtime. */
export const Request = defineTaggedUnion({
  RequestGetModel: {
    maybePath: Schema.OptionFromNullOr(Schema.String),
    expand: Schema.Boolean,
  },
  RequestGetModelAt: {
    index: Schema.Number,
    maybePath: Schema.OptionFromNullOr(Schema.String),
    expand: Schema.Boolean,
  },
  RequestListMessages: {
    limit: Schema.Number,
    maybeSinceIndex: Schema.OptionFromNullOr(Schema.Number),
    maybeChangedPathsMatch: Schema.OptionFromNullOr(
      Schema.Array(Schema.String),
    ).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
    fromEnd: Schema.Boolean.pipe(
      Schema.withDecodingDefault(Effect.succeed(false)),
    ),
  },
  RequestCountMessagesByTag: {
    maybeSinceIndex: Schema.OptionFromNullOr(Schema.Number),
    maybeChangedPathsMatch: Schema.OptionFromNullOr(
      Schema.Array(Schema.String),
    ),
  },
  RequestDiffModels: {
    fromIndex: Schema.Number,
    toIndex: Schema.Number,
    maybeChangedPathsMatch: Schema.OptionFromNullOr(
      Schema.Array(Schema.String),
    ),
  },
  RequestGetMessage: { index: Schema.Number },
  RequestListKeyframes: {},
  RequestReplayToKeyframe: { keyframeIndex: Schema.Number },
  RequestResume: {},
  RequestDispatchMessage: { message: Schema.Unknown },
  RequestDispatchMessages: { messages: Schema.Array(Schema.Unknown) },
  RequestListRuntimes: {},
  RequestGetInit: {},
  RequestGetRuntimeState: {},
  RequestGetMessageSchema: {
    maybeVariantTag: Schema.OptionFromNullOr(Schema.String),
  },
})
/** A request from the MCP server. */
export type Request = typeof Request.Type

// RESPONSE

/** One row of a Message-tag histogram. */
export const MessageTagCount = Schema.Struct({
  tag: Schema.String,
  count: Schema.Number,
})
/** One row of a Message-tag histogram. */
export type MessageTagCount = typeof MessageTagCount.Type

/** The value on one side of a Model diff. `DiffValue.Present` carries the
 * value. `DiffValue.Absent` means the path does not exist on that side, which
 * keeps a missing path distinct from a path whose value is `null`. */
export const DiffValue = defineTaggedUnion({
  Absent: {},
  Present: { value: Schema.Unknown },
})
/** The value on one side of a Model diff path. */
export type DiffValue = typeof DiffValue.Type

/** One changed path in a Model diff. `before` is the value at `fromIndex`, `after` the value at `toIndex`. */
export const ModelDiffChange = Schema.Struct({
  path: Schema.String,
  before: DiffValue,
  after: DiffValue,
})
/** One changed path in a Model diff. */
export type ModelDiffChange = typeof ModelDiffChange.Type

/** One variant entry in a `MessageSchemaIndex`. `payloadFields` lists the variant's payload property names (excluding `_tag`); `unionFields` lists the subset of those properties whose schemas are themselves `_tag`-discriminated unions. A Submodel-wrapper variant always shows up with `unionFields: ['message']`, but the same flag also catches plain tagged-union value types like `UrlRequest = Internal | External`. Either way, the agent will need to pick a variant when filling these fields. */
export const MessageSchemaIndexEntry = Schema.Struct({
  tag: Schema.String,
  payloadFields: Schema.Array(Schema.String),
  unionFields: Schema.Array(Schema.String),
})
/** One variant entry in a `MessageSchemaIndex`. */
export type MessageSchemaIndexEntry = typeof MessageSchemaIndexEntry.Type

/** A flat directory of every top-level Message variant the runtime accepts, designed to fit in an agent context regardless of Message-union size. Use the tag names to make a follow-up `RequestGetMessageSchema` with `maybeVariantTag` set to fetch the full JSON Schema for one variant. */
export const MessageSchemaIndex = Schema.Struct({
  variants: Schema.Array(MessageSchemaIndexEntry),
})
/** A flat directory of every top-level Message variant. */
export type MessageSchemaIndex = typeof MessageSchemaIndex.Type

/** The result of requesting the app's Message Schema. It is either a compact
 * index of Message variants or the JSON Schema document for one variant. */
export const MessageSchemaResult = defineTaggedUnion({
  MessageSchemaIndexResult: { index: MessageSchemaIndex },
  MessageSchemaDocumentResult: { document: Schema.Unknown },
})
/** The result of requesting the app's Message Schema. */
export type MessageSchemaResult = typeof MessageSchemaResult.Type

/** A response replying to a Request. */
export const Response = defineTaggedUnion({
  ResponseModel: {
    value: Schema.Unknown,
    atPath: Schema.String,
    summarized: Schema.Boolean,
  },
  ResponseMessages: {
    entries: Schema.Array(SerializedEntry),
    maybeNextIndex: Schema.OptionFromNullOr(Schema.Number),
  },
  ResponseMessage: { entry: SerializedEntry },
  ResponseMessageCounts: {
    counts: Schema.Array(MessageTagCount),
    totalCount: Schema.Number,
    scannedFromIndex: Schema.Number,
    scannedToIndex: Schema.Number,
  },
  ResponseModelDiff: {
    fromIndex: Schema.Number,
    toIndex: Schema.Number,
    changes: Schema.Array(ModelDiffChange),
  },
  ResponseKeyframes: { keyframes: Schema.Array(KeyframeInfo) },
  ResponseReplayed: { model: Schema.Unknown },
  ResponseResumed: {},
  ResponseDispatched: { acceptedAtIndex: Schema.Number },
  ResponseDispatchedBatch: { acceptedAtIndices: Schema.Array(Schema.Number) },
  ResponseRuntimes: { runtimes: Schema.Array(RuntimeInfo) },
  ResponseInit: {
    maybeModel: Schema.OptionFromNullOr(Schema.Unknown),
    commands: Schema.Array(SerializedCommand),
    mountStarts: Schema.Array(SerializedMount),
  },
  ResponseRuntimeState: {
    currentIndex: Schema.Number,
    startIndex: Schema.Number,
    totalEntries: Schema.Number,
    isPaused: Schema.Boolean,
    maybePausedAtIndex: Schema.OptionFromNullOr(Schema.Number),
    hasInitModel: Schema.Boolean,
  },
  ResponseMessageSchema: {
    maybeResult: Schema.OptionFromNullOr(MessageSchemaResult),
  },
  ResponseError: { reason: Schema.String },
})
/** A response replying to a Request. */
export type Response = typeof Response.Type

// EVENT

/** A runtime lifecycle event used by the Vite plugin to track which browser tabs are connected. Not forwarded to MCP clients. */
export const Event = defineTaggedUnion({
  EventConnected: { runtime: RuntimeInfo },
  EventDisconnected: { connectionId: Schema.String },
})
/** A runtime lifecycle event. */
export type Event = typeof Event.Type

// FRAME

/** A wire frame carrying a Request from the MCP server. The id is opaque, used only by the MCP server to correlate the matching Response. The maybeConnectionId routes the request to a specific runtime when present. */
export const RequestFrame = Schema.Struct({
  id: Schema.String,
  maybeConnectionId: Schema.OptionFromNullOr(Schema.String),
  request: Request,
})
/** A wire frame carrying a Request from the MCP server. */
export type RequestFrame = typeof RequestFrame.Type

/** A wire frame carrying a Response, correlated to a Request by id. */
export const ResponseFrame = Schema.Struct({
  id: Schema.String,
  response: Response,
})
/** A wire frame carrying a Response, correlated to a Request by id. */
export type ResponseFrame = typeof ResponseFrame.Type

/** A wire frame carrying a runtime lifecycle event from the bridge to the Vite plugin. */
export const EventFrame = Schema.Struct({
  maybeConnectionId: Schema.OptionFromNullOr(Schema.String),
  event: Event,
})
/** A wire frame carrying a runtime lifecycle event. */
export type EventFrame = typeof EventFrame.Type
