import { Schema } from 'effect'
import type * as Update from 'foldkit/update'
import { expect, expectTypeOf, it } from 'vitest'

import * as MultiCombobox from './combobox/multi.js'
import * as Combobox from './combobox/single.js'
import * as MultiListbox from './listbox/multi.js'
import * as Listbox from './listbox/single.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitCombobox = Combobox.create(Fruit)
const FruitMultiCombobox = MultiCombobox.create(Fruit)
const FruitListbox = Listbox.create<Fruit>()
const FruitMultiListbox = MultiListbox.create<Fruit>()

type OutMessageOf<Producer extends (...args: ReadonlyArray<never>) => unknown> =
  ReturnType<Producer> extends Readonly<{ outMessage?: infer OutMessage }>
    ? Exclude<OutMessage, undefined>
    : never

it('keeps selection OutMessages out of open and close operation channels', () => {
  expectTypeOf<
    OutMessageOf<typeof FruitCombobox.operations.requestOpen>
  >().toBeNever()
  expectTypeOf<
    OutMessageOf<typeof FruitMultiCombobox.operations.requestOpen>
  >().toBeNever()
  expectTypeOf<
    OutMessageOf<typeof FruitCombobox.operations.requestClose>
  >().toEqualTypeOf<typeof FruitCombobox.OutMessage.ClearedSelection.Type>()
  expectTypeOf<
    OutMessageOf<typeof FruitMultiCombobox.operations.requestClose>
  >().toEqualTypeOf<typeof FruitCombobox.OutMessage.ClearedSelection.Type>()
  expectTypeOf<
    OutMessageOf<typeof FruitListbox.operations.requestOpen>
  >().toBeNever()
  expectTypeOf<
    OutMessageOf<typeof FruitListbox.operations.requestClose>
  >().toBeNever()
  expectTypeOf<
    OutMessageOf<typeof FruitMultiListbox.operations.requestOpen>
  >().toBeNever()
  expectTypeOf<
    OutMessageOf<typeof FruitMultiListbox.operations.requestClose>
  >().toBeNever()

  const listboxOpen = FruitListbox.operations.requestOpen(
    FruitListbox.init({ id: 'fruit-listbox' }).model,
  )
  expect(listboxOpen.model.isOpen).toBe(true)
  expect(listboxOpen.outMessage).toBeUndefined()
  const listboxClose = FruitListbox.operations.requestClose(listboxOpen.model)
  expect(listboxClose.model.isOpen).toBe(false)
  expect(listboxClose.outMessage).toBeUndefined()
})

it('retains refined selection payloads and exact operation requirements', () => {
  expectTypeOf<
    OutMessageOf<typeof FruitCombobox.operations.requestSelectItem>
  >().toEqualTypeOf<typeof FruitCombobox.OutMessage.Selected.Type>()
  expectTypeOf<
    OutMessageOf<typeof FruitMultiCombobox.operations.requestSelectItem>
  >().toEqualTypeOf<typeof FruitCombobox.OutMessage.Selected.Type>()
  expectTypeOf<
    OutMessageOf<typeof FruitListbox.operations.requestSelectItem>
  >().toEqualTypeOf<typeof FruitListbox.OutMessage.Type>()
  expectTypeOf<
    OutMessageOf<typeof FruitMultiListbox.operations.requestSelectItem>
  >().toEqualTypeOf<typeof FruitListbox.OutMessage.Type>()
  expectTypeOf<
    Update.RequirementsOf<typeof FruitListbox.operations.requestOpen>
  >().not.toBeAny()
  expectTypeOf<
    Update.RequirementsOf<typeof FruitListbox.operations.requestOpen>
  >().not.toBeUnknown()

  const listboxSelectItem = FruitListbox.operations.requestSelectItem(
    FruitListbox.init({ id: 'fruit-listbox' }).model,
    'Apple',
  )
  expect(listboxSelectItem.outMessage).toEqual(
    FruitListbox.OutMessage.Selected({ value: 'Apple' }),
  )
})
