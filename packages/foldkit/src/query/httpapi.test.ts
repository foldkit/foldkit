import {
  Array,
  Context,
  Effect,
  Fiber,
  HashMap,
  Layer,
  Option,
  Schema,
} from 'effect'
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from 'effect/unstable/http'
import {
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
} from 'effect/unstable/httpapi'
import { afterEach, beforeEach, expect, expectTypeOf, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../asyncData/index.js'
import { __htmlBuilder } from '../html/index.js'
import { makeElement } from '../runtime/makeElement.js'
import * as Query from './index.js'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })
type Note = typeof Note.Type

let container: HTMLElement

beforeEach(function () {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(function () {
  document.body.innerHTML = ''
})

function awaitStatus(text: string) {
  return vi.waitFor(function () {
    const maybeStatus = Option.fromNullishOr(document.getElementById('status'))
    expect(
      Option.isSome(maybeStatus) ? maybeStatus.value.textContent : '',
    ).toContain(text)
  })
}

function awaitTwoAnimationFrames() {
  return new Promise<void>(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resolve()
      })
    })
  })
}

function click(id: string) {
  const maybeButton = Option.fromNullishOr(document.getElementById(id))
  if (Option.isNone(maybeButton)) {
    throw new Error(`Missing #${id}`)
  }
  maybeButton.value.click()
}

class NotesSecretService extends Context.Service<
  NotesSecretService,
  { readonly token: string }
>()('NotesSecretService') {}

const stringNeedingDecode = Schema.String.pipe(
  Schema.optional,
  Schema.withDecodingDefault(
    Effect.gen(function* () {
      yield* NotesSecretService
      return ''
    }),
  ),
)

const stringNeedingEncode = Schema.flip(stringNeedingDecode)

class NotesAuthError extends Schema.Error<NotesAuthError>('NotesAuthError')({
  _tag: Schema.tag('NotesAuthError'),
}) {}

class NotesAuth extends HttpApiMiddleware.Service<NotesAuth>()('NotesAuth', {
  error: NotesAuthError,
  requiredForClient: true,
}) {}

const Api = HttpApi.make('Api').add(
  HttpApiGroup.make('notes')
    .add(
      HttpApiEndpoint.get('list', '/notes', {
        success: Schema.Array(Note),
        error: Schema.String,
      }),
    )
    .add(
      HttpApiEndpoint.get('getById', '/notes/:id', {
        params: { id: Schema.String },
        success: Note,
        error: Schema.String.pipe(HttpApiSchema.status(404)),
      }),
    )
    .add(
      HttpApiEndpoint.get('getByIdNonce', '/notes/:id/nonce', {
        params: { id: Schema.String },
        query: { nonce: Schema.String },
        success: Note,
        error: Schema.String,
      }),
    )
    .add(
      HttpApiEndpoint.post('create', '/notes', {
        payload: Note,
        success: Note,
        error: Schema.String,
      }),
    )
    .add(
      HttpApiEndpoint.get('guarded', '/notes/guarded', {
        success: Note,
        error: Schema.String,
      }).middleware(NotesAuth),
    )
    .add(HttpApiEndpoint.get('ping', '/ping'))
    .add(
      HttpApiEndpoint.get('secret', '/secret', {
        success: stringNeedingEncode,
      }),
    )
    .add(
      HttpApiEndpoint.get('locked', '/locked/:id', {
        params: {
          id: stringNeedingEncode,
        },
        success: Note,
      }),
    )
    .add(
      HttpApiEndpoint.get('decoded', '/decoded', {
        success: stringNeedingDecode,
      }),
    )
    .add(
      HttpApiEndpoint.get('events', '/events', {
        success: HttpApiSchema.StreamSse({ data: Note }),
      }),
    )
    .add(
      HttpApiEndpoint.get('bytes', '/bytes', {
        success: HttpApiSchema.StreamUint8Array(),
      }),
    )
    .add(
      HttpApiEndpoint.get('headerEvents', '/header-events', {
        success: HttpApiSchema.WithHeaders(
          HttpApiSchema.StreamSse({ data: Note }),
          { 'x-count': Schema.Int },
        ),
      }),
    ),
)

class NotesClient extends Query.HttpApi.Service<NotesClient>()('NotesClient', {
  api: Api,
}) {}

const notes = NotesClient.query('Notes', 'notes', 'list')
const noteById = NotesClient.query('Note', 'notes', 'getById')
const noteByIdNonce = NotesClient.query('NoteNonce', 'notes', 'getByIdNonce')
const createNote = NotesClient.query('CreateNote', 'notes', 'create')
const guarded = NotesClient.query('Guarded', 'notes', 'guarded')
const ping = NotesClient.query('Ping', 'notes', 'ping')

const NotesAuthLive = HttpApiMiddleware.layerClient(
  NotesAuth,
  function ({ next, request }) {
    return next(request)
  },
)

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const emptyResponse = (status: number): Response =>
  new Response(null, { status })

type NotesHandler = (
  request: HttpClientRequest.HttpClientRequest,
  url: URL,
) => Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpClientError.HttpClientError
>

const defaultNotesHandler: NotesHandler = function (request, url) {
  if (request.method === 'GET' && url.pathname === '/notes') {
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        jsonResponse(200, [{ id: '1', body: 'hello' }]),
      ),
    )
  }

  if (request.method === 'GET' && url.pathname === '/ping') {
    return Effect.succeed(
      HttpClientResponse.fromWeb(request, emptyResponse(204)),
    )
  }

  if (request.method === 'GET' && url.pathname === '/notes/guarded') {
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        jsonResponse(200, { id: '1', body: 'hello' }),
      ),
    )
  }

  const maybeNoncePath = Option.fromNullishOr(
    url.pathname.match(/^\/notes\/([^/]+)\/nonce$/),
  )
  if (Option.isSome(maybeNoncePath)) {
    const nonce = url.searchParams.get('nonce') ?? ''
    const id = Option.getOrElse(
      Array.get(maybeNoncePath.value, 1),
      function () {
        return ''
      },
    )
    if (nonce === '1') {
      return Effect.never
    }
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        jsonResponse(200, { id, body: nonce }),
      ),
    )
  }

  const maybeNotePath = Option.fromNullishOr(
    url.pathname.match(/^\/notes\/([^/]+)$/),
  )
  if (request.method === 'GET' && Option.isSome(maybeNotePath)) {
    const id = Option.getOrElse(Array.get(maybeNotePath.value, 1), function () {
      return ''
    })
    if (id === 'missing') {
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, jsonResponse(404, 'not found')),
      )
    }
    if (id === 'transport') {
      return Effect.fail(
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({
            request,
            description: 'offline',
          }),
        }),
      )
    }
    if (id === 'schema') {
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, jsonResponse(200, { id })),
      )
    }
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        jsonResponse(200, { id, body: 'hello' }),
      ),
    )
  }

  if (request.method === 'POST' && url.pathname === '/notes') {
    if (request.body._tag === 'Uint8Array' && request.body.text !== undefined) {
      const payload: unknown = JSON.parse(request.body.text)
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, jsonResponse(200, payload)),
      )
    }
  }

  return Effect.fail(
    new HttpClientError.HttpClientError({
      reason: new HttpClientError.TransportError({
        request,
        description: `unhandled ${request.method} ${url.pathname}`,
      }),
    }),
  )
}

const notesClientLayer = (handle: NotesHandler): Layer.Layer<NotesClient> =>
  Layer.effect(
    NotesClient,
    HttpApiClient.makeWith(Api, {
      baseUrl: 'http://test',
      httpClient: HttpClient.make(function (request, url) {
        return handle(request, url)
      }),
    }),
  ).pipe(Layer.provide(NotesAuthLive))

const NotesClientLive = notesClientLayer(defaultNotesHandler)

const TopLevelApi = HttpApi.make('TopLevelApi').add(
  HttpApiGroup.make('notes', { topLevel: true }).add(
    HttpApiEndpoint.get('list', '/notes', {
      success: Schema.Array(Note),
      error: Schema.String,
    }),
  ),
)

class TopLevelNotesClient extends Query.HttpApi.Service<TopLevelNotesClient>()(
  'TopLevelNotesClient',
  { api: TopLevelApi },
) {}

const topLevelNotes = TopLevelNotesClient.query('Notes', 'notes', 'list')

const TopLevelNotesClientLive = Layer.effect(
  TopLevelNotesClient,
  HttpApiClient.makeWith(TopLevelApi, {
    baseUrl: 'http://test',
    httpClient: HttpClient.make(function (request, url) {
      return defaultNotesHandler(request, url)
    }),
  }),
)

describe('Query.HttpApi.Service.query', () => {
  it('is a Query whose run depends on the client tag', () => {
    expectTypeOf(notes).toExtend<Query.Query.Any>()
    expectTypeOf(notes.run).toEqualTypeOf<
      Effect.Effect<
        AsyncData.AsyncData<
          ReadonlyArray<Note>,
          string | Query.HttpApi.HttpApiClientError
        >,
        never,
        NotesClient
      >
    >()
  })

  it.effect('run uses the HttpApiClient method', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(notes.run, NotesClientLive)
      expect(data).toEqual(
        AsyncData.Success({ data: [{ id: '1', body: 'hello' }] }),
      )
    }),
  )

  it.effect('run uses a top-level client method', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(
        topLevelNotes.run,
        TopLevelNotesClientLive,
      )
      expect(data).toEqual(
        AsyncData.Success({ data: [{ id: '1', body: 'hello' }] }),
      )
    }),
  )
})

describe('Query.HttpApi.Service.query KeyedQuery', () => {
  it('is a KeyedQuery Submodel over the client request', () => {
    expectTypeOf(noteById).toMatchTypeOf<Query.KeyedQuery.Any>()
    expectTypeOf(noteById.run).parameter(0).toEqualTypeOf<{
      readonly params: { readonly id: string }
    }>()
    expectTypeOf(createNote.run).parameter(0).toEqualTypeOf<{
      readonly payload: Note
    }>()
  })

  it.effect('run forwards params to the client method', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(
        noteById.run({ params: { id: '7' } }),
        NotesClientLive,
      )
      expect(data).toEqual(
        AsyncData.Success({ data: { id: '7', body: 'hello' } }),
      )
    }),
  )

  it.effect('run settles a declared endpoint error', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(
        noteById.run({ params: { id: 'missing' } }),
        NotesClientLive,
      )
      expect(data).toEqual(AsyncData.Failure({ error: 'not found' }))
    }),
  )

  it.effect('run settles HttpClientError as Failure', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(
        noteById.run({ params: { id: 'transport' } }),
        NotesClientLive,
      )
      expect(AsyncData.isFailure(data)).toBe(true)
      if (AsyncData.isFailure(data) && typeof data.error !== 'string') {
        expect(data.error._tag).toBe('HttpApiClientError')
        expect(data.error.reason._tag).toBe('HttpError')
        if (data.error.reason._tag === 'HttpError') {
          expect(data.error.reason.kind).toBe('TransportError')
        }
      }
    }),
  )

  it.effect('run settles SchemaError as Failure', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(
        noteById.run({ params: { id: 'schema' } }),
        NotesClientLive,
      )
      expect(AsyncData.isFailure(data)).toBe(true)
      if (AsyncData.isFailure(data) && typeof data.error !== 'string') {
        expect(data.error._tag).toBe('HttpApiClientError')
        expect(data.error.reason._tag).toBe('SchemaError')
      }
    }),
  )

  it.effect('run forwards payload on POST', () =>
    Effect.gen(function* () {
      const payload = { id: '9', body: 'created' }
      const data = yield* Effect.provide(
        createNote.run({ payload }),
        NotesClientLive,
      )
      expect(data).toEqual(AsyncData.Success({ data: payload }))
    }),
  )

  it('distinct params keep distinct slots', () => {
    const first = noteById.informLoadIfMissing(noteById.init(), {
      params: { id: 'a' },
    })
    const second = noteById.informLoadIfMissing(first.model, {
      params: { id: 'b' },
    })
    expect(noteById.read(second.model, { params: { id: 'a' } })).toEqual(
      AsyncData.Loading(),
    )
    expect(noteById.read(second.model, { params: { id: 'b' } })).toEqual(
      AsyncData.Loading(),
    )
  })
})

describe('Query.HttpApi.Service.query extra args', () => {
  it('distinct extra args keep distinct slots and Fetch keys', () => {
    const first = noteByIdNonce.informLoadIfMissing(noteByIdNonce.init(), {
      params: { id: 'a' },
      query: { nonce: '1' },
    })
    const second = noteByIdNonce.informLoadIfMissing(first.model, {
      params: { id: 'a' },
      query: { nonce: '2' },
    })
    expect(HashMap.size(second.model)).toBe(2)
    expect(
      noteByIdNonce.read(second.model, {
        params: { id: 'a' },
        query: { nonce: '1' },
      }),
    ).toEqual(AsyncData.Loading())
    expect(
      noteByIdNonce.read(second.model, {
        params: { id: 'a' },
        query: { nonce: '2' },
      }),
    ).toEqual(AsyncData.Loading())
    expect(
      noteByIdNonce.Fetch({ params: { id: 'a' }, query: { nonce: '1' } }).key,
    ).not.toEqual(
      noteByIdNonce.Fetch({ params: { id: 'a' }, query: { nonce: '2' } }).key,
    )
  })

  it('forgetting one extra-arg slot leaves the sibling client call running', async function () {
    const attempts: Record<string, number> = {}
    const live = notesClientLayer(function (request, url) {
      const maybeNoncePath = Option.fromNullishOr(
        url.pathname.match(/^\/notes\/([^/]+)\/nonce$/),
      )
      if (Option.isSome(maybeNoncePath)) {
        const nonce = url.searchParams.get('nonce') ?? ''
        attempts[nonce] = (attempts[nonce] ?? 0) + 1
      }
      return defaultNotesHandler(request, url)
    })
    const h = __htmlBuilder<(typeof noteByIdNonce.Message)['Type']>()

    const element = makeElement({
      Model: noteByIdNonce.Model,
      init: function () {
        return noteByIdNonce.informWatch(noteByIdNonce.init(), [
          { params: { id: 'a' }, query: { nonce: '1' } },
          { params: { id: 'a' }, query: { nonce: '2' } },
        ])
      },
      update: noteByIdNonce.update,
      view: function (model) {
        const dropped = noteByIdNonce.read(model, {
          params: { id: 'a' },
          query: { nonce: '1' },
        })
        const kept = noteByIdNonce.read(model, {
          params: { id: 'a' },
          query: { nonce: '2' },
        })
        return h.div(
          [],
          [
            h.div([h.Id('status')], [`${dropped._tag} ${kept._tag}`]),
            h.button(
              [
                h.Id('forget-nonce-1'),
                h.OnClick(
                  noteByIdNonce.Message.RequestedForget({
                    args: { params: { id: 'a' }, query: { nonce: '1' } },
                  }),
                ),
              ],
              ['forget-nonce-1'],
            ),
          ],
        )
      },
      resources: live,
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitStatus('Success')
      await awaitTwoAnimationFrames()
      click('forget-nonce-1')
      await awaitStatus('Idle Success')
      expect(attempts['1']).toBe(1)
      expect(attempts['2']).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})

describe('Query.HttpApi.Service.query empty success', () => {
  it.effect('run succeeds with no content', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(ping.run, NotesClientLive)
      expect(data).toEqual(AsyncData.Success({ data: undefined }))
    }),
  )
})

describe('Query.HttpApi.Service.query middleware', () => {
  it('includes middleware errors in the Query error type', () => {
    expectTypeOf(guarded.run).toEqualTypeOf<
      Effect.Effect<
        AsyncData.AsyncData<
          Note,
          string | NotesAuthError | Query.HttpApi.HttpApiClientError
        >,
        never,
        NotesClient
      >
    >()
  })
})

describe('Query.HttpApi.Service.query construction', () => {
  type QueryEndpointId = Parameters<typeof NotesClient.query>[2]

  it('rejects an endpoint whose success codec requires encoding services', () => {
    expectTypeOf<'list'>().toExtend<QueryEndpointId>()
    expectTypeOf<'secret'>().not.toExtend<QueryEndpointId>()
  })

  it('rejects an endpoint whose request codec requires encoding services', () => {
    expectTypeOf<'locked'>().not.toExtend<QueryEndpointId>()
  })

  it('rejects an endpoint whose success codec requires decoding services', () => {
    expectTypeOf<'decoded'>().not.toExtend<QueryEndpointId>()
  })

  it('rejects stream success endpoints', () => {
    expectTypeOf<'events'>().not.toExtend<QueryEndpointId>()
    expectTypeOf<'bytes'>().not.toExtend<QueryEndpointId>()
    expectTypeOf<'headerEvents'>().not.toExtend<QueryEndpointId>()
  })
})
