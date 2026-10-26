import { Array, Layer, Option, Schema, Tuple } from 'effect'
import { expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { makeDefinition, makeNamespace } from './define.js'
import { lowerBlock } from './lowering.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const Message = defineMessageUnion({
  RequestedReset: {},
  Advanced: {},
  CompletedRecordBeforeReplay: {},
  CompletedRecordAfterReplay: {},
})
const ParentMessage = defineMessageUnion({
  Advanced: {},
  CompletedRecordBeforeReplay: {},
  CompletedRecordAfterReplay: {},
  RequestedInitializeChild: {},
})

const ParentModel = Schema.Struct({
  primary: ChildModel,
  sibling: ChildModel,
})
type ParentModel = typeof ParentModel.Type

const initialModel = ParentModel.make({
  primary: ChildModel.make({ count: 1 }),
  sibling: ChildModel.make({ count: 2 }),
})

const ChildNamespace = makeNamespace('OperationGraphChild')
const ChildDefinition = ChildNamespace.makeDefinition({
  Model: ChildModel,
  Message,
})
const resetInvocation = vi.fn()
const resetStep = ChildDefinition.makeStep(_model => {
  resetInvocation()

  return { model: ChildModel.make({ count: 0 }) }
})
const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    view: ChildComposition.makeView((_model, h) => h.div([])),
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: ChildComposition.makeUpdate({
      RequestedReset: model => resetStep(model),
      Advanced: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
      }),
      CompletedRecordBeforeReplay: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
      }),
      CompletedRecordAfterReplay: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
      }),
    }),
    operations: { reset: () => Tuple.make(Message.RequestedReset()) },
    EffectsLayer: Layer.empty,
  })
const ChildBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const OmittedParentDefinition = makeNamespace(
  'OperationGraphOmittedParent',
).makeDefinition({
  Model: ParentModel,
  Message: ParentMessage,
})
const OmittedChildBinding = OmittedParentDefinition.makeBinding(ChildBlock, {
  placement: 'omitted-child',
  read: (model: ParentModel) => Option.some(model.primary),
  write: (model, nextChild) =>
    modifyFields(model, { primary: () => nextChild }),
})

const initializeOmittedChildStep = OmittedParentDefinition.makeStep(model =>
  OmittedChildBinding.init({
    args: [],
    toParentModel: child => modifyFields(model, { primary: () => child }),
  }),
)
const omittedParentComposition = OmittedParentDefinition.makeComposition({
  bindings: [OmittedChildBinding],
})
const prepareOmittedParent = () =>
  omittedParentComposition.prepareBlock({
    view: omittedParentComposition.makeView((_model, h) => h.div([])),
    init: () => ({ model: initialModel }),
    update: omittedParentComposition.makeUpdate({
      RequestedInitializeChild: model => initializeOmittedChildStep(model),
      Advanced: model => OmittedParentDefinition.makeNoopStep()(model),
      CompletedRecordBeforeReplay: model =>
        OmittedParentDefinition.makeNoopStep()(model),
      CompletedRecordAfterReplay: model =>
        OmittedParentDefinition.makeNoopStep()(model),
    }),
    operations: {
      initializeOmittedChild: () =>
        Tuple.make(ParentMessage.RequestedInitializeChild()),
    },
    EffectsLayer: Layer.empty,
  })
const OmittedParent: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareOmittedParent
> = Block.assemble(prepareOmittedParent)

const ForeignOmittedChildBinding = OmittedParentDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'foreign-child',
    read: (model: ParentModel) => Option.some(model.primary),
    write: (model, nextChild) =>
      modifyFields(model, { primary: () => nextChild }),
  },
)
const unregisteredParentComposition = OmittedParentDefinition.makeComposition({
  bindings: [ForeignOmittedChildBinding],
})
const narrowedReset = (model: ParentModel): Readonly<{ model: ParentModel }> =>
  Reflect.apply(OmittedChildBinding.reset(), undefined, [model])
const unregisteredNarrowedReset = Reflect.apply(
  unregisteredParentComposition.makeUpdate,
  undefined,
  [
    {
      Advanced: narrowedReset,
      CompletedRecordBeforeReplay: narrowedReset,
      CompletedRecordAfterReplay: narrowedReset,
      RequestedInitializeChild: narrowedReset,
    },
  ],
)
const registeredNarrowedReset = Reflect.apply(
  omittedParentComposition.makeUpdate,
  undefined,
  [
    {
      Advanced: narrowedReset,
      CompletedRecordBeforeReplay: narrowedReset,
      CompletedRecordAfterReplay: narrowedReset,
      RequestedInitializeChild: narrowedReset,
    },
  ],
)
const unregisteredDiscardedReset = unregisteredParentComposition.makeUpdate({
  Advanced: model => {
    Reflect.apply(OmittedChildBinding.reset(), undefined, [model])
    return { model }
  },
  CompletedRecordBeforeReplay: model => {
    Reflect.apply(OmittedChildBinding.reset(), undefined, [model])
    return { model }
  },
  CompletedRecordAfterReplay: model => {
    Reflect.apply(OmittedChildBinding.reset(), undefined, [model])
    return { model }
  },
  RequestedInitializeChild: model => {
    Reflect.apply(OmittedChildBinding.reset(), undefined, [model])
    return { model }
  },
})

it('runs a completed exposed operation in its registered child graph', () => {
  const recipe = Reflect.apply(initializeOmittedChildStep, undefined, [
    initialModel,
  ])

  expect(recipe).not.toHaveProperty('model')
  expect(recipe).not.toHaveProperty('commands')

  const initialized =
    OmittedParent.operations.initializeOmittedChild(initialModel)

  expect(initialized.model.primary.count).toBe(0)
})

it('runs a narrowed bound operation in its registered child graph', () => {
  const result = Reflect.apply(registeredNarrowedReset, undefined, [
    initialModel,
    ParentMessage.Advanced(),
  ])

  expect(result).toMatchObject({ model: { primary: { count: 0 } } })
})

it('rejects an unregistered bound operation after its result is narrowed', () => {
  expect(() =>
    Reflect.apply(unregisteredNarrowedReset, undefined, [
      initialModel,
      ParentMessage.Advanced(),
    ]),
  ).toThrow(
    'The child binding at placement "omitted-child" is not registered in the current Block graph.',
  )
})

it('does no child work when an erased unregistered result is discarded', () => {
  const previousInvocationCount = resetInvocation.mock.calls.length
  const resetDiscarded = unregisteredDiscardedReset(
    initialModel,
    ParentMessage.Advanced(),
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
  const captureReset = omittedParentComposition.makeUpdate({
    Advanced: model => {
      callbacks.push(() => {
        OmittedChildBinding.reset()(model)
      })
      return { model }
    },
    CompletedRecordBeforeReplay: model => {
      callbacks.push(() => {
        OmittedChildBinding.reset()(model)
      })
      return { model }
    },
    CompletedRecordAfterReplay: model => {
      callbacks.push(() => {
        OmittedChildBinding.reset()(model)
      })
      return { model }
    },
    RequestedInitializeChild: model => {
      callbacks.push(() => {
        OmittedChildBinding.reset()(model)
      })
      return { model }
    },
  })
  const previousInvocationCount = resetInvocation.mock.calls.length

  captureReset(initialModel, ParentMessage.Advanced())
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
const ExactParentBaseDefinition = makeNamespace(
  'OperationGraphExactParent',
).makeDefinition({
  Model: ParentModel,
  Message: ParentMessage,
})
const RegisteredPlacementBinding = ExactParentBaseDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'same-placement',
    readAll: (model: ParentModel) => [model.primary],
    key: () => 'only',
    keySchema: Schema.Literal('only'),
    read: (child: ChildModel) => child,
    writeAt: (model, _key, nextChild) =>
      modifyFields(model, { primary: () => nextChild }),
  },
)
const WrongPlacementBinding = ExactParentBaseDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'same-placement',
    readAll: readAllWrongPlacement,
    key: () => 'only',
    keySchema: Schema.Literal('only'),
    read: readWrongPlacement,
    writeAt: (model, _key, nextChild) => writeWrongPlacement(model, nextChild),
  },
)

const exactParentComposition = ExactParentBaseDefinition.makeComposition({
  bindings: [RegisteredPlacementBinding],
})
const initializeWrongPlacementStep = ExactParentBaseDefinition.makeStep(model =>
  WrongPlacementBinding.init({
    key: 'only',
    args: [],
    toParentModel: child => modifyFields(model, { primary: () => child }),
  }),
)
const prepareExactParent = () =>
  exactParentComposition.prepareBlock({
    view: exactParentComposition.makeView((_model, h) => h.div([])),
    init: () => ({ model: initialModel }),
    update: exactParentComposition.makeUpdate({
      RequestedInitializeChild: model => initializeWrongPlacementStep(model),
      Advanced: model =>
        ExactParentBaseDefinition.makeStep(() =>
          WrongPlacementBinding.fold(model, 'only', Message.Advanced()),
        )(model),
      CompletedRecordBeforeReplay: model =>
        ExactParentBaseDefinition.makeNoopStep()(model),
      CompletedRecordAfterReplay: model =>
        ExactParentBaseDefinition.makeNoopStep()(model),
    }),
    operations: {
      initializeWrongPlacement: () =>
        Tuple.make(ParentMessage.RequestedInitializeChild()),
    },
    EffectsLayer: Layer.empty,
  })
const ExactParent: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareExactParent
> = Block.assemble(prepareExactParent)

it('checks exact binding identity before reading or writing the parent Model', () => {
  const lowered = lowerBlock(ExactParent)

  expect(() => lowered.update(initialModel, ParentMessage.Advanced())).toThrow(
    'The child binding at placement "same-placement" is not registered in the current Block graph.',
  )
  expect(readAllWrongPlacement).not.toHaveBeenCalled()
  expect(readWrongPlacement).not.toHaveBeenCalled()
  expect(writeWrongPlacement).not.toHaveBeenCalled()
})

it('keeps foreign Bindings out of completed exposed operations', () => {
  expect(() =>
    ExactParent.operations.initializeWrongPlacement(initialModel),
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
const PendingParent = makeDefinition('PendingParent', {
  Model: PendingParentModel,
  Message: ParentMessage,
})
const PendingChildBinding = PendingParent.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
})
const PendingParentComposition = PendingParent.makeComposition({
  bindings: [PendingChildBinding],
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
  [
    {
      Advanced: () => pendingRegisteredKeyedReset,
      CompletedRecordBeforeReplay: () => pendingRegisteredKeyedReset,
      CompletedRecordAfterReplay: () => pendingRegisteredKeyedReset,
      RequestedInitializeChild: () => pendingRegisteredKeyedReset,
    },
  ],
)

it('resolves a pending keyed operation against the active Model after its key is removed', () => {
  const modelWithoutKey = modifyFields(capturedPendingModel, {
    entries: () => [],
    status: () => 'Active',
  })
  const previousInvocationCount = resetInvocation.mock.calls.length

  const result = returnPendingRegisteredKeyedReset(
    modelWithoutKey,
    ParentMessage.Advanced(),
  )

  expect(result.model).toBe(modelWithoutKey)
  expect(result.model.status).toBe('Active')
  expect(resetInvocation).toHaveBeenCalledTimes(previousInvocationCount)
})

const RecordBeforeReplay = PendingParent.makeCommand('RecordBeforeReplay', {
  messages: [ParentMessage.CompletedRecordBeforeReplay],
})
const RecordAfterReplay = PendingParent.makeCommand('RecordAfterReplay', {
  messages: [ParentMessage.CompletedRecordAfterReplay],
})

it('replays a deferred combined operation from the active Model without restoring removed keys', () => {
  const pending = Reflect.apply(Update.combineSteps, undefined, [
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
    {
      Advanced: () => pending,
      CompletedRecordBeforeReplay: () => pending,
      CompletedRecordAfterReplay: () => pending,
      RequestedInitializeChild: () => pending,
    },
  ])
  const modelWithoutKey = modifyFields(capturedPendingModel, {
    entries: () => [],
    status: () => 'Active',
  })
  const previousInvocationCount = resetInvocation.mock.calls.length

  const result = replay(modelWithoutKey, ParentMessage.Advanced())

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

const PolicyNamespace = makeNamespace('OperationGraphPolicyChild')

const policyComposition = PolicyNamespace.makeDefinition({
  Model: ChildModel,
  Message,
  OutMessage: PolicyOutMessage,
}).makeComposition()
const requestSiblingReset = (model: ChildModel) => ({
  model,
  outMessage: PolicyOutMessage.RequestedSiblingReset(),
})
const preparePolicyChild = () =>
  policyComposition.prepareBlock({
    view: policyComposition.makeView((_model, h) => h.div([])),
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: policyComposition.makeUpdate({
      RequestedReset: requestSiblingReset,
      Advanced: requestSiblingReset,
      CompletedRecordBeforeReplay: requestSiblingReset,
      CompletedRecordAfterReplay: requestSiblingReset,
    }),
    EffectsLayer: Layer.empty,
  })
const PolicyChild: Block.FromAssemblyWithViewAndOutMessage<
  typeof ChildModel,
  typeof preparePolicyChild
> = Block.assemble(preparePolicyChild)

const PolicyParentMessage = Schema.Never
const PolicyParentBaseDefinition = makeNamespace(
  'OperationGraphPolicyParent',
).makeDefinition({
  Model: ParentModel,
  Message: PolicyParentMessage,
})
const SiblingChildBinding = PolicyParentBaseDefinition.makeBinding(ChildBlock, {
  placement: 'sibling-child',
  read: (model: ParentModel) => Option.some(model.sibling),
  write: (model, nextChild) =>
    modifyFields(model, { sibling: () => nextChild }),
})
const PolicyChildBinding = PolicyParentBaseDefinition.makeBinding(PolicyChild, {
  placement: 'policy-child',
  read: (model: ParentModel) => Option.some(model.primary),
  write: (model, nextChild) =>
    modifyFields(model, { primary: () => nextChild }),
}).withOutMessagePolicy({
  fold: (_outMessage: PolicyOutMessage) => SiblingChildBinding.reset(),
})

const policyParentComposition = PolicyParentBaseDefinition.makeComposition({
  bindings: [PolicyChildBinding, SiblingChildBinding],
})
const preparePolicyParent = () =>
  policyParentComposition.prepareBlock({
    view: policyParentComposition.makeView((_model, h) => h.div([])),
    init: () => ({ model: initialModel }),
    update: policyParentComposition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const PolicyParent: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof preparePolicyParent
> = Block.assemble(preparePolicyParent)

it('restores the parent graph before folding a child OutMessage', () => {
  const lowered = lowerBlock(PolicyParent)

  const result = lowered.update(
    initialModel,
    Schema.decodeSync(policyParentComposition.Message)({
      _tag: 'GotPolicyChildMessage',
      placement: 'policy-child',
      generation: 0,
      message: Message.Advanced(),
    }),
  )

  expect(result.model.sibling.count).toBe(0)
})
