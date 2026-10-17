import { Option, Schema } from 'effect'
import { expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { define } from './define.js'

const ChildModel = Schema.Struct({ value: Schema.String })
type ChildModel = typeof ChildModel.Type

const Message = defineMessageUnion({ UpdatedValue: { value: Schema.String } })

const Child = define('ChildPlacementChild', {
  Model: ChildModel,
  Message,
})
const ChildComposition = Child.makeComposition()
const ChildBlock = ChildComposition.makeBlock({
  init: () => ({ model: ChildModel.make({ value: '' }) }),
  update: ChildComposition.makeUpdate((model, { value }) => ({
    model: modifyFields(model, { value: () => value }),
  })),
})

const Entry = Schema.Struct({ id: Schema.String, child: ChildModel })
const ParentModel = Schema.Struct({
  primary: ChildModel,
  secondary: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  entries: Schema.Array(Entry),
})
type ParentModel = typeof ParentModel.Type

const Parent = define('ChildPlacementParent', {
  Model: ParentModel,
  Message,
})

const PrimaryBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  field: 'primary',
  toParentMessage: message => message,
})

const SecondaryAtPrimaryBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  field: 'secondary',
  placement: 'primary',
  toParentMessage: message => message,
})

const SecondaryBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  field: 'secondary',
  toParentMessage: message => message,
})

const OptionalBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'optional',
  read: model => model.maybeChild,
  write: (model, nextChild) =>
    modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
  toParentMessage: message => message,
})

const EntriesBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'entries',
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (_id, message) => message,
})

const EntriesAtOptionalBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'optional',
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (_id, message) => message,
})

const DefaultAccessorBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  read: model => model.maybeChild,
  write: (model, nextChild) =>
    modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
  toParentMessage: message => message,
})

const DefaultEntriesByIdBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (_id, message) => message,
})

const DefaultEntriesByIdLengthBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  readAll: model => model.entries,
  key: entry => entry.id.length,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (_idLength, message) => message,
})

const EntriesByIdBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'entriesById',
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (_id, message) => message,
})

const EntriesByIdLengthBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'entriesByIdLength',
  readAll: model => model.entries,
  key: entry => entry.id.length,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (_idLength, message) => message,
})

const composition = Parent.makeComposition({
  childBindings: [
    PrimaryBinding,
    SecondaryBinding,
    OptionalBinding,
    EntriesBinding,
  ],
})

const defaultPlacementComposition = Parent.makeComposition({
  childBindings: [
    DefaultAccessorBinding,
    EntriesByIdBinding,
    EntriesByIdLengthBinding,
  ],
})

const dynamicChildren: ReadonlyArray<
  typeof PrimaryBinding | typeof SecondaryAtPrimaryBinding
> = [PrimaryBinding, SecondaryAtPrimaryBinding]

const dynamicDefaultMixedChildren: ReadonlyArray<
  typeof DefaultAccessorBinding | typeof DefaultEntriesByIdBinding
> = [DefaultAccessorBinding, DefaultEntriesByIdBinding]

const dynamicDefaultKeyedChildren: ReadonlyArray<
  typeof DefaultEntriesByIdBinding | typeof DefaultEntriesByIdLengthBinding
> = [DefaultEntriesByIdBinding, DefaultEntriesByIdLengthBinding]

if (false) {
  // @ts-expect-error Direct field defaults and explicit placements cannot resolve to the same sibling placement.
  Parent.makeComposition({
    childBindings: [PrimaryBinding, SecondaryAtPrimaryBinding],
  })

  // @ts-expect-error Static and keyed Bindings cannot resolve to the same sibling placement.
  Parent.makeComposition({
    childBindings: [OptionalBinding, EntriesAtOptionalBinding],
  })

  // @ts-expect-error Default accessor and keyed Bindings of the same child Block resolve to the same placement.
  Parent.makeComposition({
    childBindings: [DefaultAccessorBinding, DefaultEntriesByIdBinding],
  })

  // @ts-expect-error Keyed occurrence keys do not distinguish sibling Binding placements.
  Parent.makeComposition({
    childBindings: [DefaultEntriesByIdBinding, DefaultEntriesByIdLengthBinding],
  })
}

it('accepts distinct resolved sibling placements', () => {
  expect(
    composition.childBindings.map(childBinding => childBinding.placement),
  ).toEqual(['primary', 'secondary', 'optional', 'entries'])
  expect(
    defaultPlacementComposition.childBindings.map(
      childBinding => childBinding.placement,
    ),
  ).toEqual(['ChildPlacementChild', 'entriesById', 'entriesByIdLength'])
})

it('rejects duplicate placements in a widened child list before completion', () => {
  expect(() =>
    Parent.makeComposition({ childBindings: dynamicChildren }),
  ).toThrow(
    '[foldkit] Block "ChildPlacementParent" child Bindings at indexes 0 and 1 both resolve to placement "primary". Give each sibling Binding a unique placement.',
  )
})

it('rejects widened default placements before completion', () => {
  for (const childBindings of [
    dynamicDefaultMixedChildren,
    dynamicDefaultKeyedChildren,
  ]) {
    expect(() => Parent.makeComposition({ childBindings })).toThrow(
      '[foldkit] Block "ChildPlacementParent" child Bindings at indexes 0 and 1 both resolve to placement "ChildPlacementChild". Give each sibling Binding a unique placement.',
    )
  }
})
