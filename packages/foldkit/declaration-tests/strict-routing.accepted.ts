import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type Expect<Value extends true> = Value

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
})

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ChildComposition = Block.makeDefinition('StrictRoutingChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: ChildComposition.makeUpdate({
      ChangedCount: (model, message) => ({
        model: modifyFields(model, {
          count: count => count + message.amount,
        }),
      }),
    }),
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

type DispatchContext = Readonly<{ multiplier: number }>

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ContextChildComposition = Block.makeDefinition(
  'StrictRoutingContextChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareContextChildBlock = () =>
  ContextChildComposition.prepareBlock({
    init: ContextChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: ContextChildComposition.makeUpdate.withContext(
      (context: DispatchContext) => ({
        ChangedCount: (model, message) => ({
          model: modifyFields(model, {
            count: count => count + message.amount * context.multiplier,
          }),
        }),
      }),
    ),
  })
export const ContextChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareContextChildBlock
> = Block.assemble(prepareContextChildBlock)

const Entry = Schema.Struct({
  id: Schema.String,
  child: ChildModel,
})
export const ParentModel = Schema.Struct({
  child: ChildModel,
  contextualChild: ChildModel,
  entries: Schema.Array(Entry),
  multiplier: Schema.Number,
  resets: Schema.Number,
})
export const ParentMessage = defineMessageUnion({
  ClickedReset: {},
})

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ParentDefinition = Block.makeDefinition('StrictRoutingParent', {
  Model: ParentModel,
  Message: ParentMessage,
})

export const CanonicalBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})

export const ContextBinding = ParentDefinition.makeBinding(ContextChildBlock, {
  field: 'contextualChild',
  delivery: {
    toUpdateContext: model => [{ multiplier: model.multiplier }],
  },
})

export const KeyedBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  delivery: {
    when: (_model, id) => id === 'active',
  },
})

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [CanonicalBinding, ContextBinding, KeyedBinding],
})

export const parentUpdate = ParentComposition.makeUpdate({
  ClickedReset: (model, message) => {
    type AuthoredMessageIsLocal = Expect<
      Equal<typeof message, typeof ParentMessage.ClickedReset.Type>
    >
    const _proof: AuthoredMessageIsLocal = true
    void _proof
    return {
      model: modifyFields(model, { resets: resets => resets + 1 }),
    }
  },
})

export const parentModel = ParentModel.make({
  child: ChildModel.make({ count: 0 }),
  contextualChild: ChildModel.make({ count: 0 }),
  entries: [Entry.make({ id: 'active', child: ChildModel.make({ count: 0 }) })],
  multiplier: 3,
  resets: 0,
})

export const rawFullMessageUpdate = (
  model: typeof ParentModel.Type,
  _message: typeof ParentMessage.Type,
) => ({
  model: modifyFields(model, {
    resets: resets => resets + 1,
  }),
})

const prepareRawCompletionBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({
      model: {
        entries: [],
        multiplier: 1,
        resets: 0,
      },
    })),
    update: rawFullMessageUpdate,
  })
export const RawCompletionBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRawCompletionBlock
> = Block.assemble(prepareRawCompletionBlock)

const prepareGeneratedCompletionBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({
      model: {
        entries: [],
        multiplier: 1,
        resets: 0,
      },
    })),
    update: parentUpdate,
  })
export const GeneratedCompletionBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareGeneratedCompletionBlock
> = Block.assemble(prepareGeneratedCompletionBlock)

type RawUpdateSignatureIsPreserved = Expect<
  Equal<typeof RawCompletionBlock.update, typeof rawFullMessageUpdate>
>

const rawUpdateSignatureProof: RawUpdateSignatureIsPreserved = true
void rawUpdateSignatureProof

const SilentModel = Schema.Struct({ ready: Schema.Boolean })
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const SilentDefinition = Block.makeDefinition('StrictRoutingSilent', {
  Model: SilentModel,
  Message: Schema.Never,
})
class SilentClient extends Context.Service<
  SilentClient,
  Readonly<{ wait: Effect.Effect<never> }>
>()('StrictRouting/SilentClient') {}
const WaitForever = SilentDefinition.makeCommand('WaitForever', {
  messages: [],
  handler: function* () {
    const client = yield* SilentClient
    return () => client.wait
  },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const SilentComposition = SilentDefinition.makeComposition()
export const silentUpdate = SilentComposition.makeUpdate({})
const prepareSilentBlock = () =>
  SilentComposition.prepareBlock({
    init: SilentComposition.makeInit(() => ({
      model: SilentModel.make({ ready: true }),
      commands: [WaitForever()],
    })),
    update: silentUpdate,
    EffectsLayer: WaitForever.layer,
  })
export const SilentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SilentModel,
  typeof prepareSilentBlock
> = Block.assemble(prepareSilentBlock)

const SilentParentModel = Schema.Struct({ silent: SilentModel })
const SilentParentMessage = defineMessageUnion({
  ClickedParent: {},
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const SilentParentDefinition = Block.makeDefinition(
  'StrictRoutingSilentParent',
  {
    Model: SilentParentModel,
    Message: SilentParentMessage,
  },
)

export const SilentBinding = SilentParentDefinition.makeBinding(SilentBlock, {
  field: 'silent',
})

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const SilentParentComposition = SilentParentDefinition.makeComposition({
  bindings: [SilentBinding],
})
export const initializeSilent = SilentParentDefinition.makeStep(model =>
  SilentBinding.init({
    args: [],
    toParentModel: silent => modifyFields(model, { silent: () => silent }),
  }),
)
const prepareSilentParentBlock = () =>
  SilentParentComposition.prepareBlock({
    init: SilentParentComposition.makeInit(() => ({
      model: {},
    })),
    update: SilentParentComposition.makeUpdate({
      ClickedParent: model => ({ model }),
    }),
  })
export const SilentParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SilentParentModel,
  typeof prepareSilentParentBlock
> = Block.assemble(prepareSilentParentBlock)

const ImpossibleParentMessage = defineMessageUnion({
  GotImpossible: { message: Schema.Never },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ImpossibleParentComposition = Block.makeDefinition(
  'StrictRoutingImpossibleParent',
  {
    Model: Schema.Null,
    Message: ImpossibleParentMessage,
  },
).makeComposition()

type SilentUpdateParameters = Expect<
  Equal<
    Parameters<typeof silentUpdate>,
    [model: typeof SilentModel.Type, message: never]
  >
>

const silentUpdateParametersProof: SilentUpdateParameters = true
void silentUpdateParametersProof

type SilentOperationRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initializeSilent>,
    Block.Scoped<'silent', Command.HandlerOf<typeof WaitForever>>
  >
>
type LayerInput<LayerValue> =
  // oxlint-disable-next-line typescript/no-explicit-any -- This fixture deliberately probes erased any channels or detects any in an inferred public type.
  LayerValue extends Layer.Layer<any, any, infer Requirements>
    ? Requirements
    : never
type SilentLayerRequirements = Expect<
  Equal<LayerInput<typeof SilentParentBlock.EffectsLayer>, SilentClient>
>

const silentOperationRequirementsProof: SilentOperationRequirements = true
const silentLayerRequirementsProof: SilentLayerRequirements = true
void silentOperationRequirementsProof
void silentLayerRequirementsProof
