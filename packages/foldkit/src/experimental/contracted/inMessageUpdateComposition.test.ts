import { Context, Effect, Predicate, Schema } from 'effect'
import assert from 'node:assert/strict'

import { it } from '@effect/vitest'

import { makeCompositionInputUpdate } from '../../block/delivery.js'
import * as Block from '../../block/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'
import * as Story from '../../story/public.js'
import { modifyFields } from '../../struct/index.js'

const EditorKey = Symbol('InputEditor')
const EditorModel = Schema.Struct({ text: Schema.String })
const EditorMessage = defineMessageUnion({
  UpdatedText: { text: Schema.String },
})
const EditorInMessage = defineInMessageUnion({
  InformedOfTextChange: { text: Schema.String },
})
const EditorOutMessage = defineMessageUnion({ Edited: {} })
const EditorDefinition = Block.makeDefinition('InputEditor', {
  key: EditorKey,
  Model: EditorModel,
  Message: EditorMessage,
  InMessage: EditorInMessage,
  OutMessage: EditorOutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    InformedOfTextChange: { outMessage: EditorOutMessage.Edited },
  },
})
const EditorComposition = EditorDefinition.makeComposition()
const EditorBlock = EditorDefinition.contract
const editorLayer = EditorDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: EditorComposition.makeInit(() => ({
      model: EditorModel.make({ text: '' }),
    })),
    update: EditorComposition.makeUpdate({
      UpdatedText: (model, { text }) => ({
        model: modifyFields(model, { text: () => text }),
        outMessage: EditorOutMessage.Edited(),
      }),
    }),
    inMessageUpdate: EditorComposition.makeInMessageUpdate({
      InformedOfTextChange: (model, { text }) => ({
        model: modifyFields(model, { text: () => text }),
        outMessage: EditorOutMessage.Edited(),
      }),
    }),
  }),
).layer
class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{
    save: (text: string) => Effect.Effect<void>
  }>
>()('InputDraftStore') {}
const Model = Schema.Struct({
  editor: EditorBlock.Model,
  count: Schema.Number,
  snapshots: Schema.Array(Schema.Number),
  seen: Schema.Array(Schema.String),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ClickedIncrement: {},
  SubmittedForm: { text: Schema.String },
  CompletedSaveDraft: {},
})
const InMessage = defineInMessageUnion({
  RequestedSet: { value: Schema.Number },
  RequestedSubmit: { text: Schema.String },
  RequestedSave: { text: Schema.String },
})
const OutMessage = defineMessageUnion({
  Submitted: { text: Schema.String },
})
const ApplicationKey = Symbol('InputApplication')
const ApplicationDefinition = Block.makeDefinition('InputApplication', {
  key: ApplicationKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
  effects: { services: [DraftStore] },
  inMessageOutputs: { RequestedSubmit: { outMessage: OutMessage.Submitted } },
})
const { makeFieldsStep, makeCommandsStep, makeOutMessageStep, makeNoopStep } =
  ApplicationDefinition
const SaveDraft = ApplicationDefinition.makeCommand('SaveDraft', {
  args: { text: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    const store = yield* DraftStore

    return ({ text }) =>
      store.save(text).pipe(Effect.as(Message.CompletedSaveDraft()))
  },
})
const EditorBinding = ApplicationDefinition.makeRequiredFieldBinding(
  EditorBlock,
  {
    field: 'editor',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(EditorBlock, {
    Edited: () => makeFieldsStep(() => ({ count: count => count + 1 })),
  }),
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EditorBinding],
})
const { makeInMessageUpdate } = ApplicationComposition
const increment = makeFieldsStep(() => ({ count: count => count + 1 }))
const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: increment,
  SubmittedForm: makeCommandsStep.fromMessage(input => [
    SaveDraft({ text: input.text }),
  ]),
  CompletedSaveDraft: makeNoopStep(),
})
const base = makeInMessageUpdate({
  RequestedSet: makeFieldsStep((model, input) => ({
    count: () => model.count + input.value,
  })),
  RequestedSubmit: makeOutMessageStep.fromMessage(input =>
    OutMessage.Submitted({ text: input.text }),
  ),
  RequestedSave: makeCommandsStep.fromMessage(input => [
    SaveDraft({ text: input.text }),
  ]),
})
const focused = makeInMessageUpdate.compose(
  makeInMessageUpdate.each((model, _input, { before }) => ({
    model: modifyFields(model, {
      snapshots: snapshots => [...snapshots, before.count],
      seen: seen => [...seen, 'each'],
    }),
  })),
  makeInMessageUpdate.on(['RequestedSet'])((_model, input) =>
    makeFieldsStep(() => ({ seen: seen => [...seen, `set:${input.value}`] })),
  ),
  makeInMessageUpdate.except(['RequestedSubmit'])(() => increment),
)
const inMessageUpdate = makeInMessageUpdate.compose(
  focused,
  makeInMessageUpdate.compose(
    base,
    makeInMessageUpdate.cases({
      RequestedSet: EditorBinding.informOfTextChange({ text: 'connected' }),
    }),
  ),
  makeInMessageUpdate.each((model, _input, { before }) => ({
    model: modifyFields(model, {
      snapshots: snapshots => [...snapshots, before.count],
      seen: seen => [...seen, 'after'],
    }),
  })),
)
const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const editor = yield* EditorBinding

    return {
      children: [editor],
      init: ApplicationComposition.makeInit(() => ({
        model: { count: 0, snapshots: [], seen: [] },
      })),
      update,
      inMessageUpdate,
      EffectsLayer: SaveDraft.layer,
    }
  }),
).provide(editorLayer)
const ContextKey = Symbol('InputContexts')
const ContextModel = Schema.Struct({
  value: Schema.Number,
  before: Schema.Array(Schema.Number),
})
const ContextMessage = defineMessageUnion({
  UpdatedValue: { value: Schema.Number },
})
const ContextInMessage = defineInMessageUnion({
  RequestedValue: { value: Schema.Number },
})
const ContextDefinition = Block.makeDefinition('InputContexts', {
  key: ContextKey,
  Model: ContextModel,
  Message: ContextMessage,
  InMessage: ContextInMessage,
  InitArgs: Schema.Tuple([]),
  Context: Schema.Tuple([Schema.Number]),
  InMessageContext:
    Block.makeInputContract<
      readonly [label?: string, ...parts: ReadonlyArray<string>]
    >(),
})
const ContextComposition = ContextDefinition.makeComposition()
const contextBase = ContextComposition.makeInMessageUpdate.withContext(
  (label = 'Default', ...parts: ReadonlyArray<string>) => ({
    RequestedValue: (model, { value }) => ({
      model: modifyFields(model, {
        value: () => value + label.length + parts.length,
      }),
    }),
  }),
)
const inputBundle = ContextComposition.makeInMessageUpdate.compose(
  ContextComposition.makeInMessageUpdate.cases.withContext(
    (label = 'Default', ...parts: ReadonlyArray<string>) => ({
      RequestedValue: model => ({
        model: modifyFields(model, {
          value: value => value + label.length + parts.length,
        }),
      }),
    }),
  ),
  ContextComposition.makeInMessageUpdate.each((model, _input, { before }) => ({
    model: modifyFields(model, { before: values => [...values, before.value] }),
  })),
)
const ContextBlock = ContextDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: ContextComposition.makeInit(() => ({
      model: ContextModel.make({ value: 0, before: [] }),
    })),
    update: ContextComposition.makeUpdate.withContext((multiplier: number) => ({
      UpdatedValue: (model, { value }) => ({
        model: modifyFields(model, { value: () => value * multiplier }),
      }),
    })),
    inMessageUpdate: ContextComposition.makeInMessageUpdate.compose(
      contextBase,
      inputBundle,
    ),
  }),
)
it.effect(
  'input stages share original snapshot, evolve current Model and resolve connected folds',
  () =>
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
)
it.effect(
  'input output remains exact and local Command resolution stays on update',
  () =>
    Story.story(
      ApplicationBlock,
      Story.init(),
      Story.inMessage(InMessage.RequestedSubmit({ text: 'ready' })),
      Story.expectOutMessage(OutMessage.Submitted({ text: 'ready' })),
      Story.inMessage(InMessage.RequestedSave({ text: 'save me' })),
      Story.Command.expectExact(SaveDraft({ text: 'save me' })),
      Story.Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
    ).pipe(Effect.provide(ApplicationBlock.layer)),
)
it.effect(
  'independent optional/default/rest input Context survives grouping and direct/curried calls',
  () =>
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
)
it.effect(
  'malformed input is rejected before every shared or record callback',
  () =>
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
)
it('the shared composer refuses forged, foreign, incomplete and duplicate anchors', () => {
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
it('erased shared and competing record OutMessages still reject at execution', () => {
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
it('input bundles and contextual cases stay passive until an admitted dispatch', () => {
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
