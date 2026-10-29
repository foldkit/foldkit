import * as VirtualList from '@foldkit/ui/virtualList'

import {
  FruitCombobox,
  FruitListbox,
  FruitMultiCombobox,
  FruitMultiListbox,
  type FruitTableViewInputs,
  FruitVirtualList,
  fruitAbsoluteViewInputs,
  fruitTableViewInputs,
} from './kernel-operation-channels.accepted.js'

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

export type RelocatedOperationAssertions = [
  Expect<
    Equal<
      Parameters<typeof FruitVirtualList.operations.informHistoryPrepended>[1],
      VirtualList.HistoryPrependInput<'Apple' | 'Pear'>
    >
  >,
  Expect<
    Equal<
      OutMessageOf<typeof FruitVirtualList.operations.informHistoryPrepended>,
      never
    >
  >,
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

export const prependFruitHistory =
  FruitVirtualList.operations.informHistoryPrepended(
    FruitVirtualList.init({ id: 'fruit-history', rowHeightPx: 30 }).model,
    {
      items: ['Apple', 'Pear'],
      prependedItems: ['Apple'],
      itemToKey: item => item,
      page: VirtualList.HistoryPage.More(),
    },
  )

FruitVirtualList.operations.informHistoryPrepended(
  FruitVirtualList.init({ id: 'fruit-history', rowHeightPx: 30 }).model,
  {
    // @ts-expect-error History notifications retain the completed Block's item type.
    items: ['Banana'],
    prependedItems: [],
    itemToKey: item => item,
    page: VirtualList.HistoryPage.Complete(),
  },
)

export type RelocatedVirtualListLayoutAssertions = [
  Expect<Equal<ReturnType<typeof fruitTableViewInputs>, FruitTableViewInputs>>,
  Expect<
    Equal<
      Parameters<ReturnType<typeof fruitTableViewInputs>['itemToView']>,
      [item: 'Apple' | 'Pear', index: number]
    >
  >,
  Expect<
    Equal<
      Parameters<
        NonNullable<ReturnType<typeof fruitTableViewInputs>['itemToAttributes']>
      >,
      [item: 'Apple' | 'Pear', index: number]
    >
  >,
  Expect<
    Equal<
      ReturnType<typeof fruitAbsoluteViewInputs>['rowLayout'],
      'Spacers' | 'Absolute' | undefined
    >
  >,
]

const basicFruitViewInputs: Pick<
  VirtualList.ViewInputs<'Apple' | 'Pear'>,
  'items' | 'itemToKey' | 'itemToView'
> = {
  items: ['Apple', 'Pear'],
  itemToKey: (item: 'Apple' | 'Pear') => item,
  itemToView: () => null,
}

// @ts-expect-error Table rows require the spacer cells' column count.
export const missingTableColumns: VirtualList.ViewInputs<'Apple' | 'Pear'> = {
  ...basicFruitViewInputs,
  containerElement: 'tbody',
  rowElement: 'tr',
}

// @ts-expect-error Table rows support spacer layout only.
export const absoluteTableRows: VirtualList.ViewInputs<'Apple' | 'Pear'> = {
  ...basicFruitViewInputs,
  containerElement: 'tbody',
  rowElement: 'tr',
  rowLayout: 'Absolute',
  tableColumns: 2,
}

// @ts-expect-error A native table body requires native table rows.
export const invalidTableRow: VirtualList.ViewInputs<'Apple' | 'Pear'> = {
  ...basicFruitViewInputs,
  containerElement: 'tbody',
  rowElement: 'div',
  tableColumns: 2,
}

// @ts-expect-error History momentum requires the list's own scroll container.
FruitVirtualList.init({
  id: 'ancestor-history',
  rowHeightPx: 30,
  history: { reservePx: 800, prefetchViewports: 3 },
  scrollContainer: VirtualList.ScrollContainer.Ancestor({
    selector: '#fruit-scroll',
  }),
})

// @ts-expect-error History momentum requires the list's own scroll container.
FruitVirtualList.init({
  id: 'window-history',
  rowHeightPx: 30,
  history: { reservePx: 800, prefetchViewports: 3 },
  scrollContainer: VirtualList.ScrollContainer.Window(),
})
