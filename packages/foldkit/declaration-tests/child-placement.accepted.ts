import { Option, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'

export const ChildModel = Schema.Struct({ value: Schema.String })
export const ChildMessage = Message.defineMessageUnion({
  UpdatedValue: { value: Schema.String },
})

const DeclarationChildPlacementChild = Block.define(
  'DeclarationChildPlacementChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
const DeclarationChildPlacementChildComposition =
  DeclarationChildPlacementChild.makeComposition()

export const ChildBlock = DeclarationChildPlacementChildComposition.makeBlock({
  init: DeclarationChildPlacementChildComposition.makeInit(() => ({
    model: ChildModel.make({ value: '' }),
  })),
  update: DeclarationChildPlacementChildComposition.makeUpdate(model => ({
    model,
  })),
})

const Entry = Schema.Struct({
  id: Schema.String,
  child: ChildModel,
})

export const ParentModel = Schema.Struct({
  primary: ChildModel,
  secondary: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  entries: Schema.Array(Entry),
})

export const DeclarationChildPlacementParent = Block.define(
  'DeclarationChildPlacementParent',
  {
    Model: ParentModel,
    Message: ChildMessage,
  },
)

export const PrimaryBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    field: 'primary',
    toParentMessage: message => message,
    fromParentMessage: false,
  },
)

export const SecondaryBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    field: 'secondary',
    placement: 'secondaryPlacement',
    toParentMessage: message => message,
    fromParentMessage: false,
  },
)

export const OptionalBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    placement: 'optional',
    read: model => model.maybeChild,
    write: (model, nextChild) =>
      Struct.modifyFields(model, {
        maybeChild: () => Option.some(nextChild),
      }),
    toParentMessage: message => message,
    fromParentMessage: false,
  },
)

export const EntriesBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    placement: 'entries',
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (_id, message) => message,
    fromParentMessage: false,
  },
)

export const DefaultAccessorBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    read: model => model.maybeChild,
    write: (model, nextChild) =>
      Struct.modifyFields(model, {
        maybeChild: () => Option.some(nextChild),
      }),
    toParentMessage: message => message,
    fromParentMessage: false,
  },
)

export const EntriesByIdBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    placement: 'entriesById',
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (_id, message) => message,
    fromParentMessage: false,
  },
)

export const EntriesByIdLengthBinding =
  DeclarationChildPlacementParent.bindChild(ChildBlock, {
    placement: 'entriesByIdLength',
    readAll: model => model.entries,
    key: entry => entry.id.length,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (_idLength, message) => message,
    fromParentMessage: false,
  })

export const DeclarationChildPlacementParentComposition =
  DeclarationChildPlacementParent.makeComposition({
    childBindings: [
      PrimaryBinding,
      SecondaryBinding,
      OptionalBinding,
      EntriesBinding,
    ],
  })

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This second graph tests default placements under the same parent identity.
export const DefaultPlacementComposition =
  DeclarationChildPlacementParent.makeComposition({
    childBindings: [
      DefaultAccessorBinding,
      EntriesByIdBinding,
      EntriesByIdLengthBinding,
    ],
  })

export const composeDynamicChildren = (
  childBindings: ReadonlyArray<typeof PrimaryBinding>,
) => DeclarationChildPlacementParent.makeComposition({ childBindings })
