import { Schema } from 'effect'
import { Block, Message, Update } from 'foldkit'

import {
  ChildBlock,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  EntriesBinding,
  EntriesBindingWithOutMessagePolicy,
  LeftBinding,
  LeftBindingWithOutMessagePolicy,
  ParentDefinition,
  ParentModel,
  ParentOutMessage,
  ReflectSelection,
  RightBindingWithOutMessagePolicy,
  exactContextAnnotatedFold,
  exactContextAnnotatedForward,
  foldLeftOutMessage,
  foldRightOutMessage,
  forwardLeftOutMessage,
  rawFoldWithContext,
} from './outmessage-policy-selection.accepted.js'

const EmittingChildDefinition = Block.makeDefinition(
  'PolicySelectionEmittingChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  },
)
const EmittingChildComposition = EmittingChildDefinition.makeComposition()
const prepareEmittingChild = () =>
  EmittingChildComposition.prepareBlock({
    init: EmittingChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: '' }),
    })),
    update: EmittingChildComposition.makeUpdate({
      RequestedReset: model => ({
        model,
        outMessage: ChildOutMessage.Selected({ value: model.value }),
      }),
    }),
    operations: { reset: ChildMessage.RequestedReset },
  })
const EmittingChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareEmittingChild
> = Block.assemble(prepareEmittingChild)
const EmittingLeftBinding = ParentDefinition.makeBinding(EmittingChildBlock, {
  field: 'left',
}).withOutMessagePolicy({
  forward: ParentDefinition.makeOutMessageForward(EmittingChildBlock, {
    Selected: ({ value }) => ParentOutMessage.ForwardedSelection({ value }),
    Closed: () => undefined,
  }),
})
const EmittingRightBinding = ParentDefinition.makeBinding(EmittingChildBlock, {
  field: 'right',
})

const combineForwardingPolicyOperation = ParentDefinition.makeStep(() =>
  Update.combineSteps([
    ParentDefinition.makeNoopStep(),
    EmittingLeftBinding.reset(),
  ]),
)

const DirectCombinedPolicyBinding = EmittingRightBinding.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(EmittingChildBlock, {
    Selected: () =>
      Update.combineSteps([
        ParentDefinition.makeNoopStep(),
        EmittingLeftBinding.reset(),
      ]),
    Closed: ParentDefinition.makeNoopStep,
  }),
})
const DirectCombinedPolicyComposition = ParentDefinition.makeComposition({
  bindings: [
    EmittingLeftBinding,
    DirectCombinedPolicyBinding,
    EntriesBindingWithOutMessagePolicy,
  ],
})
// @ts-expect-error A Binding policy cannot discard a sibling policy's forwarded OutMessage through combineSteps.
DirectCombinedPolicyComposition.prepareBlock({
  init: DirectCombinedPolicyComposition.makeInit(() => ({
    model: { entries: [] },
  })),
  update: DirectCombinedPolicyComposition.makeUpdate({
    Reflected: model => ({ model }),
  }),
})

const ExtractedCombinedPolicyBinding =
  EmittingRightBinding.withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(EmittingChildBlock, {
      Selected: () => combineForwardingPolicyOperation,
      Closed: ParentDefinition.makeNoopStep,
    }),
  })
const ExtractedCombinedPolicyComposition = ParentDefinition.makeComposition({
  bindings: [
    EmittingLeftBinding,
    ExtractedCombinedPolicyBinding,
    EntriesBindingWithOutMessagePolicy,
  ],
})
// @ts-expect-error Extracting a nested combination cannot erase the sibling policy's OutMessage.
ExtractedCombinedPolicyComposition.prepareBlock({
  init: ExtractedCombinedPolicyComposition.makeInit(() => ({
    model: { entries: [] },
  })),
  update: ExtractedCombinedPolicyComposition.makeUpdate({
    Reflected: model => ({ model }),
  }),
})

const ConditionalCombinedPolicyBinding =
  EmittingRightBinding.withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(EmittingChildBlock, {
      Selected: ({ value }) =>
        value === 'Pear'
          ? combineForwardingPolicyOperation
          : ParentDefinition.makeNoopStep(),
      Closed: ParentDefinition.makeNoopStep,
    }),
  })
const ConditionalCombinedPolicyComposition = ParentDefinition.makeComposition({
  bindings: [
    EmittingLeftBinding,
    ConditionalCombinedPolicyBinding,
    EntriesBindingWithOutMessagePolicy,
  ],
})
// @ts-expect-error A conditional branch cannot erase an OutMessage-producing sibling policy combination.
ConditionalCombinedPolicyComposition.prepareBlock({
  init: ConditionalCombinedPolicyComposition.makeInit(() => ({
    model: { entries: [] },
  })),
  update: ConditionalCombinedPolicyComposition.makeUpdate({
    Reflected: model => ({ model }),
  }),
})

const SelfCombinedPolicyBinding = EmittingRightBinding.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(EmittingChildBlock, {
    Selected: () =>
      Update.combineSteps([
        ParentDefinition.makeNoopStep(),
        EmittingRightBinding.reset(),
      ]),
    Closed: () =>
      ParentDefinition.makeOutMessageStep(() =>
        ParentOutMessage.ForwardedSelection({ value: 'self' }),
      ),
  }),
})
const SelfCombinedPolicyComposition = ParentDefinition.makeComposition({
  bindings: [SelfCombinedPolicyBinding, EntriesBindingWithOutMessagePolicy],
})
// @ts-expect-error A self-referencing Binding policy cannot hide its own OutMessage in combineSteps.
SelfCombinedPolicyComposition.prepareBlock({
  init: SelfCombinedPolicyComposition.makeInit(() => ({
    model: {
      left: ChildModel.make({ value: '' }),
      entries: [],
    },
  })),
  update: SelfCombinedPolicyComposition.makeUpdate({
    Reflected: model => ({ model }),
  }),
})

// @ts-expect-error A child declaring OutMessages must select a policy before registration.
ParentDefinition.makeComposition({ bindings: [LeftBinding] })

// @ts-expect-error The selected left policy uses the omitted right Binding.
ParentDefinition.makeComposition({
  bindings: [LeftBindingWithOutMessagePolicy],
})

LeftBinding.withOutMessagePolicy({
  // @ts-expect-error The fold policy is callable rather than a case record.
  fold: {
    Selected: () => ParentDefinition.makeNoopStep(),
    Closed: () => ParentDefinition.makeNoopStep(),
  },
})

LeftBinding.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: (_outMessage, { liftCommand }) => {
      // @ts-expect-error FoldContext lifts only the exact child Message channel.
      const invalid = liftCommand(ReflectSelection())
      void invalid

      return ParentDefinition.makeNoopStep()
    },
    Closed: ParentDefinition.makeNoopStep,
  }),
})

LeftBinding.withOutMessagePolicy({
  // @ts-expect-error The forward policy is callable rather than a case record.
  forward: {
    Selected: ({ value }: { value: string }) =>
      ParentOutMessage.ForwardedSelection({ value }),
    Closed: () => undefined,
  },
})

// @ts-expect-error Every child OutMessage variant requires a named handler.
ParentDefinition.makeOutMessageFold(ChildBlock, {
  Selected: () => ParentDefinition.makeNoopStep(),
})

// @ts-expect-error A fold always requires its explicit child Block contract.
const unboundFold = ParentDefinition.makeOutMessageFold({
  Selected: () => ParentDefinition.makeNoopStep(),
  Closed: ParentDefinition.makeNoopStep,
})
void unboundFold

LeftBinding.withOutMessagePolicy({
  // @ts-expect-error A refined child fold cannot handle the broader child payload.
  fold: exactContextAnnotatedFold,
})

LeftBinding.withOutMessagePolicy({
  // @ts-expect-error A refined child forward cannot handle the broader child payload.
  forward: exactContextAnnotatedForward,
})

// @ts-expect-error An authored helper retains the exact child payload contract in both directions.
RefinedBinding.withOutMessagePolicy({ fold: foldLeftOutMessage })

const WidenedChildOutMessage = Message.defineMessageUnion({
  Selected: { value: Schema.String },
  Closed: {},
  Unexpected: {},
})
const WidenedChildDefinition = Block.makeDefinition(
  'PolicySelectionWidenedChild',
  {
    Model: ChildModel,
    Message: ChildBlock.Message,
    OutMessage: WidenedChildOutMessage,
  },
)
const WidenedChildComposition = WidenedChildDefinition.makeComposition()
const prepareWidenedChildBlock = () =>
  WidenedChildComposition.prepareBlock({
    init: WidenedChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: '' }),
    })),
    update: WidenedChildComposition.makeUpdate({
      RequestedReset: model => ({ model }),
    }),
  })
const WidenedChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareWidenedChildBlock
> = Block.assemble(prepareWidenedChildBlock)
const widenedContextFold = ParentDefinition.makeOutMessageFold(
  WidenedChildBlock,
  {
    Selected: () => ParentDefinition.makeNoopStep(),
    Closed: ParentDefinition.makeNoopStep,
    Unexpected: ParentDefinition.makeNoopStep,
  },
)
// @ts-expect-error A helper with extra variants does not match the exact child contract.
LeftBinding.withOutMessagePolicy({
  fold: widenedContextFold,
})

declare const widenedOrRawFold:
  | typeof widenedContextFold
  | typeof rawFoldWithContext

// @ts-expect-error A raw callable union member cannot hide a helper with extra variants.
LeftBinding.withOutMessagePolicy({ fold: widenedOrRawFold })

const widenedContextForward = ParentDefinition.makeOutMessageForward(
  WidenedChildBlock,
  {
    Selected: ({ value }) => ParentOutMessage.ForwardedSelection({ value }),
    Closed: () => undefined,
    Unexpected: () => undefined,
  },
)
// @ts-expect-error A forward helper with extra variants does not match the exact child contract.
LeftBinding.withOutMessagePolicy({
  forward: widenedContextForward,
})

// @ts-expect-error A forward helper cannot occupy the fold policy slot.
LeftBinding.withOutMessagePolicy({
  fold: forwardLeftOutMessage,
})

declare const wrongRoleOrRawFold:
  | typeof forwardLeftOutMessage
  | typeof rawFoldWithContext

// @ts-expect-error A raw callable union member cannot hide a helper for the wrong role.
LeftBinding.withOutMessagePolicy({ fold: wrongRoleOrRawFold })

// @ts-expect-error A fold helper cannot occupy the forward policy slot.
LeftBinding.withOutMessagePolicy({
  forward: foldRightOutMessage,
})

const SingleOutMessage = Schema.TaggedStruct('Closed', {})
const SingleDefinition = Block.makeDefinition('PolicySelectionSingle', {
  Model: ChildModel,
  Message: ChildBlock.Message,
  OutMessage: SingleOutMessage,
})
const SingleComposition = SingleDefinition.makeComposition()
const prepareSingleBlock = () =>
  SingleComposition.prepareBlock({
    init: SingleComposition.makeInit(() => ({
      model: ChildModel.make({ value: '' }),
    })),
    update: SingleComposition.makeUpdate({
      RequestedReset: model => ({ model }),
    }),
  })
const SingleBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareSingleBlock
> = Block.assemble(prepareSingleBlock)
// @ts-expect-error Fold helpers require a tagged-union child OutMessage contract.
ParentDefinition.makeOutMessageFold(SingleBlock, {
  Closed: ParentDefinition.makeNoopStep,
})

const NeverDefinition = Block.makeDefinition('PolicySelectionNever', {
  Model: ChildModel,
  Message: ChildBlock.Message,
  OutMessage: Schema.Never,
})
const NeverComposition = NeverDefinition.makeComposition()
const prepareNeverBlock = () =>
  NeverComposition.prepareBlock({
    init: NeverComposition.makeInit(() => ({
      model: ChildModel.make({ value: '' }),
    })),
    update: NeverComposition.makeUpdate({
      RequestedReset: model => ({ model }),
    }),
  })
const NeverBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareNeverBlock
> = Block.assemble(prepareNeverBlock)
// @ts-expect-error Schema.Never is not a tagged-union child OutMessage contract.
ParentDefinition.makeOutMessageFold(NeverBlock, {})

LeftBinding.withOutMessagePolicy({
  // @ts-expect-error Every child OutMessage variant is required inline.
  fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => ParentDefinition.makeNoopStep(),
  }),
})

LeftBinding.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => ParentDefinition.makeNoopStep(),
    Closed: ParentDefinition.makeNoopStep,
    // @ts-expect-error Undeclared child OutMessage variants are rejected inline.
    Unexpected: ParentDefinition.makeNoopStep,
  }),
})

LeftBinding.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => ParentDefinition.makeNoopStep(),
    // @ts-expect-error An inline handler must return a Step instead of never.
    Closed: () => {
      throw new Error('Missing transition')
    },
  }),
})

// @ts-expect-error A contextual forward cannot be extracted without its child Binding contract.
const unboundForward = ParentDefinition.makeOutMessageForward({
  Selected: ({ value }: { value: string }) =>
    ParentOutMessage.ForwardedSelection({ value }),
  Closed: () => undefined,
})
void unboundForward

LeftBinding.withOutMessagePolicy({
  // @ts-expect-error At least one inline handler must forward a parent OutMessage.
  forward: ParentDefinition.makeOutMessageForward({
    Selected: () => undefined,
    Closed: () => undefined,
  }),
})

ParentDefinition.makeOutMessageFold(ChildBlock, {
  Selected: ({ value }) => {
    const exactValue: string = value
    void exactValue

    return ParentDefinition.makeNoopStep()
  },
  Closed: () => ParentDefinition.makeNoopStep(),
})

ParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A fold cannot emit a child OutMessage through the parent channel.
  Selected: () => model => ({ model, outMessage: ChildOutMessage.Closed() }),
  Closed: () => ParentDefinition.makeNoopStep(),
})

ParentDefinition.makeOutMessageForward(ChildBlock, {
  // @ts-expect-error A forward cannot emit outside the parent OutMessage channel.
  Selected: () => ChildOutMessage.Closed(),
  Closed: () => ParentOutMessage.ForwardedSelection({ value: '' }),
})

EntriesBinding.withOutMessagePolicy({
  // @ts-expect-error A keyed fold receives the key decoded by keySchema.
  fold: (_id: number) => ParentDefinition.makeNoopStep(),
})

// @ts-expect-error Selected operations preserve their exact argument list.
LeftBindingWithOutMessagePolicy.reset('extra')

LeftBindingWithOutMessagePolicy.init({
  // @ts-expect-error Selected init preserves the child init argument tuple.
  args: ['extra'],
  toParentModel: child =>
    ParentModel.make({ left: child, right: child, entries: [] }),
})

LeftBindingWithOutMessagePolicy.embedView({
  slotId: 'left',
  // @ts-expect-error Selected embedView preserves the child Model.
  model: Schema.Struct({ wrong: Schema.Boolean }).make({ wrong: true }),
})

void RightBindingWithOutMessagePolicy
void ChildModel
