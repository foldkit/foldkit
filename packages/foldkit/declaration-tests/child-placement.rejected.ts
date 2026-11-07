import { Option } from 'effect'

import {
  ChildBlock,
  DeclarationChildPlacementParentDefinition,
  OptionalBinding,
  PrimaryBinding,
} from './child-placement.accepted.js'

const DirectAtPrimaryBinding =
  DeclarationChildPlacementParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'secondary',
      placement: 'primary',
    },
  )

const KeyedAtOptionalBinding =
  DeclarationChildPlacementParentDefinition.makeCustomKeyedBinding(ChildBlock, {
    placement: 'optional',
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
  })

const AccessorAtPrimaryBinding =
  DeclarationChildPlacementParentDefinition.makeCustomBinding(ChildBlock, {
    placement: 'primary',
    read: model => Option.some(model.secondary),
    write: model => model,
  })

const DefaultAccessorBinding =
  DeclarationChildPlacementParentDefinition.makeCustomBinding(ChildBlock, {
    read: model => model.maybeChild,
    write: model => model,
  })

const DefaultKeyedByIdBinding =
  DeclarationChildPlacementParentDefinition.makeCustomKeyedBinding(ChildBlock, {
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
  })

const DefaultKeyedByIdLengthBinding =
  DeclarationChildPlacementParentDefinition.makeCustomKeyedBinding(ChildBlock, {
    readAll: model => model.entries,
    key: entry => entry.id.length,
    read: entry => entry.child,
    writeAt: model => model,
  })

// @ts-expect-error A direct field default and explicit placement cannot resolve to the same sibling placement.
DeclarationChildPlacementParentDefinition.makeComposition({
  bindings: [PrimaryBinding, DirectAtPrimaryBinding],
})

// @ts-expect-error Static and keyed Bindings cannot resolve to the same sibling placement.
DeclarationChildPlacementParentDefinition.makeComposition({
  bindings: [OptionalBinding, KeyedAtOptionalBinding],
})

// @ts-expect-error Pure siblings cannot repeat a resolved placement.
DeclarationChildPlacementParentDefinition.makeComposition({
  bindings: [PrimaryBinding, AccessorAtPrimaryBinding],
})

// @ts-expect-error Default accessor and keyed Bindings of the same child Block resolve to the same placement.
DeclarationChildPlacementParentDefinition.makeComposition({
  bindings: [DefaultAccessorBinding, DefaultKeyedByIdBinding],
})

// @ts-expect-error Keyed occurrence keys do not distinguish sibling Binding placements.
DeclarationChildPlacementParentDefinition.makeComposition({
  bindings: [DefaultKeyedByIdBinding, DefaultKeyedByIdLengthBinding],
})
