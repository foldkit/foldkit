import { Schema } from 'effect'

import * as Combobox from '@foldkit/ui/combobox'
import * as Listbox from '@foldkit/ui/listbox'

const Fruit = Schema.Literals(['Apple', 'Pear'])

export const FruitCombobox = Combobox.create(Fruit)
export const FruitMultiCombobox = Combobox.Multi.create(Fruit)
export const FruitListbox = Listbox.create<typeof Fruit.Type>()
export const FruitMultiListbox = Listbox.Multi.create<typeof Fruit.Type>()

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type OutMessageOf<Producer extends (...args: ReadonlyArray<never>) => unknown> =
  ReturnType<Producer> extends Readonly<{ outMessage?: infer OutMessage }>
    ? Exclude<OutMessage, undefined>
    : never

export type OperationAssertions = [
  Expect<
    Equal<OutMessageOf<typeof FruitCombobox.operations.requestOpen>, never>
  >,
  Expect<
    Equal<OutMessageOf<typeof FruitMultiCombobox.operations.requestOpen>, never>
  >,
  Expect<
    Equal<
      OutMessageOf<typeof FruitCombobox.operations.requestClose>,
      typeof FruitCombobox.OutMessage.ClearedSelection.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<typeof FruitMultiCombobox.operations.requestClose>,
      typeof FruitMultiCombobox.OutMessage.ClearedSelection.Type
    >
  >,
  Expect<
    Equal<OutMessageOf<typeof FruitListbox.operations.requestOpen>, never>
  >,
  Expect<
    Equal<OutMessageOf<typeof FruitListbox.operations.requestClose>, never>
  >,
  Expect<
    Equal<OutMessageOf<typeof FruitMultiListbox.operations.requestOpen>, never>
  >,
  Expect<
    Equal<OutMessageOf<typeof FruitMultiListbox.operations.requestClose>, never>
  >,
  Expect<
    Equal<
      OutMessageOf<typeof FruitCombobox.operations.requestSelectItem>,
      typeof FruitCombobox.OutMessage.Selected.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<typeof FruitMultiCombobox.operations.requestSelectItem>,
      typeof FruitMultiCombobox.OutMessage.Selected.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<typeof FruitListbox.operations.requestSelectItem>,
      typeof FruitListbox.OutMessage.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<typeof FruitMultiListbox.operations.requestSelectItem>,
      typeof FruitMultiListbox.OutMessage.Type
    >
  >,
]
