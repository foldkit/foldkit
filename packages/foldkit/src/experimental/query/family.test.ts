import { Context, Effect, Layer, Result, Schema } from 'effect'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/public.js'
import * as Story from '../../story/public.js'
import * as Query from './public.js'

class QuoteSource extends Context.Service<
  QuoteSource,
  Readonly<{ quote: string }>
>()('QueryFamilyTest/QuoteSource') {}

describe('Layer-constructed Query', () => {
  it.effect(
    'accepts an explicitly selected shared provider without acquiring handlers',
    () => {
      const events: Array<string> = []
      const Quotes = Query.define({
        name: 'PairedSharedQuotes',
        data: Schema.String,
        error: Schema.String,
        handler: function* () {
          events.push('handler')

          return () => Effect.succeed('checked')
        },
      })
      const Windows = Query.define({
        name: 'PairedSharedWindows',
        args: { label: Schema.String },
        data: Schema.String,
        error: Schema.String,
        handler: function* () {
          return ({ label }) => Effect.succeed(label)
        },
      })

      return Effect.gen(function* () {
        yield* Story.withBlock(
          { block: Quotes, layer: Query.layer },
          executable => {
            expect(Quotes.read(executable.init().model)).toEqual(
              AsyncData.Idle(),
            )
          },
        )
        yield* Story.withBlock(
          { block: Windows, layer: Query.layer },
          executable => {
            expect(Windows.pendingArgs(executable.init().model)).toEqual([])
          },
        )

        expect(events).toEqual([])
      })
    },
  )

  it.effect(
    'pairs custom family outputs exactly without ambient shared-provider fallback',
    () => {
      const Quotes = Query.define({
        name: 'PairedCustomQuotes',
        data: Schema.String,
        error: Schema.String,
        handler: function* () {
          return () => Effect.succeed('checked')
        },
      })
      const OtherQuotes = Quotes.provideHandlers(Quotes.EffectsLayer)
      const makeImplementation = (Selected: typeof Quotes) => {
        const Composition = Selected.makeComposition()
        const init = Composition.makeInit(() => ({
          model: Selected.Model.make({
            data: AsyncData.Idle(),
            generation: 10,
          }),
        }))
        const update = Composition.makeUpdate({
          RequestedLoadIfStale: Selected.makeCommandsStep(model => [
            Selected.Fetch({ generation: model.generation + 1 }),
          ]),
          CompletedFetch: Selected.makeNoopStep(),
          CompletedCancelFetch: Selected.makeNoopStep(),
        })
        const inMessageUpdate = Composition.makeInMessageUpdate({
          RequestedReset: Selected.makeNoopStep(),
          RequestedRevalidation: Selected.makeNoopStep(),
          RequestedRevalidationOrLoad: Selected.makeNoopStep(),
          RequestedLoadIfMissing: Selected.makeNoopStep(),
          RequestedCancel: Selected.makeNoopStep(),
        })

        return Selected.makeLayer(
          Effect.succeed({
            children: [],
            init,
            update,
            inMessageUpdate,
            EffectsLayer: Layer.empty,
            hostHandlers: [Selected.Fetch],
          }),
        )
      }
      const QuotesLayer = makeImplementation(Quotes)
      const OtherQuotesLayer = makeImplementation(OtherQuotes)

      return Effect.gen(function* () {
        yield* Story.withBlock(
          { block: Quotes, layer: QuotesLayer },
          executable => {
            expect(executable.init().model.generation).toBe(10)
          },
        )
        yield* Story.withBlock(Quotes, executable => {
          expect(executable.init().model.generation).toBe(10)
        }).pipe(Effect.provide(QuotesLayer))

        const wrongPair = Reflect.apply(Story.withBlock, undefined, [
          { block: Quotes, layer: OtherQuotesLayer },
          () => undefined,
        ])

        expect(Effect.isEffect(wrongPair)).toBe(true)

        const rejected = yield* Effect.promise(() =>
          Reflect.apply(Effect.runPromiseExit, undefined, [
            wrongPair.pipe(Effect.provide(Query.layer)),
          ]),
        )

        expect(rejected).toMatchObject({ _tag: 'Failure' })
      })
    },
  )

  it.effect(
    'keeps declarations passive and drives a pure Story without handler Services',
    () =>
      Effect.gen(function* () {
        const acquisitions: Array<string> = []
        const Quotes = Query.define({
          name: 'FamilyQuotes',
          data: Schema.String,
          error: Schema.String,
          handler: function* () {
            const source = yield* QuoteSource
            acquisitions.push('handler')
            return () => Effect.succeed(source.quote)
          },
        })

        expect('get' in Quotes).toBe(false)
        expect(Layer.isLayer(Reflect.get(Query, 'layer'))).toBe(true)
        expect('init' in Quotes).toBe(false)
        expect(acquisitions).toEqual([])
        expect(
          Schema.is(Quotes.Message)(Quotes.InMessage.RequestedLoadIfMissing()),
        ).toBe(false)
        expect(
          Schema.is(Quotes.InMessage)(
            Quotes.Message.CompletedFetch({
              generation: 1,
              result: Result.succeed('checked'),
            }),
          ),
        ).toBe(false)

        yield* Story.story(
          Quotes,
          Story.init(),
          Story.inMessage(Quotes.InMessage.RequestedLoadIfMissing()),
          Story.Command.resolve(
            Quotes.Fetch,
            Quotes.Message.CompletedFetch({
              generation: 1,
              result: Result.succeed('checked'),
            }),
          ),
          Story.model(model =>
            expect(Quotes.read(model)).toEqual(
              AsyncData.Success({ data: 'checked' }),
            ),
          ),
          Story.expectNoOutMessage(),
        ).pipe(Effect.provide(Query.layer))

        expect(acquisitions).toEqual([])
      }),
  )

  it.effect(
    'routes accepted keyed notifications and rejects superseded completions',
    () => {
      const Windows = Query.define({
        name: 'FamilyWindows',
        args: { label: Schema.String, offset: Schema.Number },
        data: Schema.Array(Schema.String),
        error: Schema.String,
        notifyOnCompletion: true,
      })
      const args = { label: 'devin', offset: 0 }
      const requestKey = JSON.stringify({ label: 'devin', offset: 0 })
      const completed = Windows.Message.CompletedFetch({
        args,
        requestKey,
        generation: 1,
        result: Result.succeed(['devin.com']),
        completedAtMillis: 10,
      })

      return Story.story(
        Windows,
        Story.init(),
        Story.message(Windows.Message.RequestedLoadIfMissing({ args })),
        Story.Command.resolve(Windows.Fetch, completed),
        Story.expectOutMessage(
          Windows.OutMessage.CompletedFetch({
            args,
            generation: 1,
            result: Result.succeed(['devin.com']),
            completedAtMillis: 10,
          }),
        ),
        Story.message(
          Windows.Message.CompletedFetch({
            ...completed,
            generation: 0,
            result: Result.succeed(['obsolete.com']),
          }),
        ),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(Windows.read(model, args)).toEqual(
            AsyncData.Success({ data: ['devin.com'] }),
          )
          expect(Windows.pendingArgs(model)).toEqual([])
          expect(Windows.isFresh(model, args, 11)).toBe(true)
        }),
      ).pipe(Effect.provide(Query.layer))
    },
  )

  it.effect(
    'receives requests while keeping cancellation and accepted completions local',
    () => {
      const Quotes = Query.define({
        name: 'ReceivedQuotes',
        data: Schema.String,
        error: Schema.String,
        notifyOnCompletion: true,
      })

      return Story.withBlock(Quotes, block => {
        const initial = block.init()
        const unchanged = block.inMessageUpdate(
          initial.model,
          Quotes.InMessage.RequestedRevalidation(),
        )
        expect(unchanged.model).toBe(initial.model)
        expect(unchanged.commands).toBeUndefined()

        const load = block.inMessageUpdate(
          initial.model,
          Quotes.InMessage.RequestedLoadIfMissing(),
        )
        expect(load.commands).toMatchObject([
          { name: Quotes.Fetch.name, args: { generation: 1 } },
        ])

        const cancel = block.inMessageUpdate(
          load.model,
          Quotes.InMessage.RequestedCancel(),
        )
        expect(Quotes.read(cancel.model)).toEqual(AsyncData.Idle())
        expect(cancel.model.generation).toBe(2)
        expect(cancel.commands).toHaveLength(1)
        expect(cancel.outMessage).toBeUndefined()

        const late = block.update(
          cancel.model,
          Quotes.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed('obsolete'),
          }),
        )
        expect(late.model).toBe(cancel.model)
        expect(late.outMessage).toBeUndefined()

        const retry = block.inMessageUpdate(
          late.model,
          Quotes.InMessage.RequestedRevalidationOrLoad(),
        )
        expect(retry.commands).toMatchObject([
          { name: Quotes.Fetch.name, args: { generation: 3 } },
        ])

        const accepted = block.update(
          retry.model,
          Quotes.Message.CompletedFetch({
            generation: 3,
            result: Result.succeed('checked'),
            completedAtMillis: 10,
          }),
        )
        expect(accepted.outMessage).toEqual(
          Quotes.OutMessage.CompletedFetch({
            generation: 3,
            result: Result.succeed('checked'),
            completedAtMillis: 10,
          }),
        )

        const refresh = block.inMessageUpdate(
          accepted.model,
          Quotes.InMessage.RequestedRevalidation(),
        )
        expect(Quotes.read(refresh.model)).toEqual(
          AsyncData.Refreshing({ data: 'checked' }),
        )
        expect(refresh.commands).toMatchObject([
          { name: Quotes.Fetch.name, args: { generation: 4 } },
        ])

        const reset = block.inMessageUpdate(
          refresh.model,
          Quotes.InMessage.RequestedReset(),
        )
        expect(Quotes.read(reset.model)).toEqual(AsyncData.Idle())
        expect(reset.model.generation).toBe(4)
        expect(reset.commands).toBeUndefined()
        expect(reset.outMessage).toBeUndefined()
      }).pipe(Effect.provide(Query.layer))
    },
  )

  it.effect(
    'receives keyed reset without changing positional argument adapters',
    () => {
      const Windows = Query.define({
        name: 'ReceivedWindowReset',
        args: { label: Schema.String },
        data: Schema.String,
        error: Schema.String,
        notifyOnCompletion: true,
      })
      const args = { label: 'devin' }

      return Story.withBlock(Windows, block => {
        const initial = block.init()
        const load = block.operations.requestLoadIfMissing(initial.model, args)
        expect(load.commands).toMatchObject([
          {
            name: Windows.Fetch.name,
            args: { args, requestKey: JSON.stringify(args), generation: 1 },
          },
        ])

        const reset = block.inMessageUpdate(
          load.model,
          Windows.InMessage.RequestedReset(),
        )
        expect(Windows.pendingArgs(reset.model)).toEqual([])
        expect(reset.model.generation).toBe(1)
        expect(reset.commands).toBeUndefined()

        const late = block.update(
          reset.model,
          Windows.Message.CompletedFetch({
            args,
            requestKey: JSON.stringify(args),
            generation: 1,
            result: Result.succeed('obsolete'),
          }),
        )
        expect(late.model).toBe(reset.model)
        expect(late.outMessage).toBeUndefined()
        expect(Windows.read(late.model, args)).toEqual(AsyncData.Idle())
      }).pipe(Effect.provide(Query.layer))
    },
  )

  it.effect(
    'builds selected handlers only when their EffectsLayer is requested',
    () =>
      Effect.gen(function* () {
        const acquisitions: Array<string> = []
        const Quotes = Query.define({
          name: 'FamilyHandlerSelection',
          data: Schema.String,
          error: Schema.String,
          handler: function* () {
            yield* QuoteSource
            acquisitions.push('original')
            return () => Effect.succeed('original')
          },
        })
        const selectedLayer = Quotes.toLayer(
          Effect.sync(() => {
            acquisitions.push('selected')
            return () => Effect.succeed('selected')
          }),
        )
        const SelectedQuotes = Quotes.provideHandlers(selectedLayer)
        const secondLayer = Quotes.toLayer(
          Effect.sync(() => {
            acquisitions.push('second')
            return () => Effect.succeed('second')
          }),
        )
        const ReselectedQuotes = SelectedQuotes.provideHandlers(secondLayer)

        expect(SelectedQuotes.Fetch).toBe(Quotes.Fetch)
        expect(SelectedQuotes.Model).toBe(Quotes.Model)
        expect(acquisitions).toEqual([])

        yield* Story.withBlock(SelectedQuotes, block =>
          Effect.asVoid(Layer.build(block.EffectsLayer)),
        ).pipe(Effect.provide(Query.layer))

        expect(acquisitions).toEqual(['selected'])

        yield* Story.withBlock(ReselectedQuotes, block =>
          Effect.asVoid(Layer.build(block.EffectsLayer)),
        ).pipe(Effect.provide(Query.layer))

        expect(acquisitions).toEqual(['selected', 'second'])
        expect(ReselectedQuotes.Fetch).toBe(Quotes.Fetch)
        expect(ReselectedQuotes.EffectsLayer).toBe(Quotes.EffectsLayer)
        expect(SelectedQuotes.EffectsLayer).toBe(Quotes.EffectsLayer)

        yield* Story.withBlock(Quotes, block =>
          Effect.asVoid(Layer.build(block.EffectsLayer)),
        ).pipe(
          Effect.provide(Query.layer),
          Effect.provideService(QuoteSource, { quote: 'original' }),
        )

        expect(acquisitions).toEqual(['selected', 'second', 'original'])
      }),
  )
})
