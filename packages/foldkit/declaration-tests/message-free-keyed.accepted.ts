import { Array, Context, Effect, Layer, Schema } from 'effect'
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

export const SilentModel = Schema.Struct({
  id: Schema.String,
  ready: Schema.Boolean,
})

class SilentClient extends Context.Service<
  SilentClient,
  Readonly<{ wait: Effect.Effect<never> }>
>()('StrictRoutingGeneralKeyedNever/SilentClient') {}

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const SilentDefinition = Block.makeDefinition(
  'StrictRoutingGeneralKeyedNeverChild',
  {
    Model: SilentModel,
    Message: Schema.Never,
  },
)
const WaitForever = SilentDefinition.makeCommand('WaitForever', {
  messages: [],
  handler: function* () {
    const client = yield* SilentClient
    return () => client.wait
  },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const SilentComposition = SilentDefinition.makeComposition()
const prepareSilentBlock = () =>
  SilentComposition.prepareBlock({
    init: SilentComposition.makeInit((id: string) => ({
      model: SilentModel.make({ id, ready: false }),
      commands: [WaitForever()],
    })),
    update: SilentComposition.makeUpdate({}),
    EffectsLayer: WaitForever.layer,
  })
export const SilentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SilentModel,
  typeof prepareSilentBlock
> = Block.assemble(prepareSilentBlock)

export const Entry = Schema.Struct({
  key: Schema.String,
  silent: SilentModel,
})
export const ParentModel = Schema.Struct({ entries: Schema.Array(Entry) })
export const ParentMessage = defineMessageUnion({ ClickedParent: {} })
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ParentDefinition = Block.makeDefinition(
  'StrictRoutingGeneralKeyedNeverParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

export const GeneralKeyedBinding = ParentDefinition.makeBinding(SilentBlock, {
  placement: 'general-silent',
  readAll: model => {
    const proof: Expect<Equal<typeof model, typeof ParentModel.Type>> = true
    void proof
    return model.entries
  },
  key: entry => {
    const proof: Expect<Equal<typeof entry, typeof Entry.Type>> = true
    void proof
    return entry.key
  },
  read: entry => {
    const proof: Expect<Equal<typeof entry, typeof Entry.Type>> = true
    void proof
    return entry.silent
  },
  writeAt: (model, key, nextSilent) => {
    const modelProof: Expect<Equal<typeof model, typeof ParentModel.Type>> =
      true
    const keyProof: Expect<Equal<typeof key, string>> = true
    const childProof: Expect<
      Equal<typeof nextSilent, typeof SilentModel.Type>
    > = true
    void modelProof
    void keyProof
    void childProof

    return modifyFields(model, {
      entries: Array.map(entry =>
        entry.key === key
          ? modifyFields(entry, { silent: () => nextSilent })
          : entry,
      ),
    })
  },
})

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [GeneralKeyedBinding],
})
export const initializeGeneral = ParentDefinition.makeStep(
  (model, key: string) =>
    GeneralKeyedBinding.init({
      key,
      args: [key],
      toParentModel: silent =>
        modifyFields(model, {
          entries: Array.append(Entry.make({ key, silent })),
        }),
    }),
)
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({ model: { entries: [] } })),
    update: ParentComposition.makeUpdate({
      ClickedParent: model => ({ model }),
    }),
  })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

type InitializationRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initializeGeneral>,
    Block.Scoped<'general-silent', Command.HandlerOf<typeof WaitForever>>
  >
>
type LayerInput<LayerValue> =
  // oxlint-disable-next-line typescript/no-explicit-any -- This fixture deliberately probes erased any channels or detects any in an inferred public type.
  LayerValue extends Layer.Layer<any, any, infer Requirements>
    ? Requirements
    : never
type LayerRequirements = Expect<
  Equal<LayerInput<typeof ParentBlock.EffectsLayer>, SilentClient>
>

const operationRequirementsProof: InitializationRequirements = true
const layerRequirementsProof: LayerRequirements = true
void operationRequirementsProof
void layerRequirementsProof
