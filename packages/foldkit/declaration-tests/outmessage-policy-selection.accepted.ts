import { Array, Context, Effect, Schema, Tuple } from 'effect'
import { Block, Command, Message, Struct, Update } from 'foldkit'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const ChildModel = Schema.Struct({ value: Schema.String })
export const ChildMessage = Message.defineMessageUnion({ RequestedReset: {} })
export const ChildOutMessage = Message.defineMessageUnion({
  Selected: { value: Schema.String },
  Closed: {},
})
const ChildDefinition = Block.makeDefinition('PolicySelectionChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
export class ChildStore extends Context.Service<
  ChildStore,
  Readonly<{ reset: Effect.Effect<void> }>
>()('PolicySelectionChildStore') {}
export const ResetChild = ChildDefinition.makeCommand('ResetChild', {
  messages: [ChildMessage.RequestedReset],
  handler: function* () {
    const store = yield* ChildStore
    return () => store.reset.pipe(Effect.as(ChildMessage.RequestedReset()))
  },
})
const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: '' }),
    })),
    update: ChildComposition.makeUpdate({
      RequestedReset: model => ({ model }),
    }),
    view: ChildComposition.makeView((_model, h) => h.div([])),
    operations: {
      reset: () => Tuple.make(ChildMessage.RequestedReset()),
    },
    EffectsLayer: ResetChild.layer,
  })
export const ChildBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const makeRefinedChildBlock = <const Value extends string>(
  Value: Schema.Schema<Value>,
) => {
  const RefinedOutMessage = Message.defineMessageUnion({
    Selected: { value: Value },
    Closed: {},
  })
  const RefinedChildDefinition = Block.makeDefinition(
    'PolicySelectionRefinedChild',
    {
      Model: ChildModel,
      Message: ChildMessage,
      OutMessage: RefinedOutMessage,
    },
  )
  const RefinedChildComposition = RefinedChildDefinition.makeComposition()

  const prepare = () =>
    RefinedChildComposition.prepareBlock({
      init: RefinedChildComposition.makeInit(() => ({
        model: ChildModel.make({ value: '' }),
      })),
      update: RefinedChildComposition.makeUpdate({
        RequestedReset: model => ({ model }),
      }),
      operations: {
        reset: () => Tuple.make(ChildMessage.RequestedReset()),
      },
    })
  const completedBlock: Block.FromAssemblyWithOutMessage<
    typeof ChildModel,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

export const RefinedChildBlock = makeRefinedChildBlock(
  Schema.Literals(['Refined']),
)

export const Entry = Schema.Struct({
  id: Schema.String,
  child: ChildModel,
})
export const ParentModel = Schema.Struct({
  left: ChildModel,
  right: ChildModel,
  entries: Schema.Array(Entry),
})
export const ParentMessage = Message.defineMessageUnion({ Reflected: {} })
export const ParentOutMessage = Message.defineMessageUnion({
  ForwardedSelection: { value: Schema.String },
})
export const ParentDefinition = Block.makeDefinition('PolicySelectionParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})
export const ReflectSelection = ParentDefinition.makeCommand(
  'ReflectSelection',
  {
    messages: [ParentMessage.Reflected],
    handler: function* () {
      return () => Effect.succeed(ParentMessage.Reflected())
    },
  },
)

export const LeftBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'left',
})
export const RightBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'right',
})
export const RefinedBinding = ParentDefinition.makeBinding(RefinedChildBlock, {
  field: 'left',
  placement: 'refined',
})

export const exactContextAnnotatedFold: Block.OutMessageFold<
  typeof RefinedChildBlock.OutMessage.Type,
  Update.Step<typeof ParentModel.Type, typeof ParentMessage.Type>,
  readonly [
    context: Update.FoldContext<
      typeof ChildMessage.Type,
      typeof ParentMessage.Type,
      typeof ParentModel.Type
    >,
  ]
> = ParentDefinition.makeOutMessageFold(RefinedChildBlock, {
  Selected: ({ value }, context) => {
    const exactValue: 'Refined' = value
    const exactContext: Update.FoldContext<
      typeof ChildMessage.Type,
      typeof ParentMessage.Type,
      typeof ParentModel.Type
    > = context
    void exactValue
    void exactContext

    return ParentDefinition.makeNoopStep()
  },
  Closed: ParentDefinition.makeNoopStep,
})

export const exactContextAnnotatedForward: Block.OutMessageForward<
  typeof RefinedChildBlock.OutMessage.Type,
  typeof ParentOutMessage.Type
> = ParentDefinition.makeOutMessageForward({
  Selected: ({ value }) => ParentOutMessage.ForwardedSelection({ value }),
  Closed: () => undefined,
})

export const foldLeftOutMessage = ParentDefinition.makeOutMessageFold(
  ChildBlock,
  {
    Selected: (_outMessage, context) => {
      const exactContext: Update.FoldContext<
        typeof ChildMessage.Type,
        typeof ParentMessage.Type,
        typeof ParentModel.Type
      > = context
      void exactContext

      return RightBinding.reset()
    },
    Closed: () => ParentDefinition.makeNoopStep(),
  },
)
export const foldRightOutMessage = ParentDefinition.makeOutMessageFold(
  ChildBlock,
  {
    Selected: ({ value }) =>
      ParentDefinition.makeFieldsStep(() => ({
        left: left => Struct.modifyFields(left, { value: () => value }),
      })),
    Closed: () => ParentDefinition.makeNoopStep(),
  },
)
export const foldRightReciprocalOutMessage =
  ParentDefinition.makeOutMessageFold(ChildBlock, {
    Selected: () => LeftBinding.reset(),
    Closed: ParentDefinition.makeNoopStep,
  })
export const forwardLeftOutMessage = ParentDefinition.makeOutMessageForward(
  ChildBlock,
  {
    Selected: ({ value }) => ParentOutMessage.ForwardedSelection({ value }),
    Closed: () => undefined,
  },
)

export const rawFoldWithContext = (
  _outMessage: typeof ChildOutMessage.Type,
  _context: Update.FoldContext<
    typeof ChildMessage.Type,
    typeof ParentMessage.Type,
    typeof ParentModel.Type
  >,
) => ParentDefinition.makeNoopStep()

const rawFoldWithoutContext = (_outMessage: typeof ChildOutMessage.Type) =>
  ParentDefinition.makeNoopStep()

declare const rawFoldUnion:
  | typeof rawFoldWithContext
  | typeof rawFoldWithoutContext

export const LeftBindingWithRawFoldUnion = LeftBinding.withOutMessagePolicy({
  fold: rawFoldUnion,
})

export const LeftBindingWithOutMessagePolicy = LeftBinding.withOutMessagePolicy(
  {
    fold: foldLeftOutMessage,
    forward: forwardLeftOutMessage,
  },
)
export const RightBindingWithOutMessagePolicy =
  RightBinding.withOutMessagePolicy({
    fold: foldRightOutMessage,
  })
export const LeftBindingWithReciprocalOutMessagePolicy =
  LeftBinding.withOutMessagePolicy({ fold: foldLeftOutMessage })
export const RightBindingWithReciprocalOutMessagePolicy =
  RightBinding.withOutMessagePolicy({ fold: foldRightReciprocalOutMessage })
export const LeftBindingWithInlineOutMessagePolicy =
  LeftBinding.withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
      Selected: ({ value }, context) => {
        const exactValue: string = value
        const exactContext: Update.FoldContext<
          typeof ChildMessage.Type,
          typeof ParentMessage.Type,
          typeof ParentModel.Type
        > = context
        void exactValue
        void exactContext

        return Update.combineSteps([
          ParentDefinition.makeStep(model => ({
            model,
            commands: [context.liftCommand(ResetChild())],
          })),
          RightBinding.reset(),
        ])
      },
      Closed: ParentDefinition.makeNoopStep,
    }),
    forward: ParentDefinition.makeOutMessageForward({
      Selected: ({ value }) => ParentOutMessage.ForwardedSelection({ value }),
      Closed: () => undefined,
    }),
  })
export const RefinedBindingWithInlineOutMessagePolicy =
  RefinedBinding.withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(RefinedChildBlock, {
      Selected: ({ value }) => {
        const exactValue: 'Refined' = value
        void exactValue

        return ParentDefinition.makeFieldsStep(() => ({
          left: left => Struct.modifyFields(left, { value: () => value }),
        }))
      },
      Closed: ParentDefinition.makeNoopStep,
    }),
  })
export const RefinedBindingWithAnnotatedOutMessagePolicy =
  RefinedBinding.withOutMessagePolicy({
    fold: exactContextAnnotatedFold,
    forward: exactContextAnnotatedForward,
  })
export const LeftBindingWithReselectedOutMessagePolicy =
  LeftBindingWithOutMessagePolicy.withOutMessagePolicy({
    fold: foldLeftOutMessage,
    forward: forwardLeftOutMessage,
  })

export const EntriesBinding = ParentDefinition.makeBinding(ChildBlock, {
  readAll: model => model.entries,
  key: entry => entry.id,
  keySchema: Entry.fields.id,
  read: entry => entry.child,
  writeAt: (model, id, nextChild) =>
    Struct.modifyFields(model, {
      entries: entries =>
        Array.map(entries, entry =>
          entry.id === id
            ? Struct.modifyFields(entry, { child: () => nextChild })
            : entry,
        ),
    }),
})
export const EntriesBindingWithOutMessagePolicy =
  EntriesBinding.withOutMessagePolicy({
    fold: (id, outMessage, context) => {
      const exactId: string = id
      const exactOutMessage: typeof ChildOutMessage.Type = outMessage
      const exactContext: Update.FoldContext<
        typeof ChildMessage.Type,
        typeof ParentMessage.Type,
        typeof ParentModel.Type
      > = context
      void exactId
      void exactOutMessage
      void exactContext

      return ParentDefinition.makeNoopStep()
    },
  })

export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [
    LeftBindingWithOutMessagePolicy,
    RightBindingWithOutMessagePolicy,
    EntriesBindingWithOutMessagePolicy,
  ],
})
export const ReselectedPolicyComposition = ParentDefinition.makeComposition({
  bindings: [
    LeftBindingWithReselectedOutMessagePolicy,
    RightBindingWithOutMessagePolicy,
    EntriesBindingWithOutMessagePolicy,
  ],
})
export const InlinePolicyComposition = ParentDefinition.makeComposition({
  bindings: [
    LeftBindingWithInlineOutMessagePolicy,
    RightBindingWithOutMessagePolicy,
    EntriesBindingWithOutMessagePolicy,
  ],
})
export const ReciprocalPolicyComposition = ParentDefinition.makeComposition({
  bindings: [
    LeftBindingWithReciprocalOutMessagePolicy,
    RightBindingWithReciprocalOutMessagePolicy,
    EntriesBindingWithOutMessagePolicy,
  ],
})
export const RefinedInlinePolicyComposition = ParentDefinition.makeComposition({
  bindings: [RefinedBindingWithInlineOutMessagePolicy],
})
export const RefinedAnnotatedPolicyComposition =
  ParentDefinition.makeComposition({
    bindings: [RefinedBindingWithAnnotatedOutMessagePolicy],
  })

export const leftOperation = LeftBindingWithOutMessagePolicy.reset()
export const leftInit = LeftBindingWithOutMessagePolicy.init({
  args: [],
  toParentModel: child =>
    ParentModel.make({
      left: child,
      right: ChildModel.make({ value: '' }),
      entries: [],
    }),
})
export const leftView = LeftBindingWithOutMessagePolicy.embedView({
  slotId: 'left',
  model: ChildModel.make({ value: '' }),
})

const prepareInlinePolicyBlock = () =>
  InlinePolicyComposition.prepareBlock({
    init: InlinePolicyComposition.makeInit(() => ({ model: { entries: [] } })),
    update: InlinePolicyComposition.makeUpdate({
      Reflected: model => ({ model }),
    }),
  })
export const InlinePolicyBlock: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareInlinePolicyBlock
> = Block.assemble(prepareInlinePolicyBlock)

const prepareReciprocalPolicyBlock = () =>
  ReciprocalPolicyComposition.prepareBlock({
    init: ReciprocalPolicyComposition.makeInit(() => ({
      model: { entries: [] },
    })),
    update: ReciprocalPolicyComposition.makeUpdate({
      Reflected: model => ({ model }),
    }),
  })
export const ReciprocalPolicyBlock: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareReciprocalPolicyBlock
> = Block.assemble(prepareReciprocalPolicyBlock)

type LeftPolicy =
  typeof LeftBindingWithOutMessagePolicy extends Block.BindingPolicyEvidence<
    infer Policy
  >
    ? Policy
    : never
type EntriesPolicy =
  typeof EntriesBindingWithOutMessagePolicy extends Block.BindingPolicyEvidence<
    infer Policy
  >
    ? Policy
    : never
type InlineLeftPolicy =
  typeof LeftBindingWithInlineOutMessagePolicy extends Block.BindingPolicyEvidence<
    infer Policy
  >
    ? Policy
    : never

export type PolicySelectionAssertions = readonly [
  Expect<Equal<Parameters<LeftPolicy['fold']>[0], typeof ChildOutMessage.Type>>,
  Expect<
    Equal<
      Parameters<LeftPolicy['fold']>[1],
      Update.FoldContext<
        typeof ChildMessage.Type,
        typeof ParentMessage.Type,
        typeof ParentModel.Type
      >
    >
  >,
  Expect<
    Equal<
      Parameters<NonNullable<LeftPolicy['forward']>>[0],
      typeof ChildOutMessage.Type
    >
  >,
  Expect<Equal<Parameters<EntriesPolicy['fold']>[0], string>>,
  Expect<
    Equal<
      Update.RequirementsOf<ReturnType<InlineLeftPolicy['fold']>>,
      Command.HandlerOf<typeof ResetChild>
    >
  >,
  Expect<
    Equal<
      Parameters<InlineLeftPolicy['fold']>,
      [
        outMessage: typeof ChildOutMessage.Type,
        context: Update.FoldContext<
          typeof ChildMessage.Type,
          typeof ParentMessage.Type,
          typeof ParentModel.Type
        >,
      ]
    >
  >,
  Expect<Equal<Parameters<typeof LeftBindingWithOutMessagePolicy.reset>, []>>,
  Expect<
    Equal<
      Parameters<typeof LeftBindingWithReselectedOutMessagePolicy.reset>,
      []
    >
  >,
]

export const ReusedParentComposition = ParentDefinition.makeComposition({
  bindings: ParentComposition.bindings,
})
