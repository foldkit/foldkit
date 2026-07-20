import { Array, Effect, Match, Option, Schema as S } from 'effect'
import {
  type Request,
  RequestCountMessagesByTag,
  RequestDiffModels,
  RequestDispatchMessage,
  RequestGetInit,
  RequestGetMessage,
  RequestGetMessageSchema,
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

const ChangedPathsMatchField = S.optional(
  S.Array(S.String).annotate({
    description:
      "Dot-string path patterns matched against each entry's changedPaths, in the same 'root'-anchored alphabet foldkit_get_model uses. An entry matches when any pattern matches any changed path. Patterns compare segment-by-segment for the length of the shorter side, so 'root.grid' matches every change inside the grid subtree, and 'root.grid.5.3' also matches a wholesale replacement recorded at 'root.grid'. '*' matches exactly one segment: 'root.cards.*.title'. Entries that did not change the Model never match. An empty list applies no filter. Patterns not starting with 'root' or '*' are rejected.",
  }),
)

const DiffChangedPathsMatchField = S.optional(
  S.Array(S.String).annotate({
    description:
      "Dot-string path patterns narrowing the reported changes, in the same 'root'-anchored alphabet as changedPaths. A changed path is kept when any pattern matches it: patterns compare segment-by-segment for the length of the shorter side ('root.grid' keeps everything under the grid subtree) and '*' matches exactly one segment. An empty list applies no filter. Patterns not starting with 'root' or '*' are rejected.",
  }),
)

const FromEndField = S.optional(
  S.Boolean.annotate({
    description:
      "When true, return the final `limit` matching entries (the most recent) instead of the first, still in chronological order. The natural first call when live-debugging: 'what just happened'. Cannot be combined with since_index.",
  }),
)

const DiffFromIndex = S.Int.annotate({
  description:
    'Absolute history index of the diff baseline: the Model state right after this entry was applied. Use -1 for the initial Model.',
})

const DiffToIndex = S.Int.annotate({
  description:
    'Absolute history index of the diff target: the Model state right after this entry was applied. -1 addresses the initial Model.',
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
  changed_paths_match: ChangedPathsMatchField,
  from_end: FromEndField,
})

const CountMessagesByTagInput = S.Struct({
  runtime_id: RuntimeIdField,
  since_index: S.optional(SinceIndex),
  changed_paths_match: ChangedPathsMatchField,
})

const DiffModelsInput = S.Struct({
  runtime_id: RuntimeIdField,
  from_index: DiffFromIndex,
  to_index: DiffToIndex,
  changed_paths_match: DiffChangedPathsMatchField,
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
  message: S.Record(S.String, S.Unknown).annotate({
    description:
      "A Foldkit Message object to dispatch into the runtime. Must match the runtime's Message Schema. Call `foldkit_get_message_schema` with no arguments to see the available variant tags, then `foldkit_get_message_schema { variant_tag: \"X\" }` to learn one variant's exact payload shape. At minimum it has a `_tag` field naming the variant. The runtime decodes the payload and returns a clean error if it doesn't match.",
  }),
})

const VariantTagField = S.optional(
  S.String.annotate({
    description:
      'Optional dot-separated path of variant `_tag` values. When omitted, the tool returns a small variant index (tag names plus payload field names plus a tagged-union indicator) so agents can enumerate the top-level union cheaply. When provided, the tool walks the path through each variant\'s single tagged-union payload field, narrows the schema along the chain, and collapses any union deeper than the path to a `{ "_summary": "union", "variants": [...] }` placeholder. Extend the path to drill further. Examples: `"ScrolledSidebar"` (one top-level variant), `"GotMobileMenuDialogMessage.GotAnimationMessage"` (two levels of a Submodel chain).',
  }),
)

const GetMessageSchemaInput = S.Struct({
  runtime_id: RuntimeIdField,
  variant_tag: VariantTagField,
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
 * Read a display string from a caught error. Effect's `TimeoutError` carries no
 * `message`, so `error.message` is `undefined` on a relay timeout; fall back to
 * the error's string form (its tag) rather than surfacing `Error: undefined`.
 */
const errorReason = (error: Error): string =>
  error.message ? error.message : String(error)

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
  }).pipe(
    Effect.catch(error => Effect.succeed(formatError(errorReason(error)))),
  )

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
    }).pipe(
      Effect.catch(error => Effect.succeed(formatError(errorReason(error)))),
    )

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
      "Snapshot a historical Model after a given history entry was applied. Pass `index: N - 1` to read the Model just before message N. Same `path`/`expand` semantics as foldkit_get_model. Indices outside the retained history range (older entries are evicted past the rolling buffer) are rejected with the readable range. For the initial Model (and the names of Commands returned from the application's `init`), use foldkit_get_init.",
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
      'List Message history entries from a Foldkit runtime. Filter server-side with `changed_paths_match` to ask in Model terms (which Messages touched this subtree), read the most recent entries with `from_end: true`, and paginate forward via `since_index` using the returned `maybeNextIndex` (the absolute index of the next matching entry). On busy histories (drag, scroll, keystroke flows), call foldkit_count_messages_by_tag first to learn what is worth filtering.',
    inputSchema: toInputSchema(ListMessagesInput),
    handle: runRuntimeTool(
      ListMessagesInput,
      ({ limit, since_index, changed_paths_match, from_end }) =>
        RequestListMessages({
          limit: limit ?? DEFAULT_LIST_MESSAGES_LIMIT,
          maybeSinceIndex: Option.fromNullishOr(since_index),
          maybeChangedPathsMatch: Option.fromNullishOr(changed_paths_match),
          fromEnd: from_end ?? false,
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_count_messages_by_tag',
    description:
      'Count retained Message history entries by tag, without payloads. Returns `{ counts: [{ tag, count }], totalCount, scannedFromIndex, scannedToIndex }` sorted by count descending. A cheap reconnaissance call before paging through history: it surfaces the high-frequency Messages worth filtering out, and with `changed_paths_match` it answers which Message tags touch a Model subtree. Accepts the same `since_index`/`changed_paths_match` filters as foldkit_list_messages.',
    inputSchema: toInputSchema(CountMessagesByTagInput),
    handle: runRuntimeTool(
      CountMessagesByTagInput,
      ({ since_index, changed_paths_match }) =>
        RequestCountMessagesByTag({
          maybeSinceIndex: Option.fromNullishOr(since_index),
          maybeChangedPathsMatch: Option.fromNullishOr(changed_paths_match),
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_diff_models',
    description:
      "Diff the Models at two history indices server-side. Returns path-level changes `{ path, before, after }` sorted by path (numeric segments in numeric order), with values summarized. Each side is `{ _tag: 'Present', value }`, or `{ _tag: 'Absent' }` when the path does not exist on that side (a key or element that was added or removed). `from_index`/`to_index` follow foldkit_get_model_at semantics: the Model right after that entry was applied, with -1 for the initial Model. Pass `changed_paths_match` to narrow the diff to a Model subtree. Far cheaper than fetching two snapshots and diffing client-side; follow up with foldkit_get_model_at plus `path`/`expand: true` to read a changed subtree at full fidelity.",
    inputSchema: toInputSchema(DiffModelsInput),
    handle: runRuntimeTool(
      DiffModelsInput,
      ({ from_index, to_index, changed_paths_match }) =>
        RequestDiffModels({
          fromIndex: from_index,
          toIndex: to_index,
          maybeChangedPathsMatch: Option.fromNullishOr(changed_paths_match),
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_get_message',
    description:
      'Read a single Message history entry by absolute index. The response carries the SerializedEntry (tag, message body, commands, mountStarts, mountEnds, timestamp, `isModelChanged`, `changedPaths` for leaf-level mutations, `affectedPaths` adding their ancestor paths). Each entry in `commands` carries the Command name and `args` (`Some(record)` when the Command declared an args schema, `None` otherwise). `mountStarts` lists Mounts that fired during the render after this Message; `mountEnds` lists Mounts whose elements were unmounted during that render. Each Mount carries its `name` and `args` (`Some(record)` when the Mount declared an args schema, `None` otherwise). For Submodel-routed entries (tag matches `Got*Message`), the entry also carries `submodelPath` listing wrapper tags from outer to inner and `maybeLeafTag` naming the innermost child Message. Model snapshots are not included; call foldkit_get_model_at with `index - 1` (before) and `index` (after) to inspect Model state around the entry.',
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
      "Read the runtime's initial Model, the Commands returned from the application's `init` function, and the Mounts that fired during the first render. The init entry is the synthetic row at index -1 in the DevTools panel; this tool exposes the same data without time-travelling the runtime. `maybeModel` is `None` until the runtime has finished its first render and recorded init, then stays `Some` for the rest of the runtime's life. `commands` lists init-time Commands in the order they were produced, each with its name and `args` (`Some(record)` when the Command declared an args schema, `None` otherwise); `mountStarts` lists Mounts whose elements appeared in the initial render, each with its name and `args` (`Some(record)` when the Mount declared an args schema, `None` otherwise).",
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
    name: 'foldkit_get_message_schema',
    description:
      'Describe the Message Schema for a Foldkit runtime so agents can construct valid payloads for `foldkit_dispatch_message`. Call with no arguments to receive a small variant index (every top-level variant\'s `_tag`, its payload field names, and which payload fields are themselves tagged-union shapes). Then call with `variant_tag: "ChosenVariant"` to drill in. The argument is a dot-separated path of variant `_tag` values: each segment names a variant, and the walker steps through the variant\'s single tagged-union payload field to reach the next. So `"GotMobileMenuDialogMessage"` narrows one level; `"GotMobileMenuDialogMessage.GotAnimationMessage"` narrows two levels of a Submodel chain. Discriminated unions deeper than the supplied path collapse to `{ "_summary": "union", "variants": [...] }` placeholders so the response stays compact even for deeply-nested apps; extend the path to drill further. `S.Option` fields render as `anyOf: [{_tag: "Some", value}, {_tag: "None"}]`. The full document follows the JSON Schema draft-2020-12 shape from `Schema.toJsonSchemaDocument`: `{ dialect, schema, definitions }`. Returns `maybeResult: None` when the runtime hasn\'t configured `DevToolsConfig.Message` (dispatch is also unavailable). Fields with no JSON representation, notably `S.instanceOf(File)` for user-uploaded files, render as `{type: "null"}`; those variants can\'t be dispatched via MCP because their values live in browser memory.',
    inputSchema: toInputSchema(GetMessageSchemaInput),
    handle: runRuntimeTool(
      GetMessageSchemaInput,
      ({ variant_tag }) =>
        RequestGetMessageSchema({
          maybeVariantTag: Option.fromNullishOr(variant_tag),
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_dispatch_message',
    description:
      "Dispatch a Message into a Foldkit runtime, as if the application itself produced it. Requires the runtime to have configured DevToolsConfig.Message; without it, dispatch is rejected. Call `foldkit_get_message_schema` with no arguments to enumerate the variants, then with `variant_tag` to learn one variant's exact payload shape, before constructing the Message object. The runtime decodes the payload and returns a clean error if it doesn't match.",
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
        Effect.catch(error => Effect.succeed(formatError(errorReason(error)))),
      ),
  },
]
