import { Effect, Predicate } from 'effect'
import * as Story from 'foldkit/story'
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ApplicationBlock } from './block.js'
import {
  ContextBlock,
  InMessage as ContextInMessage,
  Message as ContextMessage,
} from './context.js'
import {
  ApplicationDefinition,
  InMessage,
  Message,
  OutMessage,
  SaveDraft,
} from './definition.js'

test('input stages share original snapshot, evolve current Model and resolve connected folds', () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const app = yield* ApplicationBlock.get
        const initial = app.init().model
        const result = app.inMessageUpdate(
          initial,
          InMessage.RequestedSet({ value: 2 }),
        )
        assert.equal(result.model.count, 4)
        assert.equal(result.model.editor.text, 'connected')
        assert.deepEqual(result.model.snapshots, [0, 0])
        assert.deepEqual(result.model.seen, ['each', 'set:2', 'after'])
        const curried = app.inMessageUpdate(
          InMessage.RequestedSet({ value: 2 }),
        )(initial)
        assert.deepEqual(curried.model, result.model)
        assert.equal(
          app.update(initial, Message.ClickedIncrement()).model.count,
          1,
        )
      }),
    ).pipe(Effect.provide(ApplicationBlock.layer)),
  ))

test('input output remains exact and local Command resolution stays on update', () =>
  Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.init(),
      Story.inMessage(InMessage.RequestedSubmit({ text: 'ready' })),
      Story.expectOutMessage(OutMessage.Submitted({ text: 'ready' })),
      Story.inMessage(InMessage.RequestedSave({ text: 'save me' })),
      Story.Command.expectExact(SaveDraft({ text: 'save me' })),
      Story.Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
    ).pipe(Effect.provide(ApplicationBlock.layer)),
  ))

test('independent optional/default/rest input Context survives grouping and direct/curried calls', () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const app = yield* ContextBlock.get
        const initial = app.init().model
        const input = ContextInMessage.RequestedValue({ value: 1 })
        assert.equal(app.inMessageUpdate(initial, input).model.value, 15)
        assert.equal(app.inMessageUpdate(input)(initial).model.value, 15)
        assert.equal(
          app.inMessageUpdate(initial, input, 'Remote', 'A', 'B').model.value,
          17,
        )
        assert.equal(
          app.inMessageUpdate(input)(initial, 'Remote', 'A', 'B').model.value,
          17,
        )
        assert.deepEqual(app.inMessageUpdate(initial, input).model.before, [0])
        assert.equal(
          app.update(initial, ContextMessage.UpdatedValue({ value: 2 }), 3)
            .model.value,
          6,
        )
      }),
    ).pipe(Effect.provide(ContextBlock.layer)),
  ))

test('malformed input is rejected before every shared or record callback', () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const app = yield* ApplicationBlock.get
        const model = app.init().model
        assert.throws(
          () =>
            Reflect.apply(app.inMessageUpdate, undefined, [
              model,
              { _tag: 'RequestedSet', value: 'invalid' },
            ]),
          /decoded value/,
        )
        assert.throws(
          () =>
            Reflect.apply(app.inMessageUpdate, undefined, [
              model,
              Message.ClickedIncrement(),
            ]),
          /decoded value/,
        )
        assert.equal(model.count, 0)
        assert.deepEqual(model.snapshots, [])
        assert.equal(app.owner, ApplicationDefinition.contract.owner)
      }),
    ).pipe(Effect.provide(ApplicationBlock.layer)),
  ))

test('the shared composer refuses forged, foreign, incomplete and duplicate anchors', async () => {
  const { makeCompositionInputUpdate } =
    await import('../../../packages/foldkit/dist/block/delivery.js')
  const make = makeCompositionInputUpdate(InMessage, [], new Map())
  const other = makeCompositionInputUpdate(InMessage, [], new Map())
  const cases = {
    RequestedSet: (model: unknown) => ({ model }),
    RequestedSubmit: (model: unknown) => ({ model }),
    RequestedSave: (model: unknown) => ({ model }),
  }
  const base = make(cases)
  const compose = Reflect.get(make, 'compose')
  const each = Reflect.get(make, 'each')
  const bundle = Reflect.apply(compose, make, [
    Reflect.apply(each, make, [(model: unknown) => ({ model })]),
  ])
  assert.ok(Predicate.isFunction(bundle))
  assert.throws(
    () => Reflect.apply(make.complete, make, [bundle]),
    /before completion/,
  )
  assert.throws(() => Reflect.apply(compose, make, [base, base]), /exactly one/)
  assert.throws(() => Reflect.apply(compose, make, [other(cases)]), /belong/)
  assert.throws(
    () => Reflect.apply(compose, make, [() => ({ model: {} })]),
    /belong/,
  )
})

test('erased shared and competing record OutMessages still reject at execution', async () => {
  const { makeCompositionInputUpdate } =
    await import('../../../packages/foldkit/dist/block/delivery.js')
  const make = makeCompositionInputUpdate(InMessage, [], new Map())
  const out = OutMessage.Submitted({ text: 'first' })
  const base = make({
    RequestedSet: (model: unknown) => ({ model }),
    RequestedSubmit: (model: unknown) => ({ model, outMessage: out }),
    RequestedSave: (model: unknown) => ({ model }),
  })
  const compose = Reflect.get(make, 'compose')
  const shared = Reflect.apply(Reflect.get(make, 'each'), make, [
    (model: unknown) => ({ model, outMessage: out }),
  ])
  const sharedUpdate = Reflect.apply(compose, make, [base, shared])
  assert.ok(Predicate.isFunction(sharedUpdate))
  assert.throws(
    () => sharedUpdate({}, InMessage.RequestedSet({ value: 1 })),
    /cannot emit/,
  )
  const competitor = Reflect.apply(Reflect.get(make, 'cases'), make, [
    { RequestedSubmit: (model: unknown) => ({ model, outMessage: out }) },
  ])
  const competingUpdate = Reflect.apply(compose, make, [base, competitor])
  assert.ok(Predicate.isFunction(competingUpdate))
  assert.throws(
    () => competingUpdate({}, InMessage.RequestedSubmit({ text: '' })),
    /competing OutMessages/,
  )
})

test('input bundles and contextual cases stay passive until an admitted dispatch', async () => {
  const { makeCompositionInputUpdate } =
    await import('../../../packages/foldkit/dist/block/delivery.js')
  const make = makeCompositionInputUpdate(InMessage, [], new Map())
  const runs = { factory: 0, shared: 0 }
  const base = make({
    RequestedSet: (model: unknown) => ({ model }),
    RequestedSubmit: (model: unknown) => ({ model }),
    RequestedSave: (model: unknown) => ({ model }),
  })
  const cases = Reflect.get(make, 'cases')
  const focused = Reflect.apply(Reflect.get(cases, 'withContext'), cases, [
    () => {
      runs.factory += 1
      return { RequestedSet: (model: unknown) => ({ model }) }
    },
  ])
  const shared = Reflect.apply(Reflect.get(make, 'each'), make, [
    (model: unknown) => {
      runs.shared += 1
      return { model }
    },
  ])
  const composed = Reflect.apply(Reflect.get(make, 'compose'), make, [
    focused,
    base,
    shared,
  ])
  const complete = Reflect.apply(make.complete, make, [composed])
  assert.ok(Predicate.isFunction(complete))
  assert.deepEqual(runs, { factory: 0, shared: 0 })
  assert.throws(
    () => complete({}, { _tag: 'RequestedSet', value: 'invalid' }),
    /decoded value/,
  )
  assert.deepEqual(runs, { factory: 0, shared: 0 })
  complete({}, InMessage.RequestedSet({ value: 1 }))
  assert.deepEqual(runs, { factory: 1, shared: 1 })
})
