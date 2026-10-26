import { Array, Effect, Number, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { __bindCommandMatcher } from '../test/bindingMatcher.js'
import * as Update from '../update/public.js'
import { ViewScopeTypeId } from './identity.js'
import * as Block from './public.js'

const Choice = Schema.Literals(['Apple', 'Pear'])
const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  RequestedSelect: { value: Choice },
  RequestedClose: {},
  CompletedObserveSelection: {},
})
const ChildOutMessage = defineMessageUnion({
  Selected: { value: Choice },
  Closed: {},
})
const FoldChildDefinition = Block.makeDefinition('FoldChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const ObserveSelection = FoldChildDefinition.makeCommand('ObserveSelection', {
  messages: [ChildMessage.CompletedObserveSelection],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedObserveSelection())
  },
})
const FoldChildComposition = FoldChildDefinition.makeComposition()
const prepareChildBlock = () =>
  FoldChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: FoldChildComposition.makeUpdate({
      RequestedSelect: (model, { value }) => ({
        model: modifyFields(model, { count: Number.increment }),
        outMessage: ChildOutMessage.Selected({ value }),
      }),
      RequestedClose: model => ({
        model,
        outMessage: ChildOutMessage.Closed(),
      }),
      CompletedObserveSelection: model => ({ model }),
    }),
    operations: {
      requestSelect: ChildMessage.RequestedSelect,
      requestClose: ChildMessage.RequestedClose,
    },
    EffectsLayer: ObserveSelection.layer,
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const Model = Schema.Struct({
  child: ChildBlock.Model,
  sibling: ChildBlock.Model,
  choice: Choice,
  previousCount: Schema.Number,
})
const Message = defineMessageUnion({
  RequestedSelect: { value: Choice },
  CompletedRecordChoice: {},
})
const OutMessage = defineMessageUnion({ Chose: { value: Choice } })
const ForeignOutMessage = defineMessageUnion({ Escaped: {} })
const FoldParentDefinition = Block.makeDefinition('FoldParent', {
  Model,
  Message,
  OutMessage,
})
const RecordChoice = FoldParentDefinition.makeCommand('RecordChoice', {
  args: { value: Choice },
  messages: [Message.CompletedRecordChoice],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRecordChoice())
  },
})
const initialModel = Model.make({
  child: ChildModel.make({ count: 0 }),
  sibling: ChildModel.make({ count: 0 }),
  choice: 'Apple',
  previousCount: 0,
})

it('infers exact child payloads and the parent Model without running a transition during authoring', () => {
  let transitions = 0
  const fold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected:
      ({ value }) =>
      model => {
        expectTypeOf(value).toEqualTypeOf<'Apple' | 'Pear'>()
        expectTypeOf(model.choice).toEqualTypeOf<'Apple' | 'Pear'>()
        transitions += 1
        return { model: modifyFields(model, { choice: () => value }) }
      },
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })

  expect(transitions).toBe(0)
  const selected = fold(ChildOutMessage.Selected({ value: 'Pear' }))(
    initialModel,
  )

  expect(selected.model.choice).toBe('Pear')
  expect(initialModel.choice).toBe('Apple')
  expect(transitions).toBe(1)
  expect(fold(ChildOutMessage.Closed())(initialModel).model).toBe(initialModel)
  expectTypeOf<
    Update.RequirementsOf<ReturnType<typeof fold>>
  >().toEqualTypeOf<never>()
})

it('contextually types literal Model fields in folds and authored updates', () => {
  const Model = Schema.Struct({ phase: Schema.Literals(['Idle', 'Done']) })
  const Message = defineMessageUnion({
    RequestedFinish: {},
    RequestedReset: {},
  })
  const LiteralFoldDefinition = Block.makeDefinition('LiteralFold', {
    Model,
    Message,
  })
  const LiteralFoldComposition = LiteralFoldDefinition.makeComposition()
  const fold = LiteralFoldDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => _model => ({ model: { phase: 'Done' } }),
    Closed: () => _model => ({ model: { phase: 'Idle' } }),
  })
  const update = LiteralFoldComposition.makeUpdate({
    RequestedFinish: () => ({ model: { phase: 'Done' } }),
    RequestedReset: () => ({ model: { phase: 'Idle' } }),
  })
  const matcherUpdate = LiteralFoldComposition.makeUpdate({
    RequestedFinish: (
      _model,
    ): Update.Return<typeof Model.Type, typeof Message.Type> => ({
      model: { phase: 'Done' },
    }),
    RequestedReset: (
      _model,
    ): Update.Return<typeof Model.Type, typeof Message.Type> => ({
      model: { phase: 'Idle' },
    }),
  })
  const initialModel = Model.make({ phase: 'Idle' })

  expect(
    fold(ChildOutMessage.Selected({ value: 'Apple' }))(initialModel).model
      .phase,
  ).toBe('Done')
  expect(update(initialModel, Message.RequestedFinish()).model.phase).toBe(
    'Done',
  )
  expectTypeOf<ReturnType<typeof update>['model']['phase']>().toEqualTypeOf<
    'Idle' | 'Done'
  >()
  expect(
    matcherUpdate(initialModel, Message.RequestedFinish()).model.phase,
  ).toBe('Done')
  if (false) {
    LiteralFoldComposition.makeUpdate({
      // @ts-expect-error Contextual typing cannot admit an undeclared Model literal.
      RequestedFinish: (_model, _message) => ({
        model: { phase: 'Unknown' },
      }),
      RequestedReset: model => ({ model }),
    })
  }
})

it('retains Command requirements and derived parent OutMessages beside pure branches', () => {
  const fold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected:
      ({ value }) =>
      model => ({
        model: modifyFields(model, { choice: () => value }),
        commands: [RecordChoice({ value })],
        outMessage: OutMessage.Chose({ value }),
      }),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })

  expectTypeOf<Update.RequirementsOf<ReturnType<typeof fold>>>().toEqualTypeOf<
    Command.HandlerOf<typeof RecordChoice>
  >()

  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  }).withOutMessagePolicy({ fold })
  const FoldParentComposition = FoldParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const update = FoldParentComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ChildBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })
  const prepareParentBlock = () =>
    FoldParentComposition.prepareBlock({
      init: () => ({ model: initialModel }),
      update,
      operations: { requestSelect: Message.RequestedSelect },
      EffectsLayer: RecordChoice.layer,
    })
  const ParentBlock: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareParentBlock
  > = Block.assemble(prepareParentBlock)
  const selected = ParentBlock.operations.requestSelect(initialModel, {
    value: 'Pear',
  })

  expect(selected.model.child.count).toBe(1)
  expect(selected.model.choice).toBe('Pear')
  expect(selected.outMessage).toEqual(OutMessage.Chose({ value: 'Pear' }))
  expect(selected.commands).toHaveLength(1)
  expectTypeOf<
    Update.RequirementsOf<typeof ParentBlock.update>
  >().toEqualTypeOf<Command.HandlerOf<typeof RecordChoice>>()
})

it('accepts valid conditional Step and result unions without widening requirements', () => {
  const fold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected:
      ({ value }) =>
      model => {
        if (model.choice === value) {
          return { model }
        }

        return {
          model: modifyFields(model, { choice: () => value }),
          commands: [RecordChoice({ value })],
          outMessage: OutMessage.Chose({ value }),
        }
      },
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })

  expectTypeOf<Update.RequirementsOf<ReturnType<typeof fold>>>().toEqualTypeOf<
    Command.HandlerOf<typeof RecordChoice>
  >()
})

it('rejects every invalid member of mixed Step and result unions', () => {
  if (false) {
    const validStep = FoldParentDefinition.makeNoopStep()
    const wrongModelStep = (model: typeof Model.Type) => {
      if (model.choice === 'Apple') {
        return { model }
      }

      return { model: ChildModel.make({ count: 0 }) }
    }
    const foreignCommandStep = (model: typeof Model.Type) => {
      if (model.choice === 'Apple') {
        return { model }
      }

      return { model, commands: [ObserveSelection()] }
    }
    const foreignOutMessageStep = (model: typeof Model.Type) => {
      if (model.choice === 'Apple') {
        return { model }
      }

      return { model, outMessage: ForeignOutMessage.Escaped() }
    }
    const ExtendedModel = Schema.Struct({
      ...Model.fields,
      extra: Schema.String,
    })
    const narrowerInputStep = (_model: typeof ExtendedModel.Type) => ({
      model: initialModel,
    })
    const unknownEvidenceStep = (
      _model: typeof Model.Type,
    ): Update.ReturnWithRegistrationEvidence<
      typeof Model.Type,
      typeof Message.Type,
      never,
      never,
      unknown
    > => ({ model: initialModel })
    const mixedStep =
      globalThis.Math.random() > 0.5 ? validStep : narrowerInputStep

    const unknownCommands: unknown = undefined
    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error Command collections cannot widen to unknown.
      Selected: () => model => ({ model, commands: unknownCommands }),
      Closed: () => validStep,
    })
    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error Command collections must be arrays of Commands.
      Selected: () => model => ({ model, commands: { unexpected: true } }),
      Closed: () => validStep,
    })
    // @ts-expect-error A Definition is not a completed child Block.
    FoldParentDefinition.makeOutMessageFold(FoldChildDefinition, {})

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error Every returned Model member must match the parent Model.
      Selected: () => wrongModelStep,
      Closed: () => validStep,
    })

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error Every Command member must produce the parent Message.
      Selected: () => foreignCommandStep,
      Closed: () => validStep,
    })

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error Every OutMessage member must match the parent OutMessage.
      Selected: () => foreignOutMessageStep,
      Closed: () => validStep,
    })

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error Every possible Step input must match the parent graph input.
      Selected: () => mixedStep,
      Closed: () => validStep,
    })

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error A result cannot erase its Binding registration evidence.
      Selected: () => unknownEvidenceStep,
      Closed: () => validStep,
    })

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error The returned Step must produce a result, not another Step.
      Selected: () => _model => FoldParentDefinition.makeNoopStep(),
      Closed: () => validStep,
    })

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error Each variant must return a Step; never cannot disappear from the fold.
      Selected: () => {
        throw new Error('Missing transition')
      },
      Closed: () => validStep,
    })
  }
})

it('keeps sibling registration obligations when an exhaustive fold returns connected Steps', () => {
  const SiblingBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'sibling',
  }).withOutMessagePolicy({
    fold: FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      Selected: () => FoldParentDefinition.makeNoopStep(),
      Closed: () => FoldParentDefinition.makeNoopStep(),
    }),
  })
  const fold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: ({ value }) => SiblingBinding.requestSelect({ value }),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  }).withOutMessagePolicy({ fold })
  const FoldSiblingComposition = FoldParentDefinition.makeComposition({
    bindings: [ChildBinding, SiblingBinding],
  })
  const prepareParentBlock = () =>
    FoldSiblingComposition.prepareBlock({
      init: () => ({ model: initialModel }),
      update: FoldSiblingComposition.makeUpdate({
        RequestedSelect: (model, { value }) =>
          ChildBinding.requestSelect({ value })(model),
        CompletedRecordChoice: model =>
          FoldParentDefinition.makeNoopStep()(model),
      }),
      operations: { requestSelect: Message.RequestedSelect },
    })
  const ParentBlock: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareParentBlock
  > = Block.assemble(prepareParentBlock)
  const selected = ParentBlock.operations.requestSelect(initialModel, {
    value: 'Pear',
  })

  expect(selected.model.child.count).toBe(1)
  expect(selected.model.sibling.count).toBe(1)

  if (false) {
    // @ts-expect-error The fold's sibling operation still requires its Binding.
    FoldParentDefinition.makeComposition({ bindings: [ChildBinding] })

    FoldSiblingComposition.makeUpdate({
      // @ts-expect-error A pure branch cannot hide an unapplied connected Step in another branch.
      RequestedSelect: (_model, { value }) =>
        ChildBinding.requestSelect({ value }),
      CompletedRecordChoice: model => ({ model }),
    })
  }
})

it('contextually types FoldContext and preserves lifted Command requirements', () => {
  const fold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected:
      (_outMessage, { liftCommand, modelBeforeUpdate }) =>
      model => ({
        model: modifyFields(model, {
          previousCount: () => modelBeforeUpdate.child.count,
        }),
        commands: [liftCommand(ObserveSelection())],
      }),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  expectTypeOf<Update.RequirementsOf<ReturnType<typeof fold>>>().toEqualTypeOf<
    Command.HandlerOf<typeof ObserveSelection>
  >()

  const selected = fold(ChildOutMessage.Selected({ value: 'Pear' }), {
    modelBeforeUpdate: initialModel,
    liftCommand: command =>
      Command.mapMessage(command, () => Message.CompletedRecordChoice()),
    liftCommands: commands =>
      Command.mapMessages(commands, () => Message.CompletedRecordChoice()),
  })(
    modifyFields(initialModel, {
      child: () => ChildModel.make({ count: 1 }),
    }),
  )

  expect(selected.model.previousCount).toBe(0)
  expect(selected.model.child.count).toBe(1)
  expect(selected.commands).toHaveLength(1)

  if (false) {
    // @ts-expect-error A context-consuming fold cannot be invoked without its lifters.
    fold(ChildOutMessage.Selected({ value: 'Apple' }))
  }
})

it('executes an initialized sibling through an owned Step and retains its graph requirement', () => {
  const SiblingBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'sibling',
  }).withOutMessagePolicy({
    fold: FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      Selected: () => FoldParentDefinition.makeNoopStep(),
      Closed: () => FoldParentDefinition.makeNoopStep(),
    }),
  })
  const fold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () =>
      FoldParentDefinition.makeStep(model =>
        SiblingBinding.init({
          args: [],
          toParentModel: sibling =>
            modifyFields(model, { sibling: () => sibling }),
        }),
      ),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  }).withOutMessagePolicy({ fold })
  const FoldInitializedSiblingComposition =
    FoldParentDefinition.makeComposition({
      bindings: [ChildBinding, SiblingBinding],
    })
  const prepareParentBlock = () =>
    FoldInitializedSiblingComposition.prepareBlock({
      init: () => ({ model: initialModel }),
      update: FoldInitializedSiblingComposition.makeUpdate({
        RequestedSelect: (model, { value }) =>
          ChildBinding.requestSelect({ value })(model),
        CompletedRecordChoice: model =>
          FoldParentDefinition.makeNoopStep()(model),
      }),
      operations: { requestSelect: Message.RequestedSelect },
    })
  const ParentBlock: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareParentBlock
  > = Block.assemble(prepareParentBlock)
  const selected = ParentBlock.operations.requestSelect(
    modifyFields(initialModel, {
      sibling: () => ChildModel.make({ count: 5 }),
    }),
    { value: 'Pear' },
  )

  expect(selected.model.child.count).toBe(1)
  expect(selected.model.sibling.count).toBe(0)

  if (false) {
    // @ts-expect-error The initialized sibling still needs its registered Binding.
    FoldParentDefinition.makeComposition({ bindings: [ChildBinding] })

    FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      // @ts-expect-error A raw init recipe needs Definition.makeStep's normalization.
      Selected: () => model =>
        SiblingBinding.init({
          args: [],
          toParentModel: sibling =>
            modifyFields(model, { sibling: () => sibling }),
        }),
      Closed: () => FoldParentDefinition.makeNoopStep(),
    })
  }
})

it('rejects erased invalid configuration before calling a variant handler', () => {
  const makeFold = FoldParentDefinition.makeOutMessageFold
  const noopStep = () => FoldParentDefinition.makeNoopStep()

  expect(() => Reflect.apply(makeFold, undefined, [{}, {}])).toThrow(
    'completed child Block',
  )
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      FoldChildDefinition,
      { Selected: noopStep, Closed: noopStep },
    ]),
  ).toThrow('completed child Block')
  expect(() =>
    Reflect.apply(makeFold, undefined, [ChildBlock, { Selected: noopStep }]),
  ).toThrow('missing handlers for: Closed')
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      ChildBlock,
      { Selected: noopStep, Closed: noopStep, Unexpected: noopStep },
    ]),
  ).toThrow('unexpected handlers for: Unexpected')
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      ChildBlock,
      { Selected: noopStep, Closed: true },
    ]),
  ).toThrow('handler "Closed" must be a function')
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      ChildBlock,
      Object.create({ Selected: noopStep, Closed: noopStep }),
    ]),
  ).toThrow('missing handlers for: Selected, Closed')

  const fold = makeFold(ChildBlock, {
    Selected: noopStep,
    Closed: noopStep,
  })
  expect(() => Reflect.apply(fold, undefined, [{ _tag: 'toString' }])).toThrow(
    'has no handler for child OutMessage "toString"',
  )
})

it('keeps keyed parent policy explicit and ignores operations on removed instances', () => {
  const InstanceId = Schema.Literals(['First', 'Second'])
  const Instance = Schema.Struct({ id: InstanceId, child: ChildBlock.Model })
  const KeyedModel = Schema.Struct({
    instances: Schema.Array(Instance),
    choice: Choice,
  })
  const KeyedMessage = defineMessageUnion({
    RequestedSelect: { id: InstanceId, value: Choice },
    RequestedRemove: { id: InstanceId },
  })
  const FoldKeyedDefinition = Block.makeDefinition('FoldKeyed', {
    Model: KeyedModel,
    Message: KeyedMessage,
  })
  const InstancesBinding = FoldKeyedDefinition.makeBinding(ChildBlock, {
    field: 'instances',
    key: 'id',
    childField: 'child',
  }).withOutMessagePolicy({
    fold: (id, outMessage) =>
      FoldKeyedDefinition.makeOutMessageFold(ChildBlock, {
        Selected:
          ({ value }) =>
          model => ({
            model: modifyFields(model, { choice: () => value }),
          }),
        Closed: () =>
          FoldKeyedDefinition.makeFieldsStep(() => ({
            instances: Array.filter(instance => instance.id !== id),
          })),
      })(outMessage),
  })
  const FoldKeyedComposition = FoldKeyedDefinition.makeComposition({
    bindings: [InstancesBinding],
  })
  const model = KeyedModel.make({
    instances: [
      Instance.make({ id: 'First', child: ChildModel.make({ count: 0 }) }),
      Instance.make({ id: 'Second', child: ChildModel.make({ count: 0 }) }),
    ],
    choice: 'Apple',
  })
  const prepareParentBlock = () =>
    FoldKeyedComposition.prepareBlock({
      init: () => ({ model }),
      update: FoldKeyedComposition.makeUpdate({
        RequestedSelect: (model, { id, value }) =>
          InstancesBinding.requestSelect(id, { value })(model),
        RequestedRemove: (model, { id }) =>
          InstancesBinding.requestClose(id)(model),
      }),
      operations: {
        requestSelect: KeyedMessage.RequestedSelect,
        requestRemove: KeyedMessage.RequestedRemove,
      },
    })
  const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof KeyedModel,
    typeof prepareParentBlock
  > = Block.assemble(prepareParentBlock)
  const selected = ParentBlock.operations.requestSelect(model, {
    id: 'First',
    value: 'Pear',
  })
  const removed = ParentBlock.operations.requestRemove(selected.model, {
    id: 'First',
  })
  const stale = ParentBlock.operations.requestSelect(removed.model, {
    id: 'First',
    value: 'Apple',
  })

  expect(selected.model.choice).toBe('Pear')
  expect(removed.model.instances).toEqual([
    Instance.make({ id: 'Second', child: ChildModel.make({ count: 0 }) }),
  ])
  expect(stale.model).toBe(removed.model)

  if (false) {
    // @ts-expect-error The keyed operation retains the parent Schema's exact ID type.
    InstancesBinding.requestClose('Third')
  }
})

it('keeps configured Bindings usable for operations, initialization, views and exact Command matching', () => {
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
  const SiblingBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'sibling',
    init: false,
  })
  const fold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: (_outMessage, { liftCommand }) =>
      FoldParentDefinition.makeStep(model => ({
        model,
        commands: [liftCommand(ObserveSelection())],
      })),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  const ConfiguredBinding = ChildBinding.withOutMessagePolicy({ fold })
  const Composition = FoldParentDefinition.makeComposition({
    bindings: [ConfiguredBinding],
  })
  const update = Composition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ConfiguredBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })
  const selected = update(
    initialModel,
    Message.RequestedSelect({ value: 'Pear' }),
  )
  const command = Option.getOrThrow(Array.head(selected.commands ?? []))

  expect(ConfiguredBinding.fold).toBe(ChildBinding.fold)
  expect(ConfiguredBinding.init).toBe(ChildBinding.init)
  expect(ConfiguredBinding.embedView).toBe(ChildBinding.embedView)
  expect(ConfiguredBinding.requestSelect).toBe(ChildBinding.requestSelect)
  expect(Block.inspectBinding(ConfiguredBinding)).toBe(
    Block.inspectBinding(ChildBinding),
  )
  expect(Object.isFrozen(ConfiguredBinding)).toBe(true)
  expect(Object.hasOwn(ConfiguredBinding, 'binding')).toBe(false)
  expect(
    __bindCommandMatcher(
      ChildBlock,
      ConfiguredBinding,
      ObserveSelection(),
    ).matches(command),
  ).toBe(true)
  expect(
    __bindCommandMatcher(ChildBlock, ChildBinding, ObserveSelection()).matches(
      command,
    ),
  ).toBe(true)
  expect(
    __bindCommandMatcher(
      ChildBlock,
      SiblingBinding,
      ObserveSelection(),
    ).matches(command),
  ).toBe(false)

  const init = Composition.makeInit(() =>
    ConfiguredBinding.init({
      args: [],
      toParentModel: child =>
        modifyFields(initialModel, { child: () => child }),
    }),
  )

  expect(init().model).toEqual(initialModel)

  const childView = FoldChildComposition.makeView((model, h) =>
    h.span([], [globalThis.String(model.count)]),
  )
  const embedded = ConfiguredBinding.embedView({
    slotId: 'child',
    model: initialModel.child,
    view: childView,
  })

  expect(embedded[ViewScopeTypeId]?.binding).toBe(ChildBinding)
})

it('selects immutable policies per Composition without changing the original Binding', () => {
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
  const foldApple = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () =>
      FoldParentDefinition.makeFieldsStep(() => ({ choice: () => 'Apple' })),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  const foldPear = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () =>
      FoldParentDefinition.makeFieldsStep(() => ({ choice: () => 'Pear' })),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  const policy = { fold: foldApple }
  const AppleBinding = ChildBinding.withOutMessagePolicy(policy)
  const PearBinding = ChildBinding.withOutMessagePolicy({ fold: foldPear })
  const AppleComposition = FoldParentDefinition.makeComposition({
    bindings: [AppleBinding],
  })
  const PearComposition = FoldParentDefinition.makeComposition({
    bindings: [PearBinding],
  })
  const appleUpdate = AppleComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ChildBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })
  const pearUpdate = PearComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      PearBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })

  const prepareAppleBlock = () =>
    AppleComposition.prepareBlock({
      init: () => ({ model: initialModel }),
      update: appleUpdate,
    })
  const AppleBlock: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareAppleBlock
  > = Block.assemble(prepareAppleBlock)
  const ReusedComposition = FoldParentDefinition.makeComposition({
    bindings: AppleComposition.bindings,
  })
  const ReusedBlockComposition = FoldParentDefinition.makeComposition({
    bindings: AppleBlock.bindings,
  })
  const reusedUpdate = ReusedComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ChildBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })
  const reusedBlockUpdate = ReusedBlockComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ChildBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })

  expect(Option.getOrThrow(Array.head(AppleComposition.bindings))).toBe(
    AppleBinding,
  )
  expect(Option.getOrThrow(Array.head(AppleBlock.bindings))).toBe(AppleBinding)
  expect(
    reusedUpdate(initialModel, Message.RequestedSelect({ value: 'Pear' })).model
      .choice,
  ).toBe('Apple')
  expect(
    reusedBlockUpdate(initialModel, Message.RequestedSelect({ value: 'Pear' }))
      .model.choice,
  ).toBe('Apple')

  Reflect.set(policy, 'fold', foldPear)

  expect(
    appleUpdate(initialModel, Message.RequestedSelect({ value: 'Pear' })).model
      .choice,
  ).toBe('Apple')
  expect(
    pearUpdate(initialModel, Message.RequestedSelect({ value: 'Apple' })).model
      .choice,
  ).toBe('Pear')
  expect(
    appleUpdate(initialModel, Message.RequestedSelect({ value: 'Pear' })).model
      .choice,
  ).toBe('Apple')
  expect(Object.hasOwn(ChildBinding, 'outMessage')).toBe(false)
})

it('resolves reciprocal and self-referencing folds against registered policies', () => {
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
  const SiblingBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'sibling',
    init: false,
  })
  const foldChild = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => SiblingBinding.requestClose(),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  const foldSibling = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => ChildBinding.requestClose(),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })
  const Composition = FoldParentDefinition.makeComposition({
    bindings: [
      ChildBinding.withOutMessagePolicy({ fold: foldChild }),
      SiblingBinding.withOutMessagePolicy({ fold: foldSibling }),
    ],
  })
  const update = Composition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ChildBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })

  expect(
    update(initialModel, Message.RequestedSelect({ value: 'Pear' })).model.child
      .count,
  ).toBe(1)

  const selfFold = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => ChildBinding.requestClose(),
    Closed: () =>
      FoldParentDefinition.makeFieldsStep(() => ({ choice: () => 'Pear' })),
  })
  const SelfComposition = FoldParentDefinition.makeComposition({
    bindings: [ChildBinding.withOutMessagePolicy({ fold: selfFold })],
  })
  const selfUpdate = SelfComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ChildBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })

  expect(
    selfUpdate(initialModel, Message.RequestedSelect({ value: 'Apple' })).model
      .choice,
  ).toBe('Pear')
})

it('rejects erased policies and leaves missing-policy validation at Composition', () => {
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
  const noop = FoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => FoldParentDefinition.makeNoopStep(),
    Closed: () => FoldParentDefinition.makeNoopStep(),
  })

  for (const policy of [
    {},
    { fold: { Selected: noop, Closed: noop } },
    { forward: { Selected: noop, Closed: noop } },
    { fold: noop, unexpected: true },
  ]) {
    expect(() =>
      Reflect.apply(ChildBinding.withOutMessagePolicy, undefined, [policy]),
    ).toThrow()
  }

  expect(() =>
    Reflect.apply(FoldParentDefinition.makeComposition, undefined, [
      { bindings: [ChildBinding] },
    ]),
  ).toThrow('requires withOutMessagePolicy')
  expect(() =>
    Reflect.apply(FoldParentDefinition.makeBinding, undefined, [
      ChildBlock,
      {
        field: 'child',
        outMessage: { fold: noop },
      },
    ]),
  ).toThrow('no longer accepts outMessage')
  expect(() =>
    Reflect.apply(FoldParentDefinition.makeComposition, undefined, [
      {
        bindings: [
          ChildBinding.withOutMessagePolicy({ fold: noop }),
          ChildBinding.withOutMessagePolicy({ fold: noop }),
        ],
      },
    ]),
  ).toThrow('both resolve to placement')
})

it('validates explicit callable cases without invoking handlers', () => {
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
  let handled = 0
  const selectedMatcherStep = () => {
    handled += 1
    return FoldParentDefinition.makeNoopStep()
  }
  const makeFold = FoldParentDefinition.makeOutMessageFold

  expect(handled).toBe(0)
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      ChildBlock,
      { Selected: selectedMatcherStep },
    ]),
  ).toThrow('missing handlers for: Closed')
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      ChildBlock,
      {
        Selected: selectedMatcherStep,
        Closed: FoldParentDefinition.makeNoopStep,
        Unexpected: FoldParentDefinition.makeNoopStep,
      },
    ]),
  ).toThrow('unexpected handlers for: Unexpected')
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      ChildBlock,
      { Selected: true, Closed: FoldParentDefinition.makeNoopStep },
    ]),
  ).toThrow('handler "Selected" must be a function')
  expect(() =>
    Reflect.apply(makeFold, undefined, [
      {
        Selected: selectedMatcherStep,
        Closed: FoldParentDefinition.makeNoopStep,
      },
    ]),
  ).toThrow(
    'requires a completed child Block followed by a record of variant handlers',
  )
  const explicitFold = makeFold(ChildBlock, {
    Selected: selectedMatcherStep,
    Closed: FoldParentDefinition.makeNoopStep,
  })
  const contextualForward = Reflect.apply(
    FoldParentDefinition.makeOutMessageForward,
    undefined,
    [
      {
        Selected: () => OutMessage.Chose({ value: 'Apple' }),
        Closed: () => undefined,
      },
    ],
  )
  const explicitForward = FoldParentDefinition.makeOutMessageForward(
    ChildBlock,
    {
      Selected: () => OutMessage.Chose({ value: 'Apple' }),
      Closed: () => undefined,
    },
  )

  for (const forward of [contextualForward, explicitForward]) {
    expect(() =>
      Reflect.apply(ChildBinding.withOutMessagePolicy, undefined, [
        { fold: forward },
      ]),
    ).toThrow('cannot supply an OutMessage fold policy')
  }
  expect(() =>
    Reflect.apply(ChildBinding.withOutMessagePolicy, undefined, [
      { forward: explicitFold },
    ]),
  ).toThrow('cannot supply an OutMessage forward policy')
  expect(handled).toBe(0)
})

it('infers inline fold and forward contracts from the explicit child', () => {
  let handled = 0
  const ChildBinding = FoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  }).withOutMessagePolicy({
    fold: FoldParentDefinition.makeOutMessageFold(ChildBlock, {
      Selected: ({ value }, { modelBeforeUpdate }) => {
        expectTypeOf(value).toEqualTypeOf<typeof Choice.Type>()
        expectTypeOf(modelBeforeUpdate).toEqualTypeOf<typeof Model.Type>()
        handled += 1

        return FoldParentDefinition.makeFieldsStep(() => ({
          choice: () => value,
        }))
      },
      Closed: FoldParentDefinition.makeNoopStep,
    }),
    forward: FoldParentDefinition.makeOutMessageForward({
      Selected: ({ value }) => OutMessage.Chose({ value }),
      Closed: () => undefined,
    }),
  })
  const Composition = FoldParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const update = Composition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      ChildBinding.requestSelect({ value })(model),
    CompletedRecordChoice: model => FoldParentDefinition.makeNoopStep()(model),
  })

  expect(handled).toBe(0)

  const selected = update(
    initialModel,
    Message.RequestedSelect({ value: 'Pear' }),
  )

  expect(handled).toBe(1)
  expect(selected.model.choice).toBe('Pear')
  expect(selected.outMessage).toEqual(OutMessage.Chose({ value: 'Pear' }))
})

it('rejects helper authoring on a child without a tagged-union contract', () => {
  const PlainChildComposition = Block.makeDefinition('PlainOutMessageChild', {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: Schema.TaggedStruct('Closed', {}),
  }).makeComposition()
  const preparePlainChildBlock = () =>
    PlainChildComposition.prepareBlock({
      init: PlainChildComposition.makeInit(() => ({
        model: ChildModel.make({ count: 0 }),
      })),
      update: PlainChildComposition.makeUpdate({
        RequestedSelect: model => ({ model }),
        RequestedClose: model => ({ model }),
        CompletedObserveSelection: model => ({ model }),
      }),
    })
  const PlainChildBlock: Block.FromAssemblyWithOutMessage<
    typeof ChildModel,
    typeof preparePlainChildBlock
  > = Block.assemble(preparePlainChildBlock)
  const PlainChildBinding = FoldParentDefinition.makeBinding(PlainChildBlock, {
    field: 'child',
    init: false,
  })
  expect(() =>
    Reflect.apply(FoldParentDefinition.makeOutMessageFold, undefined, [
      PlainChildBlock,
      { Closed: FoldParentDefinition.makeNoopStep },
    ]),
  ).toThrow('requires a tagged child OutMessage union')
  expect(() =>
    PlainChildBinding.withOutMessagePolicy({
      fold: FoldParentDefinition.makeNoopStep,
    }),
  ).not.toThrow()
})
