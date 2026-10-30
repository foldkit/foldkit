import {
  Context,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
} from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import { make } from '../../blocks/program.js'
import { Block } from '../../blocks/public.js'
import { story } from '../../blocks/testing.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Story from '../../test/story.js'
import * as Query from './index.js'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })
type Note = typeof Note.Type
const hello = [{ id: '1', body: 'hello' }]
const noteRequestKey = (noteId: string): string => JSON.stringify({ noteId })

class QueryTestService extends Context.Service<
  QueryTestService,
  { readonly token: string }
>()('QueryTestService') {}

class QueryHandlerTestService extends Context.Service<
  QueryHandlerTestService,
  { readonly offset: number }
>()('QueryHandlerTestService') {}

class QueryBuildFailure extends Error {}

const Notes = Query.define({
  name: 'BlockNotes',
  data: Schema.Array(Note),
  error: Schema.String,
  handler: function* () {
    return () => Effect.succeed(hello)
  },
})

const NoteById = Query.define({
  name: 'BlockNote',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String },
  notifyOnCompletion: true,
  handler: function* () {
    return ({ noteId }) => Effect.succeed({ id: noteId, body: 'hello' })
  },
})

const ParentMessage = defineMessageUnion({
  ClickedLoad: {},
  ClickedOpen: { noteId: Schema.String },
})

class Parent extends Block<Parent>()('QueryParent', {
  Model: Schema.Struct({
    notes: Notes,
    noteById: NoteById,
    maybeLastLoadedId: Schema.Option(Schema.String),
  }),
  Message: ParentMessage,
}) {}

const ParentLive = Parent.make(
  Effect.fn(function* () {
    const notes = yield* new Notes('notes', {})
    const noteById = yield* new NoteById('noteById', {})

    return {
      model: { notes, noteById, maybeLastLoadedId: Option.none() },
      update: {
        ClickedLoad: model => ({
          model,
          messages: [
            model.notes.send(Notes.Message.RequestedRevalidationOrLoad()),
          ],
        }),
        ClickedOpen: (model, { noteId }) => ({
          model,
          messages: [
            model.noteById.send(
              NoteById.Message.RequestedLoadIfMissing({ args: { noteId } }),
            ),
          ],
        }),
        ...noteById.on({
          CompletedFetch: (model, { args, result }) => ({
            model: {
              ...model,
              maybeLastLoadedId: Result.isSuccess(result)
                ? Option.some(args.noteId)
                : model.maybeLastLoadedId,
            },
          }),
        }),
      },
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Notes.Live, NoteById.Live)))

describe('Query Block in a parent', () => {
  it.effect('routes a parent request and its completion to the Query', () =>
    story(
      ParentLive,
      Story.message(ParentMessage.ClickedLoad()),
      Story.model(model => {
        expect(Notes.read(model.notes)).toEqual(AsyncData.Loading())
      }),
      Story.Command.resolve(
        Notes.Fetch,
        Notes.Message.CompletedFetch({
          generation: 1,
          result: Result.succeed(hello),
        }),
      ),
      Story.model(model => {
        expect(Notes.read(model.notes)).toEqual(
          AsyncData.Success({ data: hello }),
        )
      }),
      Story.message(ParentMessage.ClickedLoad()),
      Story.Command.expectExact(Notes.Fetch),
      Story.model(model => {
        expect(Notes.read(model.notes)).toEqual(
          AsyncData.Refreshing({ data: hello }),
        )
      }),
      Story.Command.resolve(
        Notes.Fetch,
        Notes.Message.CompletedFetch({
          generation: 2,
          result: Result.fail('offline'),
        }),
      ),
      Story.model(model => {
        expect(Notes.read(model.notes)).toEqual(
          AsyncData.Stale({ data: hello, error: 'offline' }),
        )
      }),
    ),
  )

  it.effect(
    'reports an accepted KeyedQuery completion to the parent OutMessage handler',
    () =>
      story(
        ParentLive,
        Story.message(ParentMessage.ClickedOpen({ noteId: '7' })),
        Story.Command.resolve(
          NoteById.Fetch,
          NoteById.Message.CompletedFetch({
            args: { noteId: '7' },
            generation: 1,
            requestKey: noteRequestKey('7'),
            result: Result.succeed({ id: '7', body: 'hello' }),
          }),
        ),
        Story.model(model => {
          expect(model.maybeLastLoadedId).toEqual(Option.some('7'))
          expect(NoteById.read(model.noteById, { noteId: '7' })).toEqual(
            AsyncData.Success({ data: { id: '7', body: 'hello' } }),
          )
        }),
        Story.message(
          Block.deliver(
            NoteById,
            'noteById',
            NoteById.Message.CompletedFetch({
              args: { noteId: '7' },
              generation: 1,
              requestKey: noteRequestKey('7'),
              result: Result.succeed({ id: '7', body: 'duplicate' }),
            }),
          ),
        ),
        Story.model(model => {
          expect(NoteById.read(model.noteById, { noteId: '7' })).toEqual(
            AsyncData.Success({ data: { id: '7', body: 'hello' } }),
          )
        }),
      ),
  )

  it.effect('starts Loading when constructed with isLoadingOnStart', () =>
    story(
      Notes.Live,
      { isLoadingOnStart: true },
      Story.model(model => {
        expect(Notes.read(model)).toEqual(AsyncData.Loading())
        expect(model.generation).toBe(1)
      }),
      Story.message(
        Notes.Message.CompletedFetch({
          generation: 1,
          result: Result.succeed(hello),
        }),
      ),
      Story.model(model => {
        expect(Notes.read(model)).toEqual(AsyncData.Success({ data: hello }))
      }),
    ),
  )

  it.effect('returns a CancelFetch Command for a pending request', () =>
    story(
      Notes.Live,
      {},
      Story.message(Notes.Message.RequestedLoadIfMissing()),
      Story.message(Notes.Message.RequestedCancel()),
      Story.Command.resolve(
        Notes.Fetch,
        Notes.Message.CompletedFetch({
          generation: 1,
          result: Result.succeed(hello),
        }),
      ),
      Story.Command.resolve(
        Notes.CancelFetch({ generation: 1 }),
        Notes.Message.CompletedCancelFetch(),
      ),
      Story.model(model => {
        expect(Notes.read(model)).toEqual(AsyncData.Idle())
        expect(model.generation).toBe(2)
      }),
    ),
  )
})

const waitFor = (predicate: () => boolean) =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (predicate()) {
        return
      }
      yield* Effect.sleep('5 millis')
    }
    throw new Error('Timed out waiting for condition')
  })

describe('Query Block in a running program', () => {
  it.live(
    'fetches on start and cancels only the instance that requested it',
    () =>
      Effect.gen(function* () {
        const release = yield* Deferred.make<void>()
        const completedCount = yield* Ref.make(0)
        const Gated = Query.define({
          name: 'GatedNotes',
          data: Schema.Array(Note),
          error: Schema.String,
          handler: function* () {
            return () =>
              Deferred.await(release).pipe(
                Effect.andThen(Ref.update(completedCount, count => count + 1)),
                Effect.as(hello),
              )
          },
        })
        const ProgramMessage = defineMessageUnion({ ClickedCancel: {} })

        class Root extends Block<Root>()('GatedRoot', {
          Model: Schema.Struct({ first: Gated, second: Gated }),
          Message: ProgramMessage,
        }) {}

        const RootLive = Root.make(
          Effect.fn(function* () {
            const first = yield* new Gated('first', { isLoadingOnStart: true })
            const second = yield* new Gated('second', {
              isLoadingOnStart: true,
            })

            return {
              model: { first, second },
              update: {
                ClickedCancel: model => ({
                  model,
                  messages: [model.first.send(Gated.Message.RequestedCancel())],
                }),
              },
              view: (model, h) =>
                h.div(
                  [],
                  [
                    h.span(
                      [h.Id('first')],
                      [Gated.read(model.first.model)._tag],
                    ),
                    h.span(
                      [h.Id('second')],
                      [Gated.read(model.second.model)._tag],
                    ),
                    h.button(
                      [
                        h.Id('cancel'),
                        h.OnClick(ProgramMessage.ClickedCancel()),
                      ],
                      ['Cancel'],
                    ),
                  ],
                ),
            }
          }),
        ).pipe(Layer.provide(Gated.Live))

        const container = document.createElement('div')
        container.id = 'query-app'
        document.body.append(container)
        const program = make(Root, { container, layer: RootLive })
        const fiber = yield* Effect.forkChild(program.start())
        const textOf = (id: string) => document.getElementById(id)?.textContent

        yield* waitFor(
          () => textOf('first') === 'Loading' && textOf('second') === 'Loading',
        )

        document.getElementById('cancel')?.click()
        yield* waitFor(() => textOf('first') === 'Idle')
        yield* Deferred.succeed(release, undefined)
        yield* waitFor(() => textOf('second') === 'Success')

        expect(textOf('first')).toBe('Idle')
        expect(yield* Ref.get(completedCount)).toBe(1)

        yield* Fiber.interrupt(fiber)
        container.remove()
      }),
  )
})

describe('Query Layers', () => {
  const canonicalNotes = Query.define({
    name: 'CanonicalNotes',
    data: Schema.Array(Note),
    error: Schema.String,
    handler: function* () {
      const service = yield* QueryTestService

      return () => Effect.succeed([{ id: service.token, body: 'hello' }])
    },
  })

  const canonicalNote = Query.define({
    name: 'CanonicalNote',
    data: Note,
    error: Schema.String,
    args: { noteId: Schema.String },
    handler: function* () {
      return ({ noteId }) => Effect.succeed({ id: noteId, body: 'hello' })
    },
  })

  const exactInference = Query.define({
    name: 'ExactInference',
    data: Schema.Option(Schema.NumberFromString),
    error: Schema.Option(Schema.NumberFromString),
    args: {
      count: Schema.NumberFromString,
      maybeCount: Schema.Option(Schema.Number),
      label: Schema.optional(Schema.String),
    },
    handler: function* () {
      const builderService = yield* QueryTestService
      yield* Effect.scope

      if (builderService.token === '') {
        return yield* Effect.fail(new QueryBuildFailure())
      }

      return ({ count, maybeCount, label }) => {
        expectTypeOf(count).toEqualTypeOf<number>()
        expectTypeOf(maybeCount).toEqualTypeOf<Option.Option<number>>()
        expectTypeOf(label).toEqualTypeOf<string | undefined>()

        return Effect.gen(function* () {
          const handlerService = yield* QueryHandlerTestService
          const total =
            count +
            Option.getOrElse(maybeCount, () => 0) +
            handlerService.offset

          if (label === undefined) {
            return yield* Effect.fail(Option.some(total))
          }

          return Option.some(total)
        })
      }
    },
  })

  it('infers fetch arguments and Layer requirements from the declared Schemas', () => {
    expectTypeOf(canonicalNote.run)
      .parameter(0)
      .toEqualTypeOf<Readonly<{ noteId: string }>>()
    expectTypeOf(canonicalNotes.run).toEqualTypeOf<
      Effect.Effect<
        AsyncData.AsyncData<ReadonlyArray<Note>, string>,
        never,
        Query.QueryFetcher<'CanonicalNotes'>
      >
    >()
    expectTypeOf<
      Layer.Services<typeof canonicalNotes.Live>
    >().toEqualTypeOf<QueryTestService>()
    expectTypeOf<Layer.Services<typeof canonicalNote.Live>>().toBeNever()
    expectTypeOf<
      Layer.Error<typeof exactInference.Live>
    >().toEqualTypeOf<QueryBuildFailure>()
    expectTypeOf<Layer.Services<typeof exactInference.Live>>().toEqualTypeOf<
      QueryTestService | QueryHandlerTestService
    >()
    expectTypeOf<Layer.Success<typeof canonicalNotes.Live>>().toEqualTypeOf<
      | Query.Query<
          'CanonicalNotes',
          ReadonlyArray<Note>,
          ReadonlyArray<typeof Note.Encoded>,
          string,
          string
        >
      | Query.QueryFetcher<'CanonicalNotes'>
    >()
    expectTypeOf(canonicalNote.Fetch).parameter(0).toEqualTypeOf<{
      readonly args: { readonly noteId: string }
      readonly generation: number
      readonly requestKey: string
    }>()

    if (false) {
      const config = {
        name: 'InvalidCanonicalNote',
        data: Note,
        error: Schema.String,
      }
      const invalidHandler = function* () {
        return () => Effect.succeed('invalid')
      }
      // @ts-expect-error Fetch results must match the declared data Schema.
      Query.define({ ...config, handler: invalidHandler })

      const keyedConfig = {
        ...config,
        args: { noteId: Schema.String },
      }
      const narrowHandler = function* () {
        return ({ noteId }: Readonly<{ noteId: 'only' }>) =>
          Effect.succeed({ id: noteId, body: 'hello' })
      }
      // @ts-expect-error A fetch must accept every value allowed by the args Schema.
      Query.define({ ...keyedConfig, handler: narrowHandler })

      const invalidErrorHandler = function* () {
        return () => Effect.fail('invalid')
      }
      Query.define({
        name: 'InvalidError',
        data: Schema.Option(Schema.NumberFromString),
        error: Schema.Option(Schema.NumberFromString),
        // @ts-expect-error Fetch failures must match the decoded error Schema.
        handler: invalidErrorHandler,
      })

      const layered = Query.define({
        name: 'LayeredNotes',
        data: Schema.Array(Note),
        error: Schema.String,
      })
      // @ts-expect-error A Query without a handler has no attached Layer.
      void layered.Live
      layered.toLayer<never, never, never>(
        // @ts-expect-error toLayer accepts an Effect that constructs the fetch function.
        () => Effect.succeed(hello),
      )

      const effectHandlerConfig = {
        name: 'EffectHandlerNotes',
        data: Schema.Array(Note),
        error: Schema.String,
        handler: Effect.succeed(() => Effect.succeed(hello)),
      }
      // @ts-expect-error handler accepts a generator function rather than a constructed Effect.
      Query.define(effectHandlerConfig)
    }
  })

  it('supports Schema field forwarding through a generic factory', () => {
    const makeStringQuery = <const Fields extends Query.SyncFields>(
      args: Fields,
    ) =>
      Query.define({
        name: 'GenericStrings',
        data: Schema.String,
        error: Schema.Never,
        args,
        handler: function* () {
          return (values: Schema.Struct.Type<Fields>) =>
            Effect.succeed(JSON.stringify(values))
        },
      })
    const generic = makeStringQuery({ id: Schema.String })
    expectTypeOf(generic.run)
      .parameter(0)
      .toEqualTypeOf<Readonly<{ id: string }>>()
  })

  it('carries constructor failures into the Layer error channel', () => {
    const failed = Query.define({
      name: 'FailedCanonicalNotes',
      data: Schema.Array(Note),
      error: Schema.String,
      handler: function* () {
        return yield* Effect.fail('unavailable')
      },
    })

    expectTypeOf<Layer.Error<typeof failed.Live>>().toEqualTypeOf<string>()
    expectTypeOf<Layer.Services<typeof failed.Live>>().toBeNever()
  })

  it.effect('constructs one fetch function and invokes it for each fetch', () =>
    Effect.gen(function* () {
      const constructionCount = yield* Ref.make(0)
      const invocationCount = yield* Ref.make(0)
      const counted = Query.define({
        name: 'CountedNotes',
        data: Schema.Array(Note),
        error: Schema.String,
        handler: function* () {
          yield* Ref.update(constructionCount, count => count + 1)

          return () =>
            Ref.update(invocationCount, count => count + 1).pipe(
              Effect.as(hello),
            )
        },
      })

      expect(yield* Ref.get(constructionCount)).toBe(0)

      const data = yield* Effect.all([counted.run, counted.run]).pipe(
        Effect.provide(counted.Live),
      )

      expect(data).toEqual([
        AsyncData.Success({ data: hello }),
        AsyncData.Success({ data: hello }),
      ])
      expect(yield* Ref.get(constructionCount)).toBe(1)
      expect(yield* Ref.get(invocationCount)).toBe(2)
    }),
  )

  it.effect(
    'runs the canonical fetch with a provided service and an explicit alternative',
    () =>
      Effect.gen(function* () {
        const data = yield* canonicalNotes.run.pipe(
          Effect.provide(
            canonicalNotes.Live.pipe(
              Layer.provide(Layer.succeed(QueryTestService, { token: 'test' })),
            ),
          ),
        )
        const alternative = canonicalNote.toLayer(
          Effect.succeed(({ noteId }) => Effect.fail(`missing:${noteId}`)),
        )
        const failure = yield* canonicalNote
          .run({ noteId: '42' })
          .pipe(Effect.provide(alternative))

        expect(data).toEqual(
          AsyncData.Success({ data: [{ id: 'test', body: 'hello' }] }),
        )
        expect(failure).toEqual(AsyncData.Failure({ error: 'missing:42' }))
      }),
  )

  it.effect('snapshots keyed arguments when run is constructed', () =>
    Effect.gen(function* () {
      const byFilter = Query.define({
        name: 'NoteByMutableFilterRun',
        data: Schema.String,
        error: Schema.Never,
        args: {
          filter: Schema.Struct({
            id: Schema.String,
            revision: Schema.NumberFromString,
          }),
        },
        handler: function* () {
          return ({ filter }) =>
            Effect.succeed(`${filter.id}:${filter.revision}`)
        },
      })
      const args = { filter: { id: 'a', revision: 1 } }
      const run = byFilter.run(args)

      args.filter.id = 'b'
      args.filter.revision = 2

      const data = yield* Effect.provide(run, byFilter.Live)

      expect(data).toEqual(AsyncData.Success({ data: 'a:1' }))
    }),
  )

  it.effect('builds a host Layer from a fetch constructor', () =>
    Effect.gen(function* () {
      class Prefix extends Context.Service<
        Prefix,
        { readonly value: string }
      >()('Prefix') {}
      const layered = Query.define({
        name: 'HostNotes',
        data: Schema.Array(Note),
        error: Schema.String,
      })
      const layeredById = Query.define({
        name: 'HostNote',
        data: Note,
        error: Schema.String,
        args: { noteId: Schema.String },
      })
      const handlerLayer = layered.toLayer(
        Effect.map(
          Prefix,
          ({ value }) =>
            () =>
              Effect.succeed([{ id: value, body: 'hello' }]),
        ),
      )
      const keyedLayer = layeredById.toLayer(
        Effect.succeed(({ noteId }) =>
          noteId === 'missing'
            ? Effect.fail('missing')
            : Effect.succeed({ id: noteId, body: 'hello' }),
        ),
      )
      const data = yield* Effect.provide(
        layered.run,
        Layer.provide(
          handlerLayer,
          Layer.succeed(Prefix, { value: 'captured' }),
        ),
      )
      const success = yield* Effect.provide(
        layeredById.run({ noteId: '1' }),
        keyedLayer,
      )
      const failure = yield* Effect.provide(
        layeredById.run({ noteId: 'missing' }),
        keyedLayer,
      )

      expect(data).toEqual(
        AsyncData.Success({ data: [{ id: 'captured', body: 'hello' }] }),
      )
      expect(success).toEqual(
        AsyncData.Success({ data: { id: '1', body: 'hello' } }),
      )
      expect(failure).toEqual(AsyncData.Failure({ error: 'missing' }))
      expectTypeOf<
        Layer.Services<typeof handlerLayer>
      >().toEqualTypeOf<Prefix>()
    }),
  )
})
