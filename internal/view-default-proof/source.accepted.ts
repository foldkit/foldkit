import { Effect, Schema } from 'effect'
import { Block, Message, Program } from 'foldkit'
import type { Html } from 'foldkit/html'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const Model = Schema.Struct({ value: Schema.String })
type Model = typeof Model.Type
const LocalMessage = Message.defineMessageUnion({ ClickedValue: {} })

const DefaultElementKey = Symbol('ViewDefaultElement')
const DefaultElementBlock = Block.make('ViewDefaultElement', {
  key: DefaultElementKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
})
const DefaultElementComposition = DefaultElementBlock.makeComposition()
export type DefaultElementBuilder = Block.ViewBuilderFor<
  typeof DefaultElementComposition
>
const renderValue = (model: Model, h: DefaultElementBuilder): Html =>
  h.div([], [model.value])
const defaultElementView = DefaultElementComposition.makeView(renderValue)
export const defaultElementInputsView =
  DefaultElementComposition.makeView.withInputs((model, inputs, h) => {
    type DefaultElementInputs = Expect<Equal<typeof inputs, void>>
    const _defaultElementInputs: DefaultElementInputs = true
    void _defaultElementInputs
    return h.div([], [model.value])
  })
export const defaultElementLayer = DefaultElementBlock.makeLayer({
  init: DefaultElementComposition.makeInit(() => ({
    model: { value: 'default' },
  })),
  update: DefaultElementComposition.makeUpdate({
    ClickedValue: model => ({ model }),
  }),
  view: defaultElementView,
})
export const defaultElementProgram = Program.makeElement({
  block: DefaultElementBlock,
  layer: defaultElementLayer,
  container: null,
})

export const Inputs = Schema.Struct({ label: Schema.String })
type Inputs = typeof Inputs.Type
const makeGenericInputsDefinition = <Value, Encoded>(
  Value: Schema.Codec<Value, Encoded, never, never>,
) => {
  const GenericInputs = Schema.Struct({ value: Value })
  const key = Symbol('ViewDefaultGenericInputs')
  return Block.make('ViewDefaultGenericInputs', {
    key,
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view: { Inputs: GenericInputs },
  })
}
void makeGenericInputsDefinition(Schema.Number)
const forwardStaticInputsDefinition = <
  const View extends Readonly<{
    kind?: 'Element'
    Inputs: typeof Inputs
    mounts?: never
  }>,
>(
  view: View,
) => {
  const key = Symbol('ViewDefaultForwardedStaticInputs')
  return Block.make('ViewDefaultForwardedStaticInputs', {
    key,
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view,
  })
}
const InputsElementKey = Symbol('ViewDefaultInputsElement')
const InputsElementBlock = Block.make('ViewDefaultInputsElement', {
  key: InputsElementKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: { Inputs },
})
const InputsElementComposition = InputsElementBlock.makeComposition()
const inputsElementView = InputsElementComposition.makeView.withInputs(
  (model, inputs: Inputs, h) => h.div([], [`${inputs.label}: ${model.value}`]),
)
export const inputsElementLayer = InputsElementBlock.makeLayer({
  init: InputsElementComposition.makeInit(() => ({
    model: { value: 'inputs' },
  })),
  update: InputsElementComposition.makeUpdate({
    ClickedValue: model => ({ model }),
  }),
  view: inputsElementView,
})

// @ts-expect-error A generic Element forwarder cannot add a Document kind.
forwardStaticInputsDefinition({ Inputs, kind: 'Document' })
// @ts-expect-error A generic Element forwarder requires mounts to be explicitly absent.
forwardStaticInputsDefinition({ Inputs, mounts: [] })

const DocumentKey = Symbol('ViewDefaultDocument')
const forwardStaticDocumentDefinition = <
  const View extends Readonly<{
    kind: 'Document'
    Inputs?: never
    mounts?: never
  }>,
>(
  view: View,
) => {
  const key = Symbol('ViewDefaultForwardedStaticDocument')
  return Block.make('ViewDefaultForwardedStaticDocument', {
    key,
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view,
  })
}
const DocumentBlock = Block.make('ViewDefaultDocument', {
  key: DocumentKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

// @ts-expect-error A generic Document forwarder cannot add Element Inputs.
forwardStaticDocumentDefinition({ kind: 'Document', Inputs })
// @ts-expect-error A generic Document forwarder requires mounts to be explicitly absent.
forwardStaticDocumentDefinition({ kind: 'Document', mounts: [] })
const DocumentComposition = DocumentBlock.makeComposition()
export const documentLayer = DocumentBlock.makeLayer({
  init: DocumentComposition.makeInit(() => ({
    model: { value: 'document' },
  })),
  update: DocumentComposition.makeUpdate({
    ClickedValue: model => ({ model }),
  }),
  view: DocumentComposition.makeView(model => ({
    title: model.value,
    body: null,
  })),
})
export const documentProgram = Program.make({
  block: DocumentBlock,
  layer: documentLayer,
  container: null,
})

const ViewlessKey = Symbol('ViewDefaultViewless')
const ViewlessBlock = Block.make('ViewDefaultViewless', {
  key: ViewlessKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const ViewlessComposition = ViewlessBlock.makeComposition()
export const viewlessLayer = ViewlessBlock.makeLayer({
  init: ViewlessComposition.makeInit(() => ({
    model: { value: 'viewless' },
  })),
  update: ViewlessComposition.makeUpdate({
    ClickedValue: model => ({ model }),
  }),
})

const WholeConfigurationUnionKey = Symbol('ViewDefaultWholeUnion')
const wholeConfigurationUnion = null as unknown as
  | {
      readonly key: typeof WholeConfigurationUnionKey
      readonly Model: typeof Model
      readonly Message: typeof LocalMessage
      readonly InitArgs: Schema.Tuple<readonly []>
      readonly view: false
    }
  | {
      readonly key: typeof WholeConfigurationUnionKey
      readonly Model: typeof Model
      readonly Message: typeof LocalMessage
      readonly InitArgs: Schema.Tuple<readonly []>
    }
export const WholeConfigurationUnionBlock = Block.make(
  'ViewDefaultWholeUnion',
  wholeConfigurationUnion,
)
export const WholeConfigurationUnionComposition =
  WholeConfigurationUnionBlock.makeComposition()

const PropertyInputsUnionKey = Symbol('ViewDefaultPropertyInputsUnion')
const propertyInputsUnionView = null as unknown as
  | { readonly Inputs: typeof Inputs }
  | {}
export const PropertyInputsUnionBlock = Block.make(
  'ViewDefaultPropertyInputsUnion',
  {
    key: PropertyInputsUnionKey,
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view: propertyInputsUnionView,
  },
)
export const PropertyInputsUnionComposition =
  PropertyInputsUnionBlock.makeComposition()
export const propertyInputsUnionAuthoredView =
  PropertyInputsUnionComposition.makeView.withInputs((model, inputs, h) => {
    type PropertyInputs = Expect<Equal<typeof inputs, Inputs | void>>
    const _propertyInputs: PropertyInputs = true
    void _propertyInputs
    return h.div([], [model.value])
  })

const WholeInputsUnionKey = Symbol('ViewDefaultWholeInputsUnion')
const wholeInputsUnion = null as unknown as
  | {
      readonly key: typeof WholeInputsUnionKey
      readonly Model: typeof Model
      readonly Message: typeof LocalMessage
      readonly InitArgs: Schema.Tuple<readonly []>
      readonly view: { readonly Inputs: typeof Inputs }
    }
  | {
      readonly key: typeof WholeInputsUnionKey
      readonly Model: typeof Model
      readonly Message: typeof LocalMessage
      readonly InitArgs: Schema.Tuple<readonly []>
    }
export const WholeInputsUnionBlock = Block.make(
  'ViewDefaultWholeInputsUnion',
  wholeInputsUnion,
)
export const WholeInputsUnionComposition =
  WholeInputsUnionBlock.makeComposition()
export const wholeInputsUnionAuthoredView =
  WholeInputsUnionComposition.makeView.withInputs((model, inputs, h) => {
    type WholeInputs = Expect<Equal<typeof inputs, Inputs | void>>
    const _wholeInputs: WholeInputs = true
    void _wholeInputs
    return h.div([], [model.value])
  })

const AlternateInputs = Schema.Struct({ prefix: Schema.String })
type AlternateInputs = typeof AlternateInputs.Type
const alternateView = ViewlessComposition.makeView.withInputs<AlternateInputs>(
  (model, { prefix }, h) => h.div([], [`${prefix}: ${model.value}`]),
)
const ParentKey = Symbol('ViewDefaultParent')
const ParentBlock = Block.make('ViewDefaultParent', {
  key: ParentKey,
  Model: Schema.Struct({ child: ViewlessBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const ChildBinding = ParentBlock.makeRequiredFieldBinding(ViewlessBlock, {
  field: 'child',
})
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChildBinding],
})
export const parentLayer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const child = yield* ChildBinding

    return {
      children: [child],
      init: ParentComposition.makeInit(() => ({ model: {} })),
      update: ParentComposition.makeUpdate({}),
      view: ParentComposition.makeView((model, h) =>
        h.block(
          ChildBinding.embedView({
            slotId: 'child',
            model: model.child,
            view: alternateView,
            viewInputs: { prefix: 'Alternate' },
          }),
        ),
      ),
    }
  }),
)

export const makeGenericAlternateView = <Item>() =>
  ViewlessComposition.makeView.withInputs<{
    items: ReadonlyArray<Item>
    itemToView: (item: Item) => Html
  }>((_model, inputs, h) => h.div([], inputs.items.map(inputs.itemToView)))

const LegacyComposition = Block.makeDefinition('ViewDefaultLegacy', {
  Model,
  Message: LocalMessage,
}).makeComposition()
const prepareLegacy = () =>
  LegacyComposition.prepareBlock({
    init: LegacyComposition.makeInit(() => ({ model: { value: 'legacy' } })),
    update: LegacyComposition.makeUpdate({
      ClickedValue: model => ({ model }),
    }),
  })
export const LegacyViewlessBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareLegacy
> = Block.assemble(prepareLegacy)

type DefaultView = Block.FactsOf<typeof DefaultElementBlock>['view']
type InputsView = Block.FactsOf<typeof InputsElementBlock>['view']
type DocumentView = Block.FactsOf<typeof DocumentBlock>['view']
type ViewlessView = Block.FactsOf<typeof ViewlessBlock>['view']
type WholeConfigurationUnionView = Block.FactsOf<
  typeof WholeConfigurationUnionBlock
>['view']
type PropertyInputsUnionView = Block.FactsOf<
  typeof PropertyInputsUnionBlock
>['view']
type WholeInputsUnionView = Block.FactsOf<typeof WholeInputsUnionBlock>['view']

export type Assertions = [
  Expect<Equal<DefaultView['kind'], 'Element'>>,
  Expect<Equal<DefaultView['inputs'], void>>,
  Expect<Equal<InputsView['kind'], 'Element'>>,
  Expect<Equal<InputsView['inputs'], typeof Inputs.Type>>,
  Expect<Equal<DocumentView['kind'], 'Document'>>,
  Expect<Equal<ViewlessView, undefined>>,
  Expect<Equal<WholeConfigurationUnionView, undefined | DefaultView>>,
  Expect<Equal<PropertyInputsUnionView['inputs'], Inputs | void>>,
  Expect<Equal<WholeInputsUnionView['inputs'], Inputs | void>>,
]
