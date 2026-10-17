import { Array, Layer, Option, Schema } from 'effect'
import { expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { define } from './define.js'
import { lowerBlock } from './lowering.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const Message = defineMessageUnion({
  Advanced: {},
  CompletedRecordBeforeReplay: {},
  CompletedRecordAfterReplay: {},
})
type Message = typeof Message.Type

const ParentModel = Schema.Struct({
  primary: ChildModel,
  sibling: ChildModel,
})
type ParentModel = typeof ParentModel.Type

const initialModel = ParentModel.make({
  primary: ChildModel.make({ count: 1 }),
  sibling: ChildModel.make({ count: 2 }),
})

const ChildOwner = define('OperationGraphChild')
const Child = ChildOwner.define({ Model: ChildModel, Message })
const resetInvocation = vi.fn()
const reset = Child.step(_model => {
  resetInvocation()

  return { model: ChildModel.make({ count: 0 }) }
})
const ChildComposition = Child.makeComposition()
const ChildBlock = ChildComposition.makeBlock({
  view: ChildComposition.makeView((_model, h) => h.div([])),
  init: () => ({ model: ChildModel.make({ count: 0 }) }),
  update: ChildComposition.makeUpdate(model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  })),
  expose: { reset },
  EffectsLayer: Layer.empty,
})

const omittedParent = define('OperationGraphOmittedParent').define({
  Model: ParentModel,
  Message,
})
const OmittedChildBinding = omittedParent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'omitted-child',
  read: (model: ParentModel) => Option.some(model.primary),
  write: (model, nextChild) =>
    modifyFields(model, { primary: () => nextChild }),
  toParentMessage: (message: Message) => message,
})

const initializeOmittedChild = omittedParent.step(model =>
  OmittedChildBinding.init({
    args: [],
    toParentModel: child => modifyFields(model, { primary: () => child }),
  }),
)
const omittedParentComposition = omittedParent.makeComposition({
  childBindings: [OmittedChildBinding],
})
const OmittedParent = omittedParentComposition.makeBlock({
  view: omittedParentComposition.makeView((_model, h) => h.div([])),
  init: () => ({ model: initialModel }),
  update: model => ({ model }),
  expose: { initializeOmittedChild },
  EffectsLayer: Layer.empty,
})

const unregisteredParentComposition = omittedParent.makeComposition()
const narrowedReset = (model: ParentModel): Readonly<{ model: ParentModel }> =>
  Reflect.apply(OmittedChildBinding.reset(), undefined, [model])
const unregisteredNarrowedReset = Reflect.apply(
  unregisteredParentComposition.makeUpdate,
  undefined,
  [narrowedReset],
)
const registeredNarrowedReset = Reflect.apply(
  omittedParentComposition.makeUpdate,
  undefined,
  [narrowedReset],
)
const unregisteredDiscardedReset = unregisteredParentComposition.makeUpdate(
  model => {
    Reflect.apply(OmittedChildBinding.reset(), undefined, [model])

    return { model }
  },
)

it('runs a completed exposed operation in its registered child graph', () => {
  const recipe = Reflect.apply(initializeOmittedChild, undefined, [
    initialModel,
  ])

  expect(recipe).not.toHaveProperty('model')
  expect(recipe).not.toHaveProperty('commands')

  const initialized = OmittedParent.expose.initializeOmittedChild(initialModel)

  expect(initialized.model.primary.count).toBe(0)
})

it('runs a narrowed bound operation in its registered child graph', () => {
  const result = Reflect.apply(registeredNarrowedReset, undefined, [
    initialModel,
    Message.Advanced(),
  ])

  expect(result).toMatchObject({ model: { primary: { count: 0 } } })
})

it('rejects an unregistered bound operation after its result is narrowed', () => {
  expect(() =>
    Reflect.apply(unregisteredNarrowedReset, undefined, [
      initialModel,
      Message.Advanced(),
    ]),
  ).toThrow(
    'The child binding at placement "omitted-child" is not registered in the current Block graph.',
  )
})

it('does no child work when an erased unregistered result is discarded', () => {
  const previousInvocationCount = resetInvocation.mock.calls.length
  const resetDiscarded = unregisteredDiscardedReset(
    initialModel,
    Message.Advanced(),
  )

  expect(resetDiscarded.model).toBe(initialModel)
  expect(resetInvocation).toHaveBeenCalledTimes(previousInvocationCount)
})

interface DiscardedOperation {
  execute(model: ParentModel): void
}

const discardedOperation: DiscardedOperation = {
  execute: OmittedChildBinding.reset(),
}

it('keeps method-shaped void erasure passive outside its registered graph', () => {
  const previousInvocationCount = resetInvocation.mock.calls.length

  discardedOperation.execute(initialModel)

  expect(resetInvocation).toHaveBeenCalledTimes(previousInvocationCount)
})

it('keeps a callback holding a scoped Model passive after its graph returns', () => {
  const callbacks: Array<() => void> = []
  const captureReset = omittedParentComposition.makeUpdate(model => {
    callbacks.push(() => {
      OmittedChildBinding.reset()(model)
    })

    return { model }
  })
  const previousInvocationCount = resetInvocation.mock.calls.length

  captureReset(initialModel, Message.Advanced())
  Option.getOrThrow(Array.head(callbacks))()

  expect(resetInvocation).toHaveBeenCalledTimes(previousInvocationCount)
})

it('prevents a pending operation from acquiring Model fields or a prototype', () => {
  const recipe = Reflect.apply(OmittedChildBinding.reset(), undefined, [
    initialModel,
  ])

  expect(Object.isFrozen(recipe)).toBe(true)
  expect(Object.getPrototypeOf(recipe)).toBe(null)
  expect(Reflect.set(recipe, 'model', initialModel)).toBe(false)
  expect(Reflect.setPrototypeOf(recipe, { model: initialModel })).toBe(false)
})

const readAllWrongPlacement = vi.fn((model: ParentModel) => [model.primary])
const readWrongPlacement = vi.fn((child: ChildModel) => child)
const writeWrongPlacement = vi.fn((model: ParentModel, nextChild: ChildModel) =>
  modifyFields(model, { primary: () => nextChild }),
)
const exactParentBase = define('OperationGraphExactParent').define({
  Model: ParentModel,
  Message,
})
const RegisteredPlacementBinding = exactParentBase.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'same-placement',
  readAll: (model: ParentModel) => [model.primary],
  key: () => 'only',
  read: (child: ChildModel) => child,
  writeAt: (model, _key, nextChild) =>
    modifyFields(model, { primary: () => nextChild }),
  toParentMessage: (_key, message: Message) => message,
})
const WrongPlacementBinding = exactParentBase.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'same-placement',
  readAll: readAllWrongPlacement,
  key: () => 'only',
  read: readWrongPlacement,
  writeAt: (model, _key, nextChild) => writeWrongPlacement(model, nextChild),
  toParentMessage: (_key, message: Message) => message,
})

const exactParentComposition = exactParentBase.makeComposition({
  childBindings: [RegisteredPlacementBinding],
})
const initializeWrongPlacement = exactParentBase.step(model =>
  WrongPlacementBinding.init({
    key: 'only',
    args: [],
    toParentModel: child => modifyFields(model, { primary: () => child }),
  }),
)
const ExactParent = exactParentComposition.makeBlock({
  view: exactParentComposition.makeView((_model, h) => h.div([])),
  init: () => ({ model: initialModel }),
  update: exactParentComposition.makeUpdate((model, message) =>
    WrongPlacementBinding.fold(model, 'only', message),
  ),
  expose: { initializeWrongPlacement },
  EffectsLayer: Layer.empty,
})

it('checks exact binding identity before reading or writing the parent Model', () => {
  const lowered = lowerBlock(ExactParent)

  expect(() => lowered.update(initialModel, Message.Advanced())).toThrow(
    'The child binding at placement "same-placement" is not registered in the current Block graph.',
  )
  expect(readAllWrongPlacement).not.toHaveBeenCalled()
  expect(readWrongPlacement).not.toHaveBeenCalled()
  expect(writeWrongPlacement).not.toHaveBeenCalled()
})

it('keeps foreign Bindings out of completed exposed operations', () => {
  expect(() =>
    ExactParent.expose.initializeWrongPlacement(initialModel),
  ).toThrow(
    'The child binding at placement "same-placement" is not registered in the current Block graph.',
  )
})

const PendingEntry = Schema.Struct({
  id: Schema.String,
  child: ChildModel,
})
const PendingParentModel = Schema.Struct({
  entries: Schema.Array(PendingEntry),
  status: Schema.String,
})
const PendingParent = define('PendingParent', {
  Model: PendingParentModel,
  Message,
})
const PendingChildBinding = PendingParent.bindChild(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  fromParentMessage: false,
  toParentMessage: (_id, message) => message,
})
const PendingParentComposition = PendingParent.makeComposition({
  childBindings: [PendingChildBinding],
})
const capturedPendingModel = PendingParentModel.make({
  entries: [
    PendingEntry.make({
      id: 'only',
      child: ChildModel.make({ count: 1 }),
    }),
  ],
  status: 'Captured',
})
const pendingRegisteredKeyedReset = Reflect.apply(
  PendingChildBinding.reset('only'),
  undefined,
  [capturedPendingModel],
)
const returnPendingRegisteredKeyedReset = Reflect.apply(
  PendingParentComposition.makeUpdate,
  undefined,
  [() => pendingRegisteredKeyedReset],
)

it('resolves a pending keyed operation against the active Model after its key is removed', () => {
  const modelWithoutKey = modifyFields(capturedPendingModel, {
    entries: () => [],
    status: () => 'Active',
  })
  const previousInvocationCount = resetInvocation.mock.calls.length

  const result = returnPendingRegisteredKeyedReset(
    modelWithoutKey,
    Message.Advanced(),
  )

  expect(result.model).toBe(modelWithoutKey)
  expect(result.model.status).toBe('Active')
  expect(resetInvocation).toHaveBeenCalledTimes(previousInvocationCount)
})

const RecordBeforeReplay = PendingParent.command('RecordBeforeReplay', {
  messages: [Message.CompletedRecordBeforeReplay],
})
const RecordAfterReplay = PendingParent.command('RecordAfterReplay', {
  messages: [Message.CompletedRecordAfterReplay],
})

it('replays a deferred combined operation from the active Model without restoring removed keys', () => {
  const pending = Reflect.apply(Update.combine, undefined, [
    capturedPendingModel,
    [
      (model: typeof PendingParentModel.Type) => ({
        model: modifyFields(model, { status: status => `${status}/Before` }),
        commands: [RecordBeforeReplay()],
      }),
      () => pendingRegisteredKeyedReset,
      (model: typeof PendingParentModel.Type) => ({
        model: modifyFields(model, { status: status => `${status}/After` }),
        commands: [RecordAfterReplay()],
      }),
    ],
  ])
  const replay = Reflect.apply(PendingParentComposition.makeUpdate, undefined, [
    () => pending,
  ])
  const modelWithoutKey = modifyFields(capturedPendingModel, {
    entries: () => [],
    status: () => 'Active',
  })
  const previousInvocationCount = resetInvocation.mock.calls.length

  const result = replay(modelWithoutKey, Message.Advanced())

  expect(result.model.entries).toEqual([])
  expect(result.model.status).toBe('Active/Before/After')
  expect(result.commands).toMatchObject([
    { name: 'PendingParent/RecordBeforeReplay' },
    { name: 'PendingParent/RecordAfterReplay' },
  ])
  expect(resetInvocation).toHaveBeenCalledTimes(previousInvocationCount)
})

const PolicyOutMessage = defineMessageUnion({ RequestedSiblingReset: {} })
type PolicyOutMessage = typeof PolicyOutMessage.Type

const PolicyOwner = define('OperationGraphPolicyChild')
const policy = PolicyOwner.define({
  Model: ChildModel,
  Message,
  OutMessage: PolicyOutMessage,
})
const policyComposition = policy.makeComposition()
const PolicyChild = policyComposition.makeBlock({
  view: policyComposition.makeView((_model, h) => h.div([])),
  init: () => ({ model: ChildModel.make({ count: 0 }) }),
  update: model => ({
    model,
    outMessage: PolicyOutMessage.RequestedSiblingReset(),
  }),
  EffectsLayer: Layer.empty,
})

const policyParentBase = define('OperationGraphPolicyParent').define({
  Model: ParentModel,
  Message,
})
const SiblingChildBinding = policyParentBase.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'sibling-child',
  read: (model: ParentModel) => Option.some(model.sibling),
  write: (model, nextChild) =>
    modifyFields(model, { sibling: () => nextChild }),
  toParentMessage: (message: Message) => message,
})
const PolicyChildBinding = policyParentBase.bindChild(PolicyChild, {
  fromParentMessage: false,
  placement: 'policy-child',
  read: (model: ParentModel) => Option.some(model.primary),
  write: (model, nextChild) =>
    modifyFields(model, { primary: () => nextChild }),
  toParentMessage: (message: Message) => message,
  outMessage: {
    fold: (_outMessage: PolicyOutMessage) => SiblingChildBinding.reset(),
  },
})

const policyParentComposition = policyParentBase.makeComposition({
  childBindings: [PolicyChildBinding, SiblingChildBinding],
})
const PolicyParent = policyParentComposition.makeBlock({
  view: policyParentComposition.makeView((_model, h) => h.div([])),
  init: () => ({ model: initialModel }),
  update: policyParentComposition.makeUpdate((model, message) =>
    PolicyChildBinding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

it('restores the parent graph before folding a child OutMessage', () => {
  const lowered = lowerBlock(PolicyParent)

  const result = lowered.update(initialModel, Message.Advanced())

  expect(result.model.sibling.count).toBe(0)
})
