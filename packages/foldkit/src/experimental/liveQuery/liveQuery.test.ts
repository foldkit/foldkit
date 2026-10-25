import {
  Array,
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import type * as Subscription from '../../subscription/public.js'
import * as Story from '../../test/story.js'
import * as LiveQuery from './index.js'

const Board = Schema.Struct({ cards: Schema.Array(Schema.String) })
type Board = typeof Board.Type

const EntryMeta = Schema.Struct({ intentId: Schema.String })

const boardFeed = LiveQuery.define({
  name: 'BoardFeed',
  state: Board,
  error: Schema.String,
  meta: EntryMeta,
  args: { boardId: Schema.String },
})

type BoardModel = (typeof boardFeed.Model)['Type']
type BoardMessage = (typeof boardFeed.Message)['Type']
type BoardOutMessage = (typeof boardFeed.OutMessage)['Type']
type BoardArgs = Readonly<{ boardId: string }>

const args = { boardId: 'b1' }
const otherArgs = { boardId: 'b2' }

const boardAfter = (seq: number): Board => ({
  cards: Array.makeBy(seq, index => `card-${index + 1}`),
})

const entryAt = (seq: number) => ({
  seq,
  state: boardAfter(seq),
  meta: { intentId: `intent-${seq}` },
})

const watchCold = (model: BoardModel, feedArgs: BoardArgs = args) =>
  boardFeed.requestWatch(model, { args: feedArgs }).model

const dependencies = (model: BoardModel) =>
  boardFeed.Feeds.modelToDependencies(model).feeds

const dependencyOf = (model: BoardModel, feedArgs: BoardArgs = args) =>
  Option.getOrThrow(
    Array.findFirst(dependencies(model), dependency =>
      Schema.toEquivalence(Schema.Struct({ boardId: Schema.String }))(
        dependency.args,
        feedArgs,
      ),
    ),
  )

const sessionOf = (model: BoardModel, feedArgs: BoardArgs = args) =>
  Option.getOrThrow(boardFeed.sessionMessages(model, feedArgs))

const received = (
  model: BoardModel,
  seq: number,
  feedArgs: BoardArgs = args,
): BoardMessage => sessionOf(model, feedArgs).receivedEntry(entryAt(seq))

const applied = (
  seq: number,
  maybePreviousCursor: Option.Option<number>,
  feedArgs: BoardArgs = args,
) =>
  boardFeed.OutMessage.AppliedEntry({
    args: feedArgs,
    seq,
    maybePreviousCursor,
    meta: { intentId: `intent-${seq}` },
  })

type Delivery = Readonly<{
  model: BoardModel
  outMessages: ReadonlyArray<BoardOutMessage>
}>

const deliver = (
  model: BoardModel,
  messages: ReadonlyArray<BoardMessage>,
): Delivery =>
  Array.reduce(
    messages,
    { model, outMessages: [] },
    (delivery: Delivery, message): Delivery => {
      const result = boardFeed.update(delivery.model, message)

      return {
        model: result.model,
        outMessages: Option.match(Option.fromNullishOr(result.outMessage), {
          onNone: () => delivery.outMessages,
          onSome: outMessage => Array.append(delivery.outMessages, outMessage),
        }),
      }
    },
  )

describe('LiveQuery watching', () => {
  it('stays Loading and Connecting on a cold start until the first entry arrives', () => {
    const watching = watchCold(boardFeed.init().model)

    expect(boardFeed.read(watching, args)).toEqual(AsyncData.Loading())
    expect(boardFeed.readCursor(watching, args)).toEqual(Option.none())
    expect(boardFeed.readConnection(watching, args)).toEqual(
      Option.some(LiveQuery.Connection.Connecting()),
    )
    expect(dependencyOf(watching).maybeAfter).toEqual(Option.none())

    const first = boardFeed.update(watching, received(watching, 1))

    expect(boardFeed.read(first.model, args)).toEqual(
      AsyncData.Success({ data: boardAfter(1) }),
    )
    expect(boardFeed.readConnection(first.model, args)).toEqual(
      Option.some(LiveQuery.Connection.Live()),
    )
    expect(first.outMessage).toEqual(applied(1, Option.none()))
  })

  it('hydrates from a snapshot without Loading and resumes after its cursor', () => {
    const watching = boardFeed.requestWatch(boardFeed.init().model, {
      args,
      maybeSnapshot: Option.some({ state: boardAfter(7), cursor: 7 }),
    }).model

    expect(boardFeed.read(watching, args)).toEqual(
      AsyncData.Success({ data: boardAfter(7) }),
    )
    expect(boardFeed.readCursor(watching, args)).toEqual(Option.some(7))
    expect(dependencyOf(watching).maybeAfter).toEqual(Option.some(7))

    const repeated = deliver(watching, [
      received(watching, 7),
      received(watching, 8),
    ])

    expect(repeated.outMessages).toEqual([applied(8, Option.some(7))])
    expect(boardFeed.read(repeated.model, args)).toEqual(
      AsyncData.Success({ data: boardAfter(8) }),
    )
  })

  it('leaves an already watched feed unchanged', () => {
    const watching = watchCold(boardFeed.init().model)
    const watchedAgain = boardFeed.requestWatch(watching, {
      args,
      maybeSnapshot: Option.some({ state: boardAfter(3), cursor: 3 }),
    })

    expect(watchedAgain.model).toBe(watching)
  })

  it('unwatches a feed, ignores its remaining entries, and resumes the others after their cursors', () => {
    const watchingBoth = watchCold(watchCold(boardFeed.init().model), otherArgs)
    const progressed = deliver(watchingBoth, [
      received(watchingBoth, 1, otherArgs),
      received(watchingBoth, 2, otherArgs),
    ]).model
    const unwatched = boardFeed.requestUnwatch(progressed, { args }).model
    const late = boardFeed.update(unwatched, received(progressed, 1))

    expect(boardFeed.read(unwatched, args)).toEqual(AsyncData.Idle())
    expect(boardFeed.sessionMessages(unwatched, args)).toEqual(Option.none())
    expect(late.model).toBe(unwatched)
    expect(late.outMessage).toBeUndefined()
    expect(
      Array.map(dependencies(unwatched), ({ args, maybeAfter }) => ({
        args,
        maybeAfter,
      })),
    ).toEqual([{ args: otherArgs, maybeAfter: Option.some(2) }])
  })

  it('keeps a feed watched while paused Idle and Offline until resume', () => {
    const paused = boardFeed.requestPause(boardFeed.init().model).model
    const watchedWhilePaused = watchCold(paused)

    expect(boardFeed.read(watchedWhilePaused, args)).toEqual(AsyncData.Idle())
    expect(boardFeed.readConnection(watchedWhilePaused, args)).toEqual(
      Option.some(LiveQuery.Connection.Offline()),
    )
    expect(dependencies(watchedWhilePaused)).toEqual([])

    const resumed = boardFeed.requestResume(watchedWhilePaused).model

    expect(boardFeed.read(resumed, args)).toEqual(AsyncData.Loading())
    expect(boardFeed.readConnection(resumed, args)).toEqual(
      Option.some(LiveQuery.Connection.Connecting()),
    )
    expect(dependencyOf(resumed).maybeAfter).toEqual(Option.none())
  })

  it('returns a cold feed to Idle when it pauses or its Stream ends before the first entry', () => {
    const watching = watchCold(boardFeed.init().model)
    const paused = boardFeed.requestPause(watching).model
    const ended = boardFeed.update(
      watching,
      sessionOf(watching).endedFeed(),
    ).model

    expect(boardFeed.read(paused, args)).toEqual(AsyncData.Idle())
    expect(boardFeed.read(ended, args)).toEqual(AsyncData.Idle())
    expect(boardFeed.readConnection(ended, args)).toEqual(
      Option.some(LiveQuery.Connection.Offline()),
    )
    expect(boardFeed.read(boardFeed.requestResume(ended).model, args)).toEqual(
      AsyncData.Loading(),
    )
  })
})

describe('LiveQuery entry deduplication', () => {
  it('ignores entries whose seq is not greater than the cursor', () => {
    const watching = watchCold(boardFeed.init().model)
    const once = deliver(watching, [
      received(watching, 1),
      received(watching, 2),
      received(watching, 3),
    ])
    const twice = deliver(watching, [
      received(watching, 1),
      received(watching, 1),
      received(watching, 2),
      received(watching, 1),
      received(watching, 2),
      received(watching, 3),
      received(watching, 3),
    ])

    expect(twice.model).toEqual(once.model)
    expect(boardFeed.readCursor(twice.model, args)).toEqual(Option.some(3))
    expect(twice.outMessages).toEqual([
      applied(1, Option.none()),
      applied(2, Option.some(1)),
      applied(3, Option.some(2)),
    ])
  })

  it('emits no OutMessage and keeps the Model for a duplicate on a live feed', () => {
    const watching = watchCold(boardFeed.init().model)

    Story.story(
      boardFeed.update,
      Story.given(watching),
      Story.message(received(watching, 1)),
      Story.expectOutMessage(applied(1, Option.none())),
      Story.message(received(watching, 1)),
      Story.expectNoOutMessage(),
      Story.model(model => {
        expect(boardFeed.readCursor(model, args)).toEqual(Option.some(1))
      }),
    )
  })

  it('applies an entry that skips sequence numbers and reports the previous cursor', () => {
    const watching = watchCold(boardFeed.init().model)
    const skipped = deliver(watching, [
      received(watching, 1),
      received(watching, 4),
    ])

    expect(boardFeed.readCursor(skipped.model, args)).toEqual(Option.some(4))
    expect(skipped.outMessages).toEqual([
      applied(1, Option.none()),
      applied(4, Option.some(1)),
    ])
  })
})

describe('LiveQuery Subscription dependencies', () => {
  it('keeps the same dependencies when an entry is applied', () => {
    const watching = watchCold(boardFeed.init().model)
    const appliedEntries = deliver(watching, [
      received(watching, 1),
      received(watching, 2),
    ])

    expect(dependencies(appliedEntries.model)).toEqual(dependencies(watching))
    expect(
      Schema.toEquivalence(boardFeed.Feeds.dependenciesSchema)(
        boardFeed.Feeds.modelToDependencies(watching),
        boardFeed.Feeds.modelToDependencies(appliedEntries.model),
      ),
    ).toBe(true)
  })

  it('resumes after pause from the cursor without losing or repeating entries', () => {
    const watching = watchCold(boardFeed.init().model)
    const beforePause = deliver(watching, [
      received(watching, 1),
      received(watching, 2),
      received(watching, 3),
    ])
    const paused = boardFeed.requestPause(beforePause.model).model
    const whilePaused = deliver(paused, [received(watching, 4)])

    expect(dependencies(paused)).toEqual([])
    expect(boardFeed.readConnection(paused, args)).toEqual(
      Option.some(LiveQuery.Connection.Offline()),
    )
    expect(boardFeed.read(paused, args)).toEqual(
      AsyncData.Success({ data: boardAfter(3) }),
    )
    expect(whilePaused.model).toBe(paused)
    expect(whilePaused.outMessages).toEqual([])

    const resumed = boardFeed.requestResume(whilePaused.model).model

    expect(dependencyOf(resumed).maybeAfter).toEqual(Option.some(3))
    expect(dependencyOf(resumed).generation).toBeGreaterThan(
      dependencyOf(watching).generation,
    )

    const afterResume = deliver(resumed, [
      received(watching, 4),
      received(resumed, 3),
      received(resumed, 4),
      received(resumed, 5),
    ])

    expect(boardFeed.readCursor(afterResume.model, args)).toEqual(
      Option.some(5),
    )
    expect(boardFeed.read(afterResume.model, args)).toEqual(
      AsyncData.Success({ data: boardAfter(5) }),
    )
    expect([...beforePause.outMessages, ...afterResume.outMessages]).toEqual([
      applied(1, Option.none()),
      applied(2, Option.some(1)),
      applied(3, Option.some(2)),
      applied(4, Option.some(3)),
      applied(5, Option.some(4)),
    ])
  })

  it('restarts every streaming feed after its cursor when the feed set changes', () => {
    const watching = watchCold(boardFeed.init().model)
    const progressed = deliver(watching, [
      received(watching, 1),
      received(watching, 2),
    ])
    const both = watchCold(progressed.model, otherArgs)

    expect(
      Array.map(dependencies(both), ({ args, maybeAfter }) => ({
        args,
        maybeAfter,
      })),
    ).toEqual([
      { args, maybeAfter: Option.some(2) },
      { args: otherArgs, maybeAfter: Option.none() },
    ])
  })
})

describe('LiveQuery feed failure', () => {
  it('keeps retained data, marks the feed Failed, and restarts the other feeds after their cursors', () => {
    const watchingBoth = watchCold(watchCold(boardFeed.init().model), otherArgs)
    const loaded = deliver(watchingBoth, [
      received(watchingBoth, 1),
      received(watchingBoth, 2),
      received(watchingBoth, 1, otherArgs),
    ]).model
    const failed = boardFeed.update(
      loaded,
      sessionOf(loaded).failedFeed('disconnected'),
    ).model

    expect(boardFeed.read(failed, args)).toEqual(
      AsyncData.Stale({ data: boardAfter(2), error: 'disconnected' }),
    )
    expect(boardFeed.readConnection(failed, args)).toEqual(
      Option.some(LiveQuery.Connection.Failed()),
    )
    expect(
      Array.map(dependencies(failed), ({ args, maybeAfter }) => ({
        args,
        maybeAfter,
      })),
    ).toEqual([{ args: otherArgs, maybeAfter: Option.some(1) }])
    expect(dependencyOf(failed, otherArgs).generation).toBeGreaterThan(
      dependencyOf(loaded, otherArgs).generation,
    )
  })

  it('stays Stale and Connecting after resume until the restarted Stream delivers an entry', () => {
    const watching = watchCold(boardFeed.init().model)
    const loaded = deliver(watching, [
      received(watching, 1),
      received(watching, 2),
    ]).model
    const failed = boardFeed.update(
      loaded,
      sessionOf(loaded).failedFeed('disconnected'),
    ).model
    const resumed = boardFeed.requestResume(failed).model

    expect(dependencyOf(resumed).maybeAfter).toEqual(Option.some(2))
    expect(boardFeed.read(resumed, args)).toEqual(
      AsyncData.Stale({ data: boardAfter(2), error: 'disconnected' }),
    )
    expect(boardFeed.readConnection(resumed, args)).toEqual(
      Option.some(LiveQuery.Connection.Connecting()),
    )

    const failedAgain = boardFeed.update(
      resumed,
      sessionOf(resumed).failedFeed('still disconnected'),
    ).model

    expect(boardFeed.read(failedAgain, args)).toEqual(
      AsyncData.Stale({ data: boardAfter(2), error: 'still disconnected' }),
    )

    const reconnected = boardFeed.requestResume(failedAgain).model
    const confirmed = boardFeed.update(reconnected, received(reconnected, 2))

    expect(confirmed.outMessage).toBeUndefined()
    expect(boardFeed.read(confirmed.model, args)).toEqual(
      AsyncData.Success({ data: boardAfter(2) }),
    )
    expect(boardFeed.readConnection(confirmed.model, args)).toEqual(
      Option.some(LiveQuery.Connection.Live()),
    )
  })

  it('enters Failure when a cold start fails and Loading again on resume', () => {
    const watching = watchCold(boardFeed.init().model)
    const failed = boardFeed.update(
      watching,
      sessionOf(watching).failedFeed('unavailable'),
    ).model

    expect(boardFeed.read(failed, args)).toEqual(
      AsyncData.Failure({ error: 'unavailable' }),
    )
    expect(boardFeed.read(boardFeed.requestResume(failed).model, args)).toEqual(
      AsyncData.Loading(),
    )
  })

  it('marks a feed Offline with its data retained when its Stream ends', () => {
    const watching = watchCold(boardFeed.init().model)
    const loaded = boardFeed.update(watching, received(watching, 1)).model
    const ended = boardFeed.update(loaded, sessionOf(loaded).endedFeed()).model

    expect(boardFeed.readConnection(ended, args)).toEqual(
      Option.some(LiveQuery.Connection.Offline()),
    )
    expect(boardFeed.read(ended, args)).toEqual(
      AsyncData.Success({ data: boardAfter(1) }),
    )
    expect(dependencies(ended)).toEqual([])
  })

  it('ignores a failure or end from an earlier session after a restart', () => {
    const watching = watchCold(boardFeed.init().model)
    const loaded = boardFeed.update(watching, received(watching, 1)).model
    const restarted = boardFeed.requestResume(loaded).model
    const lateEvents = deliver(restarted, [
      sessionOf(loaded).failedFeed('disconnected'),
      sessionOf(loaded).endedFeed(),
    ])

    expect(lateEvents.model).toBe(restarted)
    expect(boardFeed.readConnection(lateEvents.model, args)).toEqual(
      Option.some(LiveQuery.Connection.Connecting()),
    )
    expect(dependencies(lateEvents.model)).toEqual(dependencies(restarted))
  })
})

class BoardEvents extends Context.Service<
  BoardEvents,
  Readonly<{
    entries: (
      boardId: string,
      maybeAfter: Option.Option<number>,
    ) => Stream.Stream<
      Readonly<{
        seq: number
        state: Board
        meta: Readonly<{ intentId: string }>
      }>,
      string
    >
  }>
>()('LiveQueryTestBoardEvents') {}

class EntryClock extends Context.Service<
  EntryClock,
  Readonly<{ firstSeq: number }>
>()('LiveQueryTestEntryClock') {}

const canonicalBoardFeed = LiveQuery.define({
  name: 'CanonicalBoardFeed',
  state: Board,
  error: Schema.String,
  meta: EntryMeta,
  args: { boardId: Schema.String },
  handler: function* () {
    const events = yield* BoardEvents

    return ({ boardId }, maybeAfter) => events.entries(boardId, maybeAfter)
  },
})

const boardEntriesAfter = (after: number) =>
  Stream.fromIterable(Array.makeBy(3, index => entryAt(after + index + 1)))

const BoardEventsTestLayer = Layer.succeed(BoardEvents, {
  entries: (boardId, maybeAfter) => {
    if (boardId === 'broken') {
      return Stream.fail('unavailable')
    } else {
      return boardEntriesAfter(Option.getOrElse(maybeAfter, () => 0))
    }
  },
})

const collectFeedMessages = (model: BoardModel) =>
  Stream.runCollect(
    canonicalBoardFeed.Feeds.dependenciesToStream(
      canonicalBoardFeed.Feeds.modelToDependencies(model),
    ),
  ).pipe(
    Effect.provide(
      Layer.provide(canonicalBoardFeed.EffectsLayer, BoardEventsTestLayer),
    ),
  )

const settle = (model: BoardModel, messages: ReadonlyArray<BoardMessage>) =>
  Array.reduce(
    messages,
    model,
    (current, message) => canonicalBoardFeed.update(current, message).model,
  )

describe('LiveQuery handler', () => {
  it('makes services the handler yields requirements of the completed Block', () => {
    expectTypeOf<
      Layer.Services<typeof canonicalBoardFeed.EffectsLayer>
    >().toEqualTypeOf<BoardEvents>()
    expectTypeOf<
      Layer.Success<typeof canonicalBoardFeed.EffectsLayer>
    >().toEqualTypeOf<Subscription.HandlerOf<typeof canonicalBoardFeed.Feeds>>()
    expectTypeOf(canonicalBoardFeed.hostHandlers).toEqualTypeOf<readonly []>()
    expectTypeOf(boardFeed.hostHandlers).toEqualTypeOf<
      readonly [typeof boardFeed.Feeds]
    >()

    if (false) {
      LiveQuery.define({
        name: 'InvalidBoardFeed',
        state: Board,
        error: Schema.String,
        args: { boardId: Schema.String },
        // @ts-expect-error Entry state must match the declared state Schema.
        handler: function* () {
          return () => Stream.make({ seq: 1, state: 'invalid' })
        },
      })

      LiveQuery.define({
        name: 'MissingMetaBoardFeed',
        state: Board,
        error: Schema.String,
        meta: EntryMeta,
        args: { boardId: Schema.String },
        // @ts-expect-error Entries must carry the declared meta.
        handler: function* () {
          return () => Stream.make({ seq: 1, state: boardAfter(1) })
        },
      })

      // @ts-expect-error A host LiveQuery requires its exact Feeds handler contract.
      boardFeed.provideHandlers(Layer.empty)
    }
  })

  it('makes services the returned Stream requires requirements of the completed Block', () => {
    const clockedBoardFeed = LiveQuery.define({
      name: 'ClockedBoardFeed',
      state: Board,
      error: Schema.String,
      args: { boardId: Schema.String },
      handler: function* () {
        const events = yield* BoardEvents

        return ({ boardId }, maybeAfter) =>
          Stream.unwrap(
            Effect.map(EntryClock, ({ firstSeq }) =>
              Stream.map(
                events.entries(
                  boardId,
                  Option.orElseSome(maybeAfter, () => firstSeq),
                ),
                ({ seq, state }) => ({ seq, state }),
              ),
            ),
          )
      },
    })

    expectTypeOf<
      Layer.Services<typeof clockedBoardFeed.EffectsLayer>
    >().toEqualTypeOf<BoardEvents | EntryClock>()
  })

  it('carries handler services through a parent Binding', () => {
    const ParentModel = Schema.Struct({ board: canonicalBoardFeed.Model })
    const ParentMessage = defineMessageUnion({ OpenedBoard: {} })
    const ParentDefinition = Block.makeDefinition('LiveQueryServiceParent', {
      Model: ParentModel,
      Message: ParentMessage,
    })
    const BoardBinding = ParentDefinition.makeBinding(canonicalBoardFeed, {
      field: 'board',
    }).withOutMessagePolicy({
      fold: ParentDefinition.makeOutMessageFold(canonicalBoardFeed, {
        AppliedEntry: ParentDefinition.makeNoopStep,
      }),
    })
    const ParentComposition = ParentDefinition.makeComposition({
      bindings: [BoardBinding],
    })
    const prepareParent = () =>
      ParentComposition.prepareBlock({
        init: ParentComposition.makeInit(() => ({ model: {} })),
        update: ParentComposition.makeUpdate((model, message) =>
          ParentMessage.match(message, {
            OpenedBoard: () => BoardBinding.requestWatch({ args })(model),
          }),
        ),
        EffectsLayer: Layer.empty,
      })
    const Parent: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof ParentModel,
      typeof prepareParent
    > = Block.assemble(prepareParent)

    expectTypeOf<
      Layer.Services<typeof Parent.EffectsLayer>
    >().toEqualTypeOf<BoardEvents>()
  })

  it.effect('streams entries from the handler after the requested cursor', () =>
    Effect.gen(function* () {
      const watching = canonicalBoardFeed.requestWatch(
        canonicalBoardFeed.init().model,
        {
          args,
          maybeSnapshot: Option.some({ state: boardAfter(2), cursor: 2 }),
        },
      ).model
      const messages = yield* collectFeedMessages(watching)
      const settled = settle(watching, messages)

      expect(Array.map(messages, ({ _tag }) => _tag)).toEqual([
        'ReceivedEntry',
        'ReceivedEntry',
        'ReceivedEntry',
        'EndedFeed',
      ])
      expect(canonicalBoardFeed.read(settled, args)).toEqual(
        AsyncData.Success({ data: boardAfter(5) }),
      )
      expect(canonicalBoardFeed.readCursor(settled, args)).toEqual(
        Option.some(5),
      )
    }),
  )

  it.effect(
    'keeps delivering one feed while another feed in the same Stream fails',
    () =>
      Effect.gen(function* () {
        const brokenArgs = { boardId: 'broken' }
        const watching = canonicalBoardFeed.requestWatch(
          canonicalBoardFeed.requestWatch(canonicalBoardFeed.init().model, {
            args: brokenArgs,
          }).model,
          { args },
        ).model
        const messages = yield* collectFeedMessages(watching)
        const settled = settle(watching, messages)

        expect(canonicalBoardFeed.read(settled, brokenArgs)).toEqual(
          AsyncData.Failure({ error: 'unavailable' }),
        )
        expect(canonicalBoardFeed.readConnection(settled, brokenArgs)).toEqual(
          Option.some(LiveQuery.Connection.Failed()),
        )
        expect(canonicalBoardFeed.readCursor(settled, args)).toEqual(
          Option.some(3),
        )
        expect(canonicalBoardFeed.read(settled, args)).toEqual(
          AsyncData.Success({ data: boardAfter(3) }),
        )
      }),
  )

  it.effect('runs a host feed handler supplied through provideHandlers', () =>
    Effect.gen(function* () {
      const provided = boardFeed.provideHandlers(
        boardFeed.toLayer(
          Effect.map(
            BoardEvents,
            events =>
              ({ boardId }, maybeAfter) =>
                events.entries(boardId, maybeAfter),
          ),
        ),
      )
      const watching = provided.requestWatch(provided.init().model, {
        args,
      }).model
      const messages = yield* Stream.runCollect(
        provided.Feeds.dependenciesToStream(
          provided.Feeds.modelToDependencies(watching),
        ),
      ).pipe(
        Effect.provide(
          Layer.provide(provided.EffectsLayer, BoardEventsTestLayer),
        ),
      )
      const settled = Array.reduce(
        messages,
        watching,
        (model, message) => provided.update(model, message).model,
      )

      expect(provided.hostHandlers).toEqual([])
      expect(provided.readCursor(settled, args)).toEqual(Option.some(3))
      expectTypeOf(provided.provideHandlers).toEqualTypeOf<never>()
    }),
  )
})

describe('LiveQuery Block binding', () => {
  const ParentModel = Schema.Struct({
    board: canonicalBoardFeed.Model,
    confirmedIntentIds: Schema.Array(Schema.String),
  })
  const ParentMessage = defineMessageUnion({ OpenedBoard: {} })
  const ParentDefinition = Block.makeDefinition('LiveQueryParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const BoardBinding = ParentDefinition.makeBinding(canonicalBoardFeed, {
    field: 'board',
  }).withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(canonicalBoardFeed, {
      AppliedEntry: ({ meta }) =>
        ParentDefinition.makeFieldsStep(() => ({
          confirmedIntentIds: Array.append(meta.intentId),
        })),
    }),
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [BoardBinding],
  })
  const prepareParent = () =>
    ParentComposition.prepareBlock({
      init: ParentComposition.makeInit(() => ({
        model: { confirmedIntentIds: [] },
      })),
      update: ParentComposition.makeUpdate((model, message) =>
        ParentMessage.match(message, {
          OpenedBoard: () => BoardBinding.requestWatch({ args })(model),
        }),
      ),
      EffectsLayer: Layer.empty,
    })
  const Parent: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof ParentModel,
    typeof prepareParent
  > = Block.assemble(prepareParent)

  it.effect(
    'folds each applied entry from the lifted feed Stream into the parent',
    () =>
      Effect.gen(function* () {
        const watching = Parent.update(
          Parent.init().model,
          ParentMessage.OpenedBoard(),
        ).model
        const feeds = Parent.subscriptions['board/feeds']
        const feedDependencies = feeds.modelToDependencies(watching)
        const messages = yield* Stream.runCollect(
          feeds.dependenciesToStream(feedDependencies, () => feedDependencies),
        ).pipe(
          Effect.provide(
            Layer.provide(Parent.EffectsLayer, BoardEventsTestLayer),
          ),
        )
        const settled = pipe(
          messages,
          Array.reduce(
            watching,
            (model, message) => Parent.update(model, message).model,
          ),
        )

        expect(settled.confirmedIntentIds).toEqual([
          'intent-1',
          'intent-2',
          'intent-3',
        ])
        expect(canonicalBoardFeed.read(settled.board, args)).toEqual(
          AsyncData.Success({ data: boardAfter(3) }),
        )
      }),
  )
})
