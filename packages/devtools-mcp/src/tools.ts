import { Array, Effect, JSONSchema, Match, Option, Schema as S } from 'effect'
import {
  type Request,
  RequestDispatchMessage,
  RequestGetMessage,
  RequestGetModel,
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
  S.String.annotations({ description: RUNTIME_ID_DESCRIPTION }),
)

const ListLimit = S.Number.pipe(
  S.int(),
  S.between(1, 500),
  S.annotations({
    description: `Maximum number of entries to return. Defaults to ${DEFAULT_LIST_MESSAGES_LIMIT}; max 500.`,
  }),
)

const SinceIndex = S.Number.pipe(
  S.int(),
  S.annotations({
    description:
      'Absolute history index to start from. Use the maybeNextIndex returned by a prior call to paginate.',
  }),
)

const MessageIndex = S.Number.pipe(
  S.int(),
  S.annotations({
    description: 'Absolute history index of the entry to read.',
  }),
)

const KeyframeIndex = S.Number.pipe(
  S.int(),
  S.annotations({
    description:
      'Index to replay to. Use -1 to jump to the initial Model (before any messages). Use a non-negative index to jump to the Model state right after that history index. Call foldkit_list_keyframes for the canonical replay points.',
  }),
)

const GetModelInput = S.Struct({
  runtime_id: RuntimeIdField,
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

const DispatchMessageInput = S.Struct({
  runtime_id: RuntimeIdField,
  message: S.Unknown.annotations({
    description:
      "A Foldkit Message object to dispatch into the runtime. Must match the runtime's Message Schema — read the application's source to see the exact shape. At minimum it has a `_tag` field naming the variant. The runtime decodes the payload and returns a clean error if it doesn't match.",
  }),
})

/**
 * JSON Schema for tools that take no input. Inlined as a literal because
 * `JSONSchema.make(S.Struct({}))` produces a shape MCP's AJV validator
 * rejects (no top-level `type: "object"` for an empty struct).
 */
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
  schema: S.Schema<Input>,
  rawInput: unknown,
): Effect.Effect<Input, Error> =>
  S.decodeUnknown(schema)(rawInput).pipe(
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
  }).pipe(Effect.catchAll(error => Effect.succeed(formatError(error.message))))

type RuntimeToolInput = Readonly<{ runtime_id?: string | undefined }>

/**
 * Build a tool handler that decodes its input, resolves the target runtime,
 * issues a typed `Request`, and formats the response. Used for every tool
 * except `foldkit_list_runtimes`, which does not target a specific runtime.
 */
const runRuntimeTool =
  <Input extends RuntimeToolInput>(
    inputSchema: S.Schema<Input>,
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
      Effect.catchAll(error => Effect.succeed(formatError(error.message))),
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
    description: 'Snapshot the current Model from a connected Foldkit runtime.',
    inputSchema: JSONSchema.make(GetModelInput),
    handle: runRuntimeTool(GetModelInput, () => RequestGetModel(), wsClient),
  },
  {
    name: 'foldkit_list_messages',
    description:
      'List recent Message history entries from a Foldkit runtime, with optional pagination via since_index.',
    inputSchema: JSONSchema.make(ListMessagesInput),
    handle: runRuntimeTool(
      ListMessagesInput,
      ({ limit, since_index }) =>
        RequestListMessages({
          limit: limit ?? DEFAULT_LIST_MESSAGES_LIMIT,
          maybeSinceIndex: Option.fromNullable(since_index),
        }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_get_message',
    description:
      'Read a single Message history entry by absolute index, including before/after Model snapshots.',
    inputSchema: JSONSchema.make(GetMessageInput),
    handle: runRuntimeTool(
      GetMessageInput,
      ({ index }) => RequestGetMessage({ index }),
      wsClient,
    ),
  },
  {
    name: 'foldkit_list_keyframes',
    description:
      'List the available keyframes (replayable Model snapshots) from a Foldkit runtime.',
    inputSchema: JSONSchema.make(ListKeyframesInput),
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
    inputSchema: JSONSchema.make(ReplayToKeyframeInput),
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
    inputSchema: JSONSchema.make(ResumeInput),
    handle: runRuntimeTool(ResumeInput, () => RequestResume(), wsClient),
  },
  {
    name: 'foldkit_dispatch_message',
    description:
      "Dispatch a Message into a Foldkit runtime's message queue, as if the application itself produced it. Requires the runtime to have configured DevToolsConfig.Message; without it, dispatch is rejected. Read the application's Message Schema source to construct a valid Message object. The runtime decodes the payload and returns a clean error if it doesn't match.",
    inputSchema: JSONSchema.make(DispatchMessageInput),
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
        Effect.catchAll(error => Effect.succeed(formatError(error.message))),
      ),
  },
]
