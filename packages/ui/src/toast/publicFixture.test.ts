import { Array, Cause, Effect, Exit, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import * as Toast from './index.js'

const FirstPayload = Schema.Struct({ body: Schema.String })
type FirstPayload = typeof FirstPayload.Type
const SecondPayload = Schema.Struct({ count: Schema.Number })
type SecondPayload = typeof SecondPayload.Type

const FirstToast = Toast.make(FirstPayload)
const FirstToastLive = FirstToast.pipe(Layer.provide(Animation.AnimationLive))
const SecondToast = Toast.make(SecondPayload)
const SecondToastLive = SecondToast.pipe(Layer.provide(Animation.AnimationLive))

class ToastFixtureParent extends Block<ToastFixtureParent>()(
  'ToastFixtureParent',
  {
    Model: Schema.Struct({
      left: FirstToast,
      right: FirstToast,
      other: SecondToast,
    }),
    Message: defineMessageUnion({ RequestedShowAll: {} }),
  },
) {}

const ToastFixtureParentLive = ToastFixtureParent.toLayer(() => ({
  init: () => ({
    left: new FirstToast('left', { id: 'toast' }),
    right: new FirstToast('right', { id: 'toast' }),
    other: new SecondToast('other', { id: 'toast' }),
  }),
  update: {
    RequestedShowAll: model => ({
      model,
      messages: [
        model.left.send(
          FirstToast.requestShow({
            payload: { body: 'Left' },
            duration: 100,
          }),
        ),
        model.right.send(
          FirstToast.requestShow({
            payload: { body: 'Right' },
            duration: 200,
          }),
        ),
        model.other.send(
          SecondToast.requestShow({
            payload: { count: 3 },
            duration: 300,
          }),
        ),
      ],
    }),
  },
})).pipe(Layer.provide(Layer.mergeAll(FirstToastLive, SecondToastLive)))

class KeyedToastFixtureParent extends Block<KeyedToastFixtureParent>()(
  'KeyedToastFixtureParent',
  {
    Model: Schema.Struct({ slots: Schema.Array(FirstToast) }),
    Message: defineMessageUnion({ RequestedShow: {}, RemovedSlots: {} }),
  },
) {}

const KeyedToastFixtureParentLive = KeyedToastFixtureParent.toLayer(() => ({
  init: () => ({ slots: [new FirstToast('selected', { id: 'toast' })] }),
  update: {
    RequestedShow: model => ({
      model,
      messages: Array.map(model.slots, toast =>
        toast.send(
          FirstToast.requestShow({
            payload: { body: 'Keyed' },
            duration: 100,
          }),
        ),
      ),
    }),
    RemovedSlots: () => ({ model: { slots: [] } }),
  },
})).pipe(Layer.provide(FirstToastLive))

const failureOf = <A, E>(exit: Exit.Exit<A, E>): string =>
  Exit.isFailure(exit) ? Cause.pretty(exit.cause) : ''

describe('Toast.test.drainEntry', () => {
  it.effect(
    'selects one Toast instance across repeated placements and factories',
    () =>
      Story.story(
        ToastFixtureParentLive,
        Story.message(ToastFixtureParent.Message.RequestedShowAll()),
        FirstToast.test.drainEntry({ path: 'right', entryId: 'toast-entry-0' }),
        Story.model(model => {
          expect(model.left.entries).toHaveLength(1)
          expect(model.right.entries).toHaveLength(0)
          expect(model.other.entries).toHaveLength(1)
        }),
        SecondToast.test.drainEntry({
          path: 'other',
          entryId: 'toast-entry-0',
        }),
        Story.model(model => {
          expect(model.left.entries).toHaveLength(1)
          expect(model.other.entries).toHaveLength(0)
        }),
        FirstToast.test.drainEntry({ path: 'left', entryId: 'toast-entry-0' }),
        Story.Command.expectNone(),
      ),
  )

  it.effect('does not select a stale timer version', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        Story.story(
          ToastFixtureParentLive,
          Story.message(ToastFixtureParent.Message.RequestedShowAll()),
          FirstToast.test.drainEntry({
            path: 'left',
            entryId: 'toast-entry-0',
            version: 1,
          }),
        ),
      )

      expect(failureOf(exit)).toContain(
        'could not find the fresh auto-dismiss timer',
      )
    }),
  )

  it.effect('selects a keyed Toast instance', () =>
    Story.story(
      KeyedToastFixtureParentLive,
      Story.message(KeyedToastFixtureParent.Message.RequestedShow()),
      FirstToast.test.drainEntry({
        path: 'selected',
        entryId: 'toast-entry-0',
      }),
      Story.model(model => {
        expect(model.slots).toHaveLength(1)
        expect(Option.getOrThrow(Array.head(model.slots)).entries).toHaveLength(
          0,
        )
      }),
      Story.Command.expectNone(),
    ),
  )

  it.effect('rejects a removed Toast even when its Commands are pending', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        Story.story(
          KeyedToastFixtureParentLive,
          Story.message(KeyedToastFixtureParent.Message.RequestedShow()),
          Story.message(KeyedToastFixtureParent.Message.RemovedSlots()),
          FirstToast.test.drainEntry({
            path: 'selected',
            entryId: 'toast-entry-0',
          }),
        ),
      )

      expect(failureOf(exit)).toContain('could not find')
    }),
  )
})
