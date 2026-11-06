import { Effect, Schema } from 'effect'
import type * as Block from 'foldkit/block'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'
import * as Story from 'foldkit/story'

import * as Combobox from '@foldkit/ui/combobox'
import * as Listbox from '@foldkit/ui/listbox'
import * as VirtualList from '@foldkit/ui/virtualList'

const Fruit = Schema.Literals(['Apple', 'Pear'])

export const FruitCombobox = Combobox.makeBlock(Fruit)
export const FruitMultiCombobox = Combobox.Multi.makeBlock(Fruit)
export const FruitListbox = Listbox.makeBlock(Fruit)
export const FruitMultiListbox = Listbox.Multi.makeBlock(Fruit)
export const FruitVirtualList = VirtualList.makeBlock<typeof Fruit.Type>()

export type FruitComboboxExecutable = Block.ExecutableOf<typeof FruitCombobox>
export type FruitMultiComboboxExecutable = Block.ExecutableOf<
  typeof FruitMultiCombobox
>
export type FruitListboxExecutable = Block.ExecutableOf<typeof FruitListbox>
export type FruitMultiListboxExecutable = Block.ExecutableOf<
  typeof FruitMultiListbox
>
export type FruitVirtualListExecutable = Block.ExecutableOf<
  typeof FruitVirtualList
>

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
    Equal<
      Parameters<
        FruitVirtualListExecutable['operations']['informOfHistoryPrepended']
      >[1],
      VirtualList.HistoryPrependInput<typeof Fruit.Type>
    >
  >,
  Expect<
    Equal<
      OutMessageOf<
        FruitVirtualListExecutable['operations']['informOfHistoryPrepended']
      >,
      never
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitComboboxExecutable['operations']['requestOpen']>,
      never
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitMultiComboboxExecutable['operations']['requestOpen']>,
      never
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitComboboxExecutable['operations']['requestClose']>,
      typeof FruitCombobox.OutMessage.ClearedSelection.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitMultiComboboxExecutable['operations']['requestClose']>,
      typeof FruitMultiCombobox.OutMessage.ClearedSelection.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitListboxExecutable['operations']['requestOpen']>,
      never
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitListboxExecutable['operations']['requestClose']>,
      never
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitMultiListboxExecutable['operations']['requestOpen']>,
      never
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitMultiListboxExecutable['operations']['requestClose']>,
      never
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitComboboxExecutable['operations']['requestSelectItem']>,
      typeof FruitCombobox.OutMessage.Selected.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<
        FruitMultiComboboxExecutable['operations']['requestSelectItem']
      >,
      typeof FruitMultiCombobox.OutMessage.Selected.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<FruitListboxExecutable['operations']['requestSelectItem']>,
      typeof FruitListbox.OutMessage.Type
    >
  >,
  Expect<
    Equal<
      OutMessageOf<
        FruitMultiListboxExecutable['operations']['requestSelectItem']
      >,
      typeof FruitMultiListbox.OutMessage.Type
    >
  >,
]

export type FruitTableViewInputs = Extract<
  VirtualList.ViewInputs<typeof Fruit.Type>,
  Readonly<{ containerElement: 'tbody' }>
>
export type FruitOrdinaryViewInputs = Exclude<
  VirtualList.ViewInputs<typeof Fruit.Type>,
  Readonly<{ containerElement: 'tbody' }>
>

export const fruitTableViewInputs = (
  h: HtmlBuilder<never>,
): FruitTableViewInputs => ({
  items: ['Apple', 'Pear'],
  itemToKey: item => item,
  containerElement: 'tbody',
  rowElement: 'tr',
  tableColumns: 2,
  itemToView: (item, index) => [
    h.td([], [item]),
    h.td([], [globalThis.String(index + 1)]),
  ],
  itemToAttributes: (item, index) =>
    childAttributes([
      h.DataAttribute('fruit', item),
      h.DataAttribute('fruit-position', globalThis.String(index)),
    ]),
})

export const fruitAbsoluteViewInputs = (
  h: HtmlBuilder<never>,
): FruitOrdinaryViewInputs => ({
  items: ['Apple', 'Pear'],
  itemToKey: item => item,
  containerElement: 'div',
  rowElement: 'div',
  rowLayout: 'Absolute',
  itemToView: item => h.span([], [item]),
  itemToAttributes: item => childAttributes([h.DataAttribute('fruit', item)]),
})

export const selfFruitList = Story.withBlock(FruitVirtualList, list =>
  list.init({
    id: 'self-fruit-list',
    rowHeightPx: 30,
    scrollContainer: VirtualList.ScrollContainer.Self(),
  }),
).pipe(Effect.provide(VirtualList.layer))
export const ancestorFruitList = Story.withBlock(FruitVirtualList, list =>
  list.init({
    id: 'ancestor-fruit-list',
    rowHeightPx: 30,
    scrollContainer: VirtualList.ScrollContainer.Ancestor({
      selector: '#fruit-scroll',
    }),
  }),
).pipe(Effect.provide(VirtualList.layer))
export const windowFruitList = Story.withBlock(FruitVirtualList, list =>
  list.init({
    id: 'window-fruit-list',
    rowHeightPx: 30,
    scrollContainer: VirtualList.ScrollContainer.Window(),
  }),
).pipe(Effect.provide(VirtualList.layer))

export type VirtualListLayoutAssertions = [
  Expect<
    Equal<
      Parameters<FruitTableViewInputs['itemToView']>,
      [item: typeof Fruit.Type, index: number]
    >
  >,
  Expect<
    Equal<
      Parameters<NonNullable<FruitTableViewInputs['itemToAttributes']>>,
      [item: typeof Fruit.Type, index: number]
    >
  >,
  Expect<
    Equal<
      Omit<FruitTableViewInputs, 'tableColumns'> extends VirtualList.ViewInputs<
        typeof Fruit.Type
      >
        ? true
        : false,
      false
    >
  >,
  Expect<
    Equal<
      Omit<FruitTableViewInputs, 'rowLayout'> &
        Readonly<{ rowLayout: 'Absolute' }> extends VirtualList.ViewInputs<
        typeof Fruit.Type
      >
        ? true
        : false,
      false
    >
  >,
  Expect<
    Equal<
      Omit<FruitTableViewInputs, 'rowElement'> &
        Readonly<{ rowElement: 'div' }> extends VirtualList.ViewInputs<
        typeof Fruit.Type
      >
        ? true
        : false,
      false
    >
  >,
  Expect<
    Equal<
      Readonly<{
        id: string
        rowHeightPx: number
        history: Readonly<{ reservePx: number; prefetchViewports: number }>
        scrollContainer: typeof VirtualList.ScrollContainer.Ancestor.Type
      }> extends VirtualList.InitConfig
        ? true
        : false,
      false
    >
  >,
  Expect<
    Equal<
      Readonly<{
        id: string
        rowHeightPx: number
        history: Readonly<{ reservePx: number; prefetchViewports: number }>
        scrollContainer: typeof VirtualList.ScrollContainer.Window.Type
      }> extends VirtualList.InitConfig
        ? true
        : false,
      false
    >
  >,
]
