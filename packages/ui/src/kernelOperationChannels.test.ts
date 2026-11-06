import { Effect, Layer, Schema } from 'effect'
import * as Story from 'foldkit/story'
import type * as Update from 'foldkit/update'
import { expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import * as MultiCombobox from './combobox/multi.js'
import * as Combobox from './combobox/single.js'
import * as MultiListbox from './listbox/multi.js'
import * as Listbox from './listbox/single.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitCombobox = Combobox.makeBlock(Fruit)
const FruitMultiCombobox = MultiCombobox.makeBlock(Fruit)
const FruitListbox = Listbox.makeBlock(Fruit)
const FruitMultiListbox = MultiListbox.makeBlock(Fruit)

type OutMessageOf<Producer extends (...args: ReadonlyArray<never>) => unknown> =
  ReturnType<Producer> extends Readonly<{ outMessage?: infer OutMessage }>
    ? Exclude<OutMessage, undefined>
    : never

it.effect(
  'keeps selection OutMessages out of open and close operation channels',
  () =>
    Story.withBlock(FruitCombobox, fruitCombobox =>
      Story.withBlock(FruitMultiCombobox, fruitMultiCombobox =>
        Story.withBlock(FruitListbox, fruitListbox =>
          Story.withBlock(FruitMultiListbox, fruitMultiListbox => {
            expectTypeOf<
              OutMessageOf<typeof fruitCombobox.operations.requestOpen>
            >().toBeNever()
            expectTypeOf<
              OutMessageOf<typeof fruitMultiCombobox.operations.requestOpen>
            >().toBeNever()
            expectTypeOf<
              OutMessageOf<typeof fruitCombobox.operations.requestClose>
            >().toEqualTypeOf<
              typeof fruitCombobox.OutMessage.ClearedSelection.Type
            >()
            expectTypeOf<
              OutMessageOf<typeof fruitMultiCombobox.operations.requestClose>
            >().toEqualTypeOf<
              typeof fruitCombobox.OutMessage.ClearedSelection.Type
            >()
            expectTypeOf<
              OutMessageOf<typeof fruitListbox.operations.requestOpen>
            >().toBeNever()
            expectTypeOf<
              OutMessageOf<typeof fruitListbox.operations.requestClose>
            >().toBeNever()
            expectTypeOf<
              OutMessageOf<typeof fruitMultiListbox.operations.requestOpen>
            >().toBeNever()
            expectTypeOf<
              OutMessageOf<typeof fruitMultiListbox.operations.requestClose>
            >().toBeNever()

            const listboxOpen = fruitListbox.operations.requestOpen(
              fruitListbox.init({ id: 'fruit-listbox' }).model,
            )
            expect(listboxOpen.model.isOpen).toBe(true)
            expect(listboxOpen.outMessage).toBeUndefined()
            const listboxClose = fruitListbox.operations.requestClose(
              listboxOpen.model,
            )
            expect(listboxClose.model.isOpen).toBe(false)
            expect(listboxClose.outMessage).toBeUndefined()
          }),
        ),
      ),
    ).pipe(
      Effect.provide(
        Layer.mergeAll(
          Combobox.layer,
          MultiCombobox.layer,
          Listbox.layer,
          MultiListbox.layer,
        ),
      ),
    ),
)

it.effect(
  'retains refined selection payloads and exact operation requirements',
  () =>
    Story.withBlock(FruitCombobox, fruitCombobox =>
      Story.withBlock(FruitMultiCombobox, fruitMultiCombobox =>
        Story.withBlock(FruitListbox, fruitListbox =>
          Story.withBlock(FruitMultiListbox, fruitMultiListbox => {
            expectTypeOf<
              OutMessageOf<typeof fruitCombobox.operations.requestSelectItem>
            >().toEqualTypeOf<typeof fruitCombobox.OutMessage.Selected.Type>()
            expectTypeOf<
              OutMessageOf<
                typeof fruitMultiCombobox.operations.requestSelectItem
              >
            >().toEqualTypeOf<typeof fruitCombobox.OutMessage.Selected.Type>()
            expectTypeOf<
              OutMessageOf<typeof fruitListbox.operations.requestSelectItem>
            >().toEqualTypeOf<typeof fruitListbox.OutMessage.Type>()
            expectTypeOf<
              OutMessageOf<
                typeof fruitMultiListbox.operations.requestSelectItem
              >
            >().toEqualTypeOf<typeof fruitListbox.OutMessage.Type>()
            expectTypeOf<
              Update.RequirementsOf<typeof fruitListbox.operations.requestOpen>
            >().not.toBeAny()
            expectTypeOf<
              Update.RequirementsOf<typeof fruitListbox.operations.requestOpen>
            >().not.toBeUnknown()

            const listboxSelectItem = fruitListbox.operations.requestSelectItem(
              fruitListbox.init({ id: 'fruit-listbox' }).model,
              'Apple',
            )
            expect(listboxSelectItem.outMessage).toEqual(
              fruitListbox.OutMessage.Selected({ value: 'Apple' }),
            )
          }),
        ),
      ),
    ).pipe(
      Effect.provide(
        Layer.mergeAll(
          Combobox.layer,
          MultiCombobox.layer,
          Listbox.layer,
          MultiListbox.layer,
        ),
      ),
    ),
)
