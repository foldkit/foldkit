import { Option, Schema } from 'effect'
import { Block, Struct } from 'foldkit'

export const ChildModel = Schema.Struct({ value: Schema.String })
export const ChildMessage = Schema.Never

const DeclarationChildPlacementChildComposition = Block.makeDefinition(
  'DeclarationChildPlacementChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()

const prepareChildBlock = () =>
  DeclarationChildPlacementChildComposition.prepareBlock({
    init: DeclarationChildPlacementChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: '' }),
    })),
    update: DeclarationChildPlacementChildComposition.makeUpdate({}),
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

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

export const DeclarationChildPlacementParentDefinition = Block.makeDefinition(
  'DeclarationChildPlacementParent',
  {
    Model: ParentModel,
    Message: ChildMessage,
  },
)

export const PrimaryBinding =
  DeclarationChildPlacementParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'primary',
    },
  )

export const SecondaryBinding =
  DeclarationChildPlacementParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'secondary',
      placement: 'secondaryPlacement',
    },
  )

export const OptionalBinding =
  DeclarationChildPlacementParentDefinition.makeCustomBinding(ChildBlock, {
    placement: 'optional',
    read: model => model.maybeChild,
    write: (model, nextChild) =>
      Struct.modifyFields(model, {
        maybeChild: () => Option.some(nextChild),
      }),
  })

export const EntriesBinding =
  DeclarationChildPlacementParentDefinition.makeCustomKeyedBinding(ChildBlock, {
    placement: 'entries',
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
  })

export const DefaultAccessorBinding =
  DeclarationChildPlacementParentDefinition.makeCustomBinding(ChildBlock, {
    read: model => model.maybeChild,
    write: (model, nextChild) =>
      Struct.modifyFields(model, {
        maybeChild: () => Option.some(nextChild),
      }),
  })

export const EntriesByIdBinding =
  DeclarationChildPlacementParentDefinition.makeCustomKeyedBinding(ChildBlock, {
    placement: 'entriesById',
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
  })

export const EntriesByIdLengthBinding =
  DeclarationChildPlacementParentDefinition.makeCustomKeyedBinding(ChildBlock, {
    placement: 'entriesByIdLength',
    readAll: model => model.entries,
    key: entry => entry.id.length,
    read: entry => entry.child,
    writeAt: model => model,
  })

export const DeclarationChildPlacementParentComposition =
  DeclarationChildPlacementParentDefinition.makeComposition({
    bindings: [
      PrimaryBinding,
      SecondaryBinding,
      OptionalBinding,
      EntriesBinding,
    ],
  })

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This second graph tests default placements under the same parent identity.
export const DefaultPlacementComposition =
  DeclarationChildPlacementParentDefinition.makeComposition({
    bindings: [
      DefaultAccessorBinding,
      EntriesByIdBinding,
      EntriesByIdLengthBinding,
    ],
  })

export const composeDynamicChildren = (
  bindings: ReadonlyArray<typeof PrimaryBinding>,
) => DeclarationChildPlacementParentDefinition.makeComposition({ bindings })
