import { Array, Effect, Match, Option, Schema as S } from 'effect'
import {
  type Request,
  RequestDispatchMessage,
  RequestGetInit,
  RequestGetMessage,
  RequestGetModel,
  RequestGetModelAt,
  RequestGetRuntimeState,
  RequestListKeyframes,
  RequestListMessages,
  RequestListRuntimes,
  RequestReplayToKeyframe,
  RequestResume,
  type Response,
} from 'foldkit/devtools-protocol'

import type { WebSocketClient } from './webSocketClient.js'

const RUNTIME_ID_DESCRIPTION =
  'Optional connection id of a specific Foldkit runtime. Defaults to the most recently connected runtime.'

const DEFAULT_LIST_MESSAGES_LIMIT = 50

const RuntimeIdField = S.optional(
  S.String.annotate({ description: RUNTIME_ID_DESCRIPTION }),
)

const ListLimit = S.Int.check(
  S.isBetween({ minimum: 1, maximum: 500 }),
).annotate({
  description: `Maximum number of entries to return. Defaults to ${DEFAULT_LIST_MESSAGES_LIMIT}; max 500.`,
})

const SinceIndex = S.Int.annotate({
  description:
    'Absolute history index to start from. Use the maybeNextIndex returned by a prior call to paginate.',
})

const MessageIndex = S.Int.annotate({
  description: 'Absolute history index of the entry to read.',
})

const KeyframeIndex = S.Int.annotate({
  description:
    'Index to replay to. Use -1 to jump to the initial Model (before any messages). Use a non-negative index to jump to the Model state right after that history index. Call foldkit_list_keyframes for the canonical replay points.',
})

const ModelIndex = S.Int.annotate({
  description:
    'Absolute history index. Returns the Model state right after the entry at this index was applied. To inspect the Model immediately before message N, pass index N - 1. For the initial Model, use foldkit_get_init.',
})

const PathField = S.optional(
  S.String.annotate({
    description:
      "Dot-string path into the Model anchored at 'root'. Examples: 'root', 'root.route', 'root.session.user', 'root.cards.0'. Matches the alphabet used by SerializedEntry.changedPaths so paths copied from one tool's output can be passed straight into the next. Defaults to 'root' (the whole Model).",
  }),
)

const ExpandField = S.optional(
  S.Boolean.annotate({
    description:
      "When false (the default), large arrays/records/strings collapse to '_summary' placeholders to keep payloads small. Set true to receive the literal value at the path. Pair with `path` to drill in: a narrow path with `expand: true` is the cheapest way to read a specific subtree at full fidelity.",
  }),
)

const GetModelInput = S.Struct({
  runtime_id: RuntimeIdField,
  path: PathField,
  expand: ExpandField,
})

const GetModelAtInput = S.Struct({
  runtime_id: RuntimeIdField,
  index: ModelIndex,
  path: PathField,
  expand: ExpandField,
})

const ListMessagesInput = S.Struct({
  runtime_id: RuntimeIdField,
  limit: S.optional(ListLimit),
  since_index: S.optional(SinceIndex),
})

const GetMessageInput = S.Struct({
  runtime_id: RuntimeIdField,
  index: MessageIndex,
})

const ListKeyframesInput = S.Struct({
  runtime_id: RuntimeIdField,
})

const ReplayToKeyframeInput = S.Struct({
  runtime_id: RuntimeIdField,
  keyframe_index: KeyframeIndex,
})

const ResumeInput = S.Struct({
  runtime_id: RuntimeIdField,
})

const GetInitInput = S.Struct({
  runtime_id: RuntimeIdField,
})

const GetRuntimeStateInput = S.Struct({
  runtime_id: RuntimeIdField,
})

const DispatchMessageInput = S.Struct({
  runtime_id: RuntimeIdField,
  message: S.Unknown.annotate({
    description:
      "A Foldkit Message object to dispatch into the runtime. Must match the runtime's Message Schema — read the application's source to see the exact shape. At minimum it has a `_tag` field naming the variant. The runtime decodes the payload and returns a clean error if it doesn't match.",
  }),
})

/**
 * Extract the inner JSON Schema from Effect's `JsonSchema.Document` wrapper.
 * MCP's tool registry validates `inputSchema.type === "object"` at the top
 * level; the Document wrapper (`{ dialect, schema, definitions }`) hides
 * `type` one level deeper, so registration silently fails. Unwrapping fixes
 * tool surfacing in Claude Code, Cursor, and any other MCP host.
 */
const toInputSchema = <Input>(codec: S.Codec<Input>): object =>
  S.toJsonSchemaDocument(codec).schema

const NO_INPUT_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const

type ToolResult = Readonly<{
  content: ReadonlyArray<Readonly<{ type: 'text'; text: string }>>
  isError?: boolean
}>

/** A tool registration the MCP server hands to its low-level `Server.setRequestHandler` for `tools/list` and `tools/call`. */
export type ToolDefinition = Readonly<{
  name: string
  description: string
  inputSchema: object
  handle: (rawInput: unknown) => Effect.Effect<ToolResult>
}>

const formatResult = (value: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
})

const formatError = (reason: string): ToolResult => ({
  content: [{ type: 'text', text: `Error: ${reason}` }],
  isError: true,
})

/**
 * Decode a tool's raw input against its Effect Schema. Failure surfaces as an
 * `Error` for the outer handler's `catchAll` to convert into a `ToolResult`.
 */
const decodeInput = <Input>(
  schema: S.Codec<Input>,
  rawInput: unknown,
): Effect.Effect<Input, Error> =>
  S.decodeUnknownEffect(schema)(rawInput).pipe(
    Effect.mapError(error => new Error(`Invalid input: ${error.message}`)),
  )

/**
 * Resolve a runtime id, defaulting to the most recently connected runtime when
 * the caller did not specify one. Failures (no runtimes connected, relay
 * error) surface as `Error` for the outer handler's `catchAll` to convert.
 */
const resolveRuntimeId = (
  wsClient: WebSocketClient,
  explicit: string | undefined,
): Effect.Effect<string, Error> => {
  if (explicit !== undefined) {
    return Effect.succeed(explicit)
  }
  return Effect.gen(function* () {
    const response = yield* wsClient.sendRequest(
      RequestListRuntimes(),
      Option.none(),
    )
    return yield* Match.value(response).pipe(
      Match.tag('ResponseRuntimes', ({ runtimes }) =>
        Array.last(runtimes).pipe(
          Option.match({
            onNone: () =>
              Effect.fail(
                new Error(
                  'No connected Foldkit runtimes. Open a Foldkit dev page and try again.',
                ),
              ),
            onSome: runtime => Effect.succeed(runtime.connectionId),
          }),
        ),
      ),
      Match.tag('ResponseError', ({ reason }) =>
        Effect.fail(new Error(reason)),
      ),
      Match.orElse(({ _tag }) =>
        Effect.fail(
          new Error(`Unexpected response from RequestListRuntimes: ${_tag}`),
        ),
      ),
    )
  })
}

const responseToToolResult = (response: typeof Response.Type): ToolResult =>
  response._tag === 'ResponseError'
    ? formatError(response.reason)
    : formatResult(response)

const callRuntimeRequest = (
  wsClient: WebSocketClient,
  explicitRuntimeId: string | undefined,
  buildRequest: () => typeof Request.Type,
): Effect.Effect<ToolResult> =>
  Effect.gen(function* () {
    const runtimeId = yield* resolveRuntimeId(wsClient, explicitRuntimeId)
    const response = yield* wsClient.sendRequest(
      buildRequest(),
      Option.some(runtimeId),
    )
    return responseToToolResult(response)
  }).pipe(Effect.catch(error => Effect.succeed(formatError(error.message))))

type RuntimeToolInput = Readonly<{ runtime_id?: string | undefined }>

/**
 * Build a tool handler that decodes its input, resolves the target runtime,
 * issues a typed `Request`, and formats the response. Used for every tool
 * except `foldkit_list_runtimes`, which does not target a specific runtime.
 */
const runRuntimeTool =
  <Input extends RuntimeToolInput>(
    inputSchema: S.Codec<Input>,
    buildRequest: (input: Input) => typeof Request.Type,
    wsClient: WebSocketClient,
  ) =>
  (rawInput: unknown): Effect.Effect<ToolResult> =>
    Effect.gen(function* () {
      const input = yield* decodeInput(inputSchema, rawInput)
      return yield* callRuntimeRequest(wsClient, input.runtime_id, () =>
        buildRequest(input),
      )
    }).pipe(Effect.catch(error => Effect.succeed(formatError(error.message))))

/**
 * Build the read-only Foldkit DevTools tool definitions. Each tool decodes its
 * input via Effect Schema, dispatches a typed `Request` through the WebSocket
 * relay, and formats the typed `Response` as MCP tool content.
 */
export const buildTools = (
  wsClient: WebSocketClient,
): ReadonlyArray<ToolDefinition> => [
  {
    name: 'foldkit_get_model',
    description:
      "Snapshot the current Model from a connected Foldkit runtime. By default the response is summarized (large arrays/records/strings collapse to `_summary` placeholders) to keep payloads small for AI agents. Pass `path` (e.g. 'root.session.user') to narrow to a subtree, and `expand: true` to receive the literal value at that path. Returns `{ value, atPath, summarized }`.",
    inputSchema: toInputSchema(GetModelInput),
    handle: runRuntimeTool(
      GetModelInput,
      ({ path, expand }) =>
        RequestGetModel({
          maybePath: Option.fromNullishOr(path),
          expand: expand ?? false,
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_get_model_at',
    description:
      "Snapshot a historical Model after a given history entry was applied. Pass `index: N - 1` to read the Model just before message N. Same `path`/`expand` semantics as foldkit_get_model. For the initial Model (and the names of Commands returned from the application's `init`), use foldkit_get_init.",
    inputSchema: toInputSchema(GetModelAtInput),
    handle: runRuntimeTool(
      GetModelAtInput,
      ({ index, path, expand }) =>
        RequestGetModelAt({
          index,
          maybePath: Option.fromNullishOr(path),
          expand: expand ?? false,
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_list_messages',
    description:
      'List recent Message history entries from a Foldkit runtime, with optional pagination via since_index.',
    inputSchema: toInputSchema(ListMessagesInput),
    handle: runRuntimeTool(
      ListMessagesInput,
      ({ limit, since_index }) =>
        RequestListMessages({
          limit: limit ?? DEFAULT_LIST_MESSAGES_LIMIT,
          maybeSinceIndex: Option.fromNullishOr(since_index),
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_get_message',
    description:
      'Read a single Message history entry by absolute index. The response carries the SerializedEntry (tag, message body, commands, mountStartNames, mountEndNames, timestamp, `isModelChanged`, `changedPaths` for leaf-level mutations, `affectedPaths` adding their ancestor paths). Each entry in `commands` carries the Command name and `args` (`Some(record)` when the Command declared an args schema, `None` otherwise). `mountStartNames` lists Mounts that fired during the render after this Message; `mountEndNames` lists Mounts whose elements were unmounted during that render. For Submodel-routed entries (tag matches `Got*Message`), the entry also carries `submodelPath` listing wrapper tags from outer to inner and `maybeLeafTag` naming the innermost child Message. Model snapshots are not included; call foldkit_get_model_at with `index - 1` (before) and `index` (after) to inspect Model state around the entry.',
    inputSchema: toInputSchema(GetMessageInput),
    handle: runRuntimeTool(
      GetMessageInput,
      ({ index }) => RequestGetMessage({ index }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_get_init',
    description:
      "Read the runtime's initial Model, the Commands returned from the application's `init` function, and the names of Mounts that fired during the first render. The init entry is the synthetic row at index -1 in the DevTools panel; this tool exposes the same data without time-travelling the runtime. `maybeModel` is `None` until the runtime has finished its first render and recorded init, then stays `Some` for the rest of the runtime's life. `commands` lists init-time Commands in the order they were produced, each with its name and `args` (`Some(record)` when the Command declared an args schema, `None` otherwise); `mountStartNames` lists Mounts whose elements appeared in the initial render.",
    inputSchema: toInputSchema(GetInitInput),
    handle: runRuntimeTool(GetInitInput, () => RequestGetInit(), wsClient),
  },
  {
    name: 'foldkit_get_runtime_state',
    description:
      "Snapshot the runtime's DevTools state: history bounds, current paused/live status, and whether init is recorded. Returns `currentIndex` (the absolute index of the most recent Message, or -1 when none), `startIndex` (the earliest absolute index still retained in the rolling buffer), `totalEntries` (count of retained entries), `isPaused`, `maybePausedAtIndex` (`Some(index)` when paused, `None` otherwise), and `hasInitModel`. Use it to reason about what `foldkit_list_messages` and `foldkit_get_message` will see, and to detect whether the runtime is currently paused at a replayed snapshot.",
    inputSchema: toInputSchema(GetRuntimeStateInput),
    handle: runRuntimeTool(
      GetRuntimeStateInput,
      () => RequestGetRuntimeState(),
      wsClient,
    ),
  },
  {
    name: 'foldkit_list_keyframes',
    description:
      'List the available keyframes (replayable Model snapshots) from a Foldkit runtime.',
    inputSchema: toInputSchema(ListKeyframesInput),
    handle: runRuntimeTool(
      ListKeyframesInput,
      () => RequestListKeyframes(),
      wsClient,
    ),
  },
  {
    name: 'foldkit_replay_to_keyframe',
    description:
      'Time-travel a Foldkit runtime back to a previous Model snapshot. Pass `keyframe_index: -1` for the initial Model, or a non-negative index for the state right after that history entry. The runtime is paused at the snapshot until foldkit_resume is called.',
    inputSchema: toInputSchema(ReplayToKeyframeInput),
    handle: runRuntimeTool(
      ReplayToKeyframeInput,
      ({ keyframe_index }) =>
        RequestReplayToKeyframe({ keyframeIndex: keyframe_index }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_resume',
    description:
      'Resume normal execution of a Foldkit runtime that was paused by foldkit_replay_to_keyframe.',
    inputSchema: toInputSchema(ResumeInput),
    handle: runRuntimeTool(ResumeInput, () => RequestResume(), wsClient),
  },
  {
    name: 'foldkit_dispatch_message',
    description:
      "Dispatch a Message into a Foldkit runtime's message queue, as if the application itself produced it. Requires the runtime to have configured DevToolsConfig.Message; without it, dispatch is rejected. Read the application's Message Schema source to construct a valid Message object. The runtime decodes the payload and returns a clean error if it doesn't match.",
    inputSchema: toInputSchema(DispatchMessageInput),
    handle: runRuntimeTool(
      DispatchMessageInput,
      ({ message }) => RequestDispatchMessage({ message }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_list_runtimes',
    description:
      'List Foldkit runtimes (browser tabs) currently connected to the dev server.',
    inputSchema: NO_INPUT_SCHEMA,
    handle: () =>
      Effect.gen(function* () {
        const response = yield* wsClient.sendRequest(
          RequestListRuntimes(),
          Option.none(),
        )
        return responseToToolResult(response)
      }).pipe(
        Effect.catch(error => Effect.succeed(formatError(error.message))),
      ),
  },
]
