import { Effect, Layer, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import {
  ChildBinding,
  ChildBlock,
  ChildComposition,
  ChildDefinition,
  ChildMessage,
  ChildModel,
  ContextComposition,
  ContextMessage,
  ContextModel,
  EntryBinding,
  ExactBlock,
  FruitChoice,
  MountedChoiceComposition,
  MountedChoiceDefinition,
  MountedChoiceMessage,
  MountedChoiceModel,
  ObserveSelection,
  ParentComposition,
  ParentDefinition,
  ParentModel,
  RecordValue,
  childUpdate,
  contextUpdate,
  mountedChoiceUpdate,
  mountedChoiceView,
  parentUpdate,
} from './exposed-message.accepted.js'

const directModelStep = ChildDefinition.makeStep((model, value: string) => ({
  model: modifyFields(model, { value: () => value }),
}))

ChildComposition.prepareBlock({
  init: () => ({ model: ChildModel.make({ value: '' }) }),
  update: childUpdate,
  operations: {
    // @ts-expect-error Exposed operations produce child update inputs, not Model transitions.
    setDirectly: directModelStep,
  },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture deliberately probes erased any channels or detects any in an inferred public type.
const erasedAnyProducer = (): any => [ChildMessage.RequestedReset()]
ChildComposition.prepareBlock({
  init: () => ({ model: ChildModel.make({ value: '' }) }),
  update: childUpdate,
  // @ts-expect-error An any-returning producer cannot bypass tuple validation.
  operations: { erasedAnyProducer },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture deliberately probes erased any channels or detects any in an inferred public type.
const erasedExpose: any = { reset: () => [ChildMessage.RequestedReset()] }
ChildComposition.prepareBlock({
  init: () => ({ model: ChildModel.make({ value: '' }) }),
  update: childUpdate,
  // @ts-expect-error An any-typed operations record cannot bypass operation validation.
  operations: erasedExpose,
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

const erasedUnknownProducer = (): unknown => [ChildMessage.RequestedReset()]
ChildComposition.prepareBlock({
  init: () => ({ model: ChildModel.make({ value: '' }) }),
  update: childUpdate,
  operations: {
    // @ts-expect-error An unknown-returning producer cannot bypass tuple validation.
    erasedUnknownProducer,
  },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

const ForeignMessage = defineMessageUnion({ UpdatedForeignValue: {} })
ChildComposition.prepareBlock({
  init: () => ({ model: ChildModel.make({ value: '' }) }),
  update: childUpdate,
  operations: {
    // @ts-expect-error The tuple must start with this Block's authored Message.
    sendForeign: () => [ForeignMessage.UpdatedForeignValue()],
  },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

ContextComposition.prepareBlock({
  init: () => ({ model: ContextModel.make({ value: '' }) }),
  update: contextUpdate,
  operations: {
    // @ts-expect-error A required update Context cannot be omitted.
    omitContext: () => [ContextMessage.UpdatedValue({ value: '' })],
  },
  EffectsLayer: Layer.empty,
})

ContextComposition.prepareBlock({
  init: () => ({ model: ContextModel.make({ value: '' }) }),
  update: contextUpdate,
  operations: {
    // @ts-expect-error The update Context tuple is checked positionally.
    wrongContext: () => [ContextMessage.UpdatedValue({ value: '' }), 1],
  },
  EffectsLayer: Layer.empty,
})

ParentComposition.prepareBlock({
  init: ParentComposition.makeInit(() => ({
    model: { entries: [{ id: 'first', child: { value: 'entry' } }] },
  })),
  update: parentUpdate,
  operations: {
    // @ts-expect-error Got* wrappers are routed child facts, not authored operations.
    interceptChild: () => [
      {
        _tag: 'GotChildMessage',
        placement: 'child',
        generation: 0,
        message: ChildMessage.UpdatedValue({ value: 'blocked' }),
      },
    ],
  },
  EffectsLayer: Layer.empty,
})

// @ts-expect-error Exposed operation names cannot collide with Binding members.
ChildComposition.prepareBlock({
  init: () => ({ model: ChildModel.make({ value: '' }) }),
  update: childUpdate,
  operations: { fold: () => [ChildMessage.RequestedReset()] },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

// @ts-expect-error A direct operation retains its exact payload arguments.
ChildBinding.setValue(1)
// @ts-expect-error A keyed operation requires its key before operation arguments.
EntryBinding.setValue('value')
FruitChoice.operations.select(
  FruitChoice.Model.make({ selected: 'Apple' }),
  // @ts-expect-error A generic Message producer retains the factory's refined payload.
  'Orange',
  { source: 'rejected' },
)

const ForeignMountedChoiceMessage = defineMessageUnion({
  UpdatedForeignSelection: { value: Schema.String },
})
MountedChoiceComposition.prepareBlock({
  init: (selected: string) => ({
    model: MountedChoiceModel.make({ selected }),
  }),
  update: mountedChoiceUpdate,
  view: mountedChoiceView,
  operations: {
    // @ts-expect-error A view-backed exposed producer must return this Block's Message.
    select: (value: string) =>
      Tuple.make(
        ForeignMountedChoiceMessage.UpdatedForeignSelection({ value }),
      ),
  },
  EffectsLayer: ObserveSelection.layer,
})

MountedChoiceComposition.prepareBlock({
  init: (selected: string) => ({
    model: MountedChoiceModel.make({ selected }),
  }),
  update: mountedChoiceUpdate,
  view: mountedChoiceView,
  managedResources: {},
  operations: {
    // @ts-expect-error The managed-resource overload validates exposed Messages too.
    select: (value: string) =>
      Tuple.make(
        ForeignMountedChoiceMessage.UpdatedForeignSelection({ value }),
      ),
  },
  EffectsLayer: ObserveSelection.layer,
})

// @ts-expect-error The registered Mount's handler must be present in EffectsLayer.
MountedChoiceComposition.prepareBlock({
  init: (selected: string) => ({
    model: MountedChoiceModel.make({ selected }),
  }),
  update: mountedChoiceUpdate,
  view: mountedChoiceView,
  operations: {
    select: (value: string) =>
      Tuple.make(MountedChoiceMessage.UpdatedSelection({ value })),
  },
  EffectsLayer: Layer.empty,
})

const GraphlessMountedChoiceComposition =
  MountedChoiceDefinition.makeComposition()
// @ts-expect-error A Composition cannot complete a view that requires an omitted Mount.
GraphlessMountedChoiceComposition.prepareBlock({
  init: (selected: string) => ({
    model: MountedChoiceModel.make({ selected }),
  }),
  update: mountedChoiceUpdate,
  view: mountedChoiceView,
  operations: {
    select: (value: string) =>
      Tuple.make(MountedChoiceMessage.UpdatedSelection({ value })),
  },
  EffectsLayer: ObserveSelection.layer,
})

const ForeignMountedChoiceNamespace = Block.makeNamespace(
  'ForeignMountedChoice',
)
const ObserveForeignSelection = ForeignMountedChoiceNamespace.makeMount(
  'ObserveForeignSelection',
  {
    messages: [MountedChoiceMessage.CompletedObserveSelection],
    handler: function* () {
      return () =>
        Effect.succeed(MountedChoiceMessage.CompletedObserveSelection())
    },
  },
)
const IncorrectMountedChoiceComposition =
  MountedChoiceDefinition.makeComposition({
    mounts: [ObserveForeignSelection],
  })
// @ts-expect-error A sibling Mount cannot satisfy the authored view's capability.
IncorrectMountedChoiceComposition.prepareBlock({
  init: (selected: string) => ({
    model: MountedChoiceModel.make({ selected }),
  }),
  update: mountedChoiceUpdate,
  view: mountedChoiceView,
  operations: {
    select: (value: string) =>
      Tuple.make(MountedChoiceMessage.UpdatedSelection({ value })),
  },
  EffectsLayer: ObserveForeignSelection.layer,
})

// @ts-expect-error Exposed operation names cannot collide with Binding members.
MountedChoiceComposition.prepareBlock({
  init: (selected: string) => ({
    model: MountedChoiceModel.make({ selected }),
  }),
  update: mountedChoiceUpdate,
  view: mountedChoiceView,
  operations: {
    fold: () =>
      Tuple.make(MountedChoiceMessage.UpdatedSelection({ value: '' })),
  },
  EffectsLayer: ObserveSelection.layer,
})

const foldChildOutMessage = () => (model: ParentModel) => ({ model })
const AlternativeChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
  placement: 'alternative',
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const OmittedComposition = ParentDefinition.makeComposition({
  bindings: [AlternativeChildBinding, EntryBinding],
})
OmittedComposition.makeUpdate({
  RequestedNoop: (model, _message) =>
    // @ts-expect-error Calling a bound exposed operation requires its Binding registration.
    ChildBinding.setValue('unregistered')(model),
  RequestedSetChild: (model, _message) =>
    // @ts-expect-error Calling a bound exposed operation requires its Binding registration.
    ChildBinding.setValue('unregistered')(model),
  RequestedSetEntry: (model, _message) =>
    // @ts-expect-error Calling a bound exposed operation requires its Binding registration.
    ChildBinding.setValue('unregistered')(model),
})

void ChildBlock

// @ts-expect-error Tuple metadata cannot erase the completed operation's required Model argument.
ExactBlock.operations.pingWithMetadata()
