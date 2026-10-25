import {
  FruitCombobox,
  FruitListbox,
  FruitMultiCombobox,
  FruitMultiListbox,
} from './kernel-operation-channels.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type OutMessageOf<Producer extends (...args: ReadonlyArray<any>) => unknown> =
  ReturnType<Producer> extends Readonly<{ outMessage?: infer OutMessage }>
    ? Exclude<OutMessage, undefined>
    : never

export type RelocatedOperationAssertions = [
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

const listboxModel = FruitListbox.init({ id: 'fruit-listbox' }).model
const comboboxModel = FruitCombobox.init({ id: 'fruit-combobox' }).model

// @ts-expect-error The selected Value remains the factory's literal union.
FruitListbox.operations.requestSelectItem(listboxModel, 'Banana')
// @ts-expect-error The selected Item remains the factory's Schema type.
FruitCombobox.operations.requestSelectItem(comboboxModel, 'Banana', 'Banana')
