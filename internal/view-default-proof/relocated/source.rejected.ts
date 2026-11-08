import { Effect, Schema } from 'effect'
import { AsyncData, Block, Message, Program } from 'foldkit'
import type { ContractConfiguration } from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'

import {
  WholeConfigurationUnionBlock,
  WholeConfigurationUnionComposition,
} from './emitted/source.accepted.js'

const Model = Schema.Struct({ value: Schema.String })
const LocalMessage = Message.defineMessageUnion({ ClickedValue: {} })

const InvalidKindKey = Symbol('ViewDefaultInvalidKind')
Block.make('ViewDefaultInvalidKind', {
  key: InvalidKindKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: {
    // @ts-expect-error Only Element and Document are supported view kinds.
    kind: 'Canvas',
  },
})

const InvalidDocumentInputsKey = Symbol('ViewDefaultInvalidDocumentInputs')
Block.make('ViewDefaultInvalidDocumentInputs', {
  key: InvalidDocumentInputsKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: 'Document',
    // @ts-expect-error Document views cannot declare element ViewInputs.
    Inputs: Schema.Struct({ label: Schema.String }),
  },
})

const DynamicViewKey = Symbol('ViewDefaultDynamicView')
const dynamicView = null as unknown as false | { readonly kind: 'Document' }
// @ts-expect-error A Block declaration chooses one static view contract.
Block.make('ViewDefaultDynamicView', {
  key: DynamicViewKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: dynamicView,
})

const DynamicInputs = Schema.Struct({ label: Schema.String })
const dynamicInputsView = null as unknown as
  | false
  | { readonly Inputs: typeof DynamicInputs }
// @ts-expect-error A viewless-or-Element union is not one static view contract.
Block.make('ViewDefaultDynamicInputsView', {
  key: Symbol('ViewDefaultDynamicInputsView'),
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: dynamicInputsView,
})

const dynamicElementOrDocumentView = null as unknown as
  | { readonly Inputs: typeof DynamicInputs }
  | { readonly kind: 'Document' }
// @ts-expect-error Element and Document alternatives must be separate declarations.
Block.make('ViewDefaultDynamicElementOrDocumentView', {
  key: Symbol('ViewDefaultDynamicElementOrDocumentView'),
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: dynamicElementOrDocumentView,
})

const dynamicKinds = null as unknown as
  | { readonly kind: 'Element' }
  | { readonly kind: 'Document' }
// @ts-expect-error Even input-free Element and Document alternatives are dynamic.
Block.make('ViewDefaultDynamicKinds', {
  key: Symbol('ViewDefaultDynamicKinds'),
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: dynamicKinds,
})

const widenedKind: 'Element' | 'Document' =
  Math.random() > 0.5 ? 'Element' : 'Document'
// @ts-expect-error A widened kind does not select one static host contract.
Block.make('ViewDefaultWidenedKind', {
  key: Symbol('ViewDefaultWidenedKind'),
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: widenedKind,
  },
})

const makeDynamicViewBlock = <
  View extends false | { readonly kind: 'Document' },
>(
  view: View,
) =>
  // @ts-expect-error A generic unresolved view alternative is not static.
  Block.make('ViewDefaultGenericDynamicView', {
    key: Symbol('ViewDefaultGenericDynamicView'),
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view,
  })
void makeDynamicViewBlock

const makeBroadViewBlock = (view: ContractConfiguration['view']) =>
  // @ts-expect-error A broad optional view cannot be projected as a precise Element contract.
  Block.make('ViewDefaultBroadView', {
    key: Symbol('ViewDefaultBroadView'),
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view,
  })
void makeBroadViewBlock

const makeOptionalInputsViewBlock = (view: {
  readonly Inputs?: typeof DynamicInputs
}) =>
  // @ts-expect-error Optional Inputs cannot project a precise Element input contract.
  Block.make('ViewDefaultOptionalInputsView', {
    key: Symbol('ViewDefaultOptionalInputsView'),
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view,
  })
void makeOptionalInputsViewBlock

const makeOptionalMountsViewBlock = (view: {
  readonly mounts?: ReadonlyArray<never>
}) =>
  // @ts-expect-error Optional mounts cannot project a precise published Mount registry.
  Block.make('ViewDefaultOptionalMountsView', {
    key: Symbol('ViewDefaultOptionalMountsView'),
    Model,
    Message: LocalMessage,
    InitArgs: Schema.Tuple([]),
    view,
  })
void makeOptionalMountsViewBlock

type BroadConfiguration = Omit<ContractConfiguration, 'key'> & {
  readonly Model: typeof Model
  readonly Message: typeof LocalMessage
}
const makeBroadConfigurationBlock = (configuration: BroadConfiguration) =>
  // @ts-expect-error A broad configuration with an optional view is not a static declaration.
  Block.make('ViewDefaultBroadConfiguration', {
    ...configuration,
    key: Symbol('ViewDefaultBroadConfiguration'),
  })
void makeBroadConfigurationBlock

const wholeUnionInit = WholeConfigurationUnionComposition.makeInit(() => ({
  model: { value: 'whole-union' },
}))
const wholeUnionUpdate = WholeConfigurationUnionComposition.makeUpdate({
  ClickedValue: model => ({ model }),
})
const wholeUnionElementView = WholeConfigurationUnionComposition.makeView(
  (model, h) => h.div([], [model.value]),
)
// @ts-expect-error One Element implementation cannot satisfy a viewless-or-Element contract union.
WholeConfigurationUnionBlock.makeLayer({
  init: wholeUnionInit,
  update: wholeUnionUpdate,
  view: wholeUnionElementView,
})
// @ts-expect-error One viewless implementation cannot satisfy a viewless-or-Element contract union.
WholeConfigurationUnionBlock.makeLayer({
  init: wholeUnionInit,
  update: wholeUnionUpdate,
})
const wholeUnionImplementation =
  Math.random() > 0.5
    ? {
        children: [],
        init: wholeUnionInit,
        update: wholeUnionUpdate,
        view: wholeUnionElementView,
      }
    : { children: [], init: wholeUnionInit, update: wholeUnionUpdate }
// @ts-expect-error A conditional union body cannot bypass exact every-provider view validation.
WholeConfigurationUnionBlock.makeLayer(Effect.succeed(wholeUnionImplementation))

const DefaultKey = Symbol('ViewDefaultMissingImplementation')
const DefaultBlock = Block.make('ViewDefaultMissingImplementation', {
  key: DefaultKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
})
const DefaultComposition = DefaultBlock.makeComposition()
const defaultInit = DefaultComposition.makeInit(() => ({
  model: { value: 'default' },
}))
const defaultUpdate = DefaultComposition.makeUpdate({
  ClickedValue: model => ({ model }),
})
// @ts-expect-error Omitted view declarations default to an Element view contract.
DefaultBlock.makeLayer({ init: defaultInit, update: defaultUpdate })

const WrongDocumentView = DefaultComposition.makeView(model => ({
  title: model.value,
  body: null,
}))
// @ts-expect-error A default Element contract rejects a Document implementation view.
DefaultBlock.makeLayer({
  init: defaultInit,
  update: defaultUpdate,
  view: WrongDocumentView,
})
const DefaultElementView = DefaultComposition.makeView((model, h) =>
  h.div([], [model.value]),
)
const validDefaultLayer = DefaultBlock.makeLayer({
  init: defaultInit,
  update: defaultUpdate,
  view: DefaultElementView,
})

const ViewlessKey = Symbol('ViewDefaultRejectedViewless')
const ViewlessBlock = Block.make('ViewDefaultRejectedViewless', {
  key: ViewlessKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const ViewlessComposition = ViewlessBlock.makeComposition()
const ViewlessDefault = ViewlessComposition.makeView((model, h) =>
  h.div([], [model.value]),
)
// @ts-expect-error Explicit view:false rejects a primary implementation view.
ViewlessBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: ViewlessComposition.makeInit(() => ({
      model: { value: 'viewless' },
    })),
    update: ViewlessComposition.makeUpdate({
      ClickedValue: model => ({ model }),
    }),
    view: ViewlessDefault,
  }),
)

const DocumentKey = Symbol('ViewDefaultRejectedDocument')
const DocumentBlock = Block.make('ViewDefaultRejectedDocument', {
  key: DocumentKey,
  Model,
  Message: LocalMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const DocumentComposition = DocumentBlock.makeComposition()
const documentInit = DocumentComposition.makeInit(() => ({
  model: { value: 'document' },
}))
const documentUpdate = DocumentComposition.makeUpdate({
  ClickedValue: model => ({ model }),
})
const ElementView = DocumentComposition.makeView((model, h) =>
  h.div([], [model.value]),
)
// @ts-expect-error A Document contract rejects an Element implementation view.
DocumentBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: documentInit,
    update: documentUpdate,
    view: ElementView,
  }),
)
const DocumentView = DocumentComposition.makeView(model => ({
  title: model.value,
  body: null,
}))
const validDocumentLayer = DocumentBlock.makeLayer({
  init: documentInit,
  update: documentUpdate,
  view: DocumentView,
})

// @ts-expect-error Program.make requires a Document root.
Program.make({ block: DefaultBlock, layer: validDefaultLayer, container: null })
// @ts-expect-error Program.makeElement rejects a Document root.
Program.makeElement({
  block: DocumentBlock,
  layer: validDocumentLayer,
  container: null,
})

const Notes = Query.define({
  name: 'ViewDefaultHeadlessQuery',
  data: Schema.Array(Schema.String),
  error: Schema.String,
})
const QueryParentKey = Symbol('ViewDefaultQueryParent')
const QueryParent = Block.make('ViewDefaultQueryParent', {
  key: QueryParentKey,
  Model: Schema.Struct({ notes: Notes.Model }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const NotesBinding = QueryParent.makeRequiredFieldBinding(Notes, {
  field: 'notes',
})
// @ts-expect-error Legacy Query Blocks remain source-free and require an explicit alternate view.
NotesBinding.embedView({
  slotId: 'notes',
  model: Notes.Model.make({ data: AsyncData.Idle(), generation: 0 }),
})
