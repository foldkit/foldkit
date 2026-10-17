import { Option } from 'effect'

import {
  ChildBlock,
  DeclarationChildPlacementParent,
  OptionalBinding,
  PrimaryBinding,
} from './child-placement.accepted.js'

const DirectAtPrimaryBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    field: 'secondary',
    placement: 'primary',
    toParentMessage: message => message,
    fromParentMessage: false,
  },
)

const KeyedAtOptionalBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    placement: 'optional',
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (_id, message) => message,
    fromParentMessage: false,
  },
)

const AccessorAtPrimaryBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    placement: 'primary',
    read: model => Option.some(model.secondary),
    write: model => model,
    toParentMessage: message => message,
    fromParentMessage: false,
  },
)

const DefaultAccessorBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    read: model => model.maybeChild,
    write: model => model,
    toParentMessage: message => message,
    fromParentMessage: false,
  },
)

const DefaultKeyedByIdBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (_id, message) => message,
    fromParentMessage: false,
  },
)

const DefaultKeyedByIdLengthBinding = DeclarationChildPlacementParent.bindChild(
  ChildBlock,
  {
    readAll: model => model.entries,
    key: entry => entry.id.length,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (_idLength, message) => message,
    fromParentMessage: false,
  },
)

// @ts-expect-error A direct field default and explicit placement cannot resolve to the same sibling placement.
DeclarationChildPlacementParent.makeComposition({
  childBindings: [PrimaryBinding, DirectAtPrimaryBinding],
})

// @ts-expect-error Static and keyed Bindings cannot resolve to the same sibling placement.
DeclarationChildPlacementParent.makeComposition({
  childBindings: [OptionalBinding, KeyedAtOptionalBinding],
})

// @ts-expect-error Pure siblings cannot repeat a resolved placement.
DeclarationChildPlacementParent.makeComposition({
  childBindings: [PrimaryBinding, AccessorAtPrimaryBinding],
})

// @ts-expect-error Default accessor and keyed Bindings of the same child Block resolve to the same placement.
DeclarationChildPlacementParent.makeComposition({
  childBindings: [DefaultAccessorBinding, DefaultKeyedByIdBinding],
})

// @ts-expect-error Keyed occurrence keys do not distinguish sibling Binding placements.
DeclarationChildPlacementParent.makeComposition({
  childBindings: [DefaultKeyedByIdBinding, DefaultKeyedByIdLengthBinding],
})
