import { Effect, Result, Schema } from 'effect'
import * as AsyncData from 'foldkit/asyncData'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'
import { expect, test } from 'vitest'

import {
  DefaultHost,
  FalseHost,
  NotifyingHost,
  DefaultAttached,
  FalseAttached,
  NotifyingAttached,
  DefaultKeyedHost,
  FalseKeyedHost,
  NotifyingKeyedHost,
  DefaultKeyedAttached,
  FalseKeyedAttached,
  NotifyingKeyedAttached,
  ModeConstructorSource,
  ModeInvocationSource,
  ModeBuildFailure,
  SelectedHost,
  SelectedKeyedHost,
  modeKey,
} from '../src/modes.js'

test('unkeyed default and explicit false modes remain silent', () =>
  Effect.runPromise(
    Effect.all([
      Story.story(
        DefaultHost,
        Story.init(),
        Story.inMessage(DefaultHost.InMessage.RequestedLoadIfMissing()),
        Story.Command.resolve(
          DefaultHost.Fetch,
          DefaultHost.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(DefaultHost.read(model)).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
      Story.story(
        FalseHost,
        Story.init(),
        Story.inMessage(FalseHost.InMessage.RequestedLoadIfMissing()),
        Story.Command.resolve(
          FalseHost.Fetch,
          FalseHost.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(FalseHost.read(model)).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
      Story.story(
        DefaultAttached,
        Story.init(),
        Story.inMessage(DefaultAttached.InMessage.RequestedLoadIfMissing()),
        Story.Command.resolve(
          DefaultAttached.Fetch,
          DefaultAttached.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(DefaultAttached.read(model)).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
      Story.story(
        FalseAttached,
        Story.init(),
        Story.inMessage(FalseAttached.InMessage.RequestedLoadIfMissing()),
        Story.Command.resolve(
          FalseAttached.Fetch,
          FalseAttached.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(FalseAttached.read(model)).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
    ]).pipe(Effect.provide(Query.layer)),
  ))

test('unkeyed notifying modes emit accepted completion', () =>
  Effect.runPromise(
    Effect.all([
      Story.story(
        NotifyingHost,
        Story.init(),
        Story.inMessage(NotifyingHost.InMessage.RequestedLoadIfMissing()),
        Story.Command.resolve(
          NotifyingHost.Fetch,
          NotifyingHost.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(NotifyingHost.read(model)).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectOutMessage(
          NotifyingHost.OutMessage.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
      ),
      Story.story(
        NotifyingAttached,
        Story.init(),
        Story.inMessage(NotifyingAttached.InMessage.RequestedLoadIfMissing()),
        Story.Command.resolve(
          NotifyingAttached.Fetch,
          NotifyingAttached.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(NotifyingAttached.read(model)).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectOutMessage(
          NotifyingAttached.OutMessage.CompletedFetch({
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
      ),
    ]).pipe(Effect.provide(Query.layer)),
  ))

test('keyed default and explicit false modes remain silent', () =>
  Effect.runPromise(
    Effect.all([
      Story.story(
        DefaultKeyedHost,
        Story.init(),
        Story.message(
          DefaultKeyedHost.Message.RequestedLoadIfMissing({
            args: { revision: 2 },
          }),
        ),
        Story.Command.resolve(
          DefaultKeyedHost.Fetch,
          DefaultKeyedHost.Message.CompletedFetch({
            args: { revision: 2 },
            requestKey: modeKey({ revision: 2 }),
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(DefaultKeyedHost.read(model, { revision: 2 })).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
      Story.story(
        FalseKeyedHost,
        Story.init(),
        Story.message(
          FalseKeyedHost.Message.RequestedLoadIfMissing({
            args: { revision: 2 },
          }),
        ),
        Story.Command.resolve(
          FalseKeyedHost.Fetch,
          FalseKeyedHost.Message.CompletedFetch({
            args: { revision: 2 },
            requestKey: modeKey({ revision: 2 }),
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(FalseKeyedHost.read(model, { revision: 2 })).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
      Story.story(
        DefaultKeyedAttached,
        Story.init(),
        Story.message(
          DefaultKeyedAttached.Message.RequestedLoadIfMissing({
            args: { revision: 2 },
          }),
        ),
        Story.Command.resolve(
          DefaultKeyedAttached.Fetch,
          DefaultKeyedAttached.Message.CompletedFetch({
            args: { revision: 2 },
            requestKey: modeKey({ revision: 2 }),
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(DefaultKeyedAttached.read(model, { revision: 2 })).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
      Story.story(
        FalseKeyedAttached,
        Story.init(),
        Story.message(
          FalseKeyedAttached.Message.RequestedLoadIfMissing({
            args: { revision: 2 },
          }),
        ),
        Story.Command.resolve(
          FalseKeyedAttached.Fetch,
          FalseKeyedAttached.Message.CompletedFetch({
            args: { revision: 2 },
            requestKey: modeKey({ revision: 2 }),
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(FalseKeyedAttached.read(model, { revision: 2 })).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectNoOutMessage(),
      ),
    ]).pipe(Effect.provide(Query.layer)),
  ))

test('keyed notifying modes emit accepted decoded completion', () =>
  Effect.runPromise(
    Effect.all([
      Story.story(
        NotifyingKeyedHost,
        Story.init(),
        Story.message(
          NotifyingKeyedHost.Message.RequestedLoadIfMissing({
            args: { revision: 2 },
          }),
        ),
        Story.Command.resolve(
          NotifyingKeyedHost.Fetch,
          NotifyingKeyedHost.Message.CompletedFetch({
            args: { revision: 2 },
            requestKey: modeKey({ revision: 2 }),
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(NotifyingKeyedHost.read(model, { revision: 2 })).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectOutMessage(
          NotifyingKeyedHost.OutMessage.CompletedFetch({
            args: { revision: 2 },
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
      ),
      Story.story(
        NotifyingKeyedAttached,
        Story.init(),
        Story.message(
          NotifyingKeyedAttached.Message.RequestedLoadIfMissing({
            args: { revision: 2 },
          }),
        ),
        Story.Command.resolve(
          NotifyingKeyedAttached.Fetch,
          NotifyingKeyedAttached.Message.CompletedFetch({
            args: { revision: 2 },
            requestKey: modeKey({ revision: 2 }),
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
        Story.model(model =>
          expect(NotifyingKeyedAttached.read(model, { revision: 2 })).toEqual(
            AsyncData.Success({ data: 20 }),
          ),
        ),
        Story.expectOutMessage(
          NotifyingKeyedAttached.OutMessage.CompletedFetch({
            args: { revision: 2 },
            generation: 1,
            result: Result.succeed(20),
            completedAtMillis: 10,
          }),
        ),
      ),
    ]).pipe(Effect.provide(Query.layer)),
  ))

test('selected host conveniences keep the original Fetch identity', async () => {
  expect(SelectedHost.Fetch).toBe(DefaultHost.Fetch)
  expect(SelectedKeyedHost.Fetch).toBe(DefaultKeyedHost.Fetch)

  const unkeyed = await Effect.runPromise(
    SelectedHost.run.pipe(
      Effect.provide(
        DefaultHost.toLayer(Effect.succeed(() => Effect.succeed(31))),
      ),
    ),
  )
  const keyed = await Effect.runPromise(
    SelectedKeyedHost.run({ revision: 2 }).pipe(
      Effect.provide(
        DefaultKeyedHost.toLayer(
          Effect.succeed(({ revision }) => Effect.succeed(revision + 30)),
        ),
      ),
    ),
  )

  expect(unkeyed).toEqual(AsyncData.Success({ data: 31 }))
  expect(keyed).toEqual(AsyncData.Success({ data: 32 }))
})

test('canonical provider Layers preserve constructor and invocation services and failures', async () => {
  const run = NotifyingKeyedAttached.run({ revision: 2 }).pipe(
    Effect.provide(NotifyingKeyedAttached.EffectsLayer),
    Effect.provideService(ModeInvocationSource, { multiplier: 4 }),
  )
  const value = await Effect.runPromise(
    run.pipe(
      Effect.provideService(ModeConstructorSource, {
        isFailure: false,
        increment: 3,
      }),
    ),
  )
  const failure = await Effect.runPromise(
    run.pipe(
      Effect.provideService(ModeConstructorSource, {
        isFailure: true,
        increment: 3,
      }),
      Effect.flip,
    ),
  )

  expect(value).toEqual(AsyncData.Success({ data: 11 }))
  expect(failure).toBeInstanceOf(ModeBuildFailure)
})

test('canonical run calls can share one generator constructor through EffectsLayer', async () => {
  const events: Array<string> = []
  const query = Query.define({
    name: 'SharedCanonicalLayerMode',
    data: Schema.Number,
    error: Schema.String,
    handler: function* () {
      yield* Effect.sync(() => events.push('construct'))

      return () => Effect.succeed(9)
    },
  })

  expect(events).toEqual([])

  const results = await Effect.runPromise(
    Effect.all([query.run, query.run]).pipe(Effect.provide(query.EffectsLayer)),
  )

  expect(results).toEqual([
    AsyncData.Success({ data: 9 }),
    AsyncData.Success({ data: 9 }),
  ])
  expect(events).toEqual(['construct'])
})
