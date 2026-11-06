import { Effect, Layer } from 'effect'
import * as Story from 'foldkit/story'

import * as Combobox from '@foldkit/ui/combobox'
import * as Listbox from '@foldkit/ui/listbox'
import * as VirtualList from '@foldkit/ui/virtualList'

import {
  FruitCombobox,
  type FruitComboboxExecutable,
  FruitListbox,
  type FruitListboxExecutable,
  FruitMultiCombobox,
  type FruitMultiComboboxExecutable,
  FruitMultiListbox,
  type FruitMultiListboxExecutable,
  type FruitTableViewInputs,
  FruitVirtualList,
  type FruitVirtualListExecutable,
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
      Parameters<
        FruitVirtualListExecutable['operations']['informOfHistoryPrepended']
      >[1],
      VirtualList.HistoryPrependInput<'Apple' | 'Pear'>
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

export const operationChecks = Story.withBlock(FruitListbox, listbox =>
  Story.withBlock(FruitCombobox, combobox =>
    Story.withBlock(FruitVirtualList, virtualList => {
      const listboxModel = listbox.init({ id: 'fruit-listbox' }).model
      const comboboxModel = combobox.init({ id: 'fruit-combobox' }).model

      // @ts-expect-error The selected Value remains the factory's literal union.
      listbox.operations.requestSelectItem(listboxModel, 'Banana')
      // @ts-expect-error The selected Item remains the factory's Schema type.
      combobox.operations.requestSelectItem(comboboxModel, 'Banana', 'Banana')

      const prependFruitHistory =
        virtualList.operations.informOfHistoryPrepended(
          virtualList.init({ id: 'fruit-history', rowHeightPx: 30 }).model,
          {
            items: ['Apple', 'Pear'],
            prependedItems: ['Apple'],
            itemToKey: item => item,
            page: VirtualList.HistoryPage.More(),
          },
        )

      virtualList.operations.informOfHistoryPrepended(
        virtualList.init({ id: 'fruit-history', rowHeightPx: 30 }).model,
        {
          // @ts-expect-error History notifications retain the completed Block's item type.
          items: ['Banana'],
          prependedItems: [],
          itemToKey: item => item,
          page: VirtualList.HistoryPage.Complete(),
        },
      )

      return prependFruitHistory
    }),
  ),
).pipe(
  Effect.provide(
    Layer.mergeAll(Combobox.layer, Listbox.layer, VirtualList.layer),
  ),
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

export const invalidHistoryContainers = Story.withBlock(
  FruitVirtualList,
  virtualList => {
    // @ts-expect-error History momentum requires the list's own scroll container.
    virtualList.init({
      id: 'ancestor-history',
      rowHeightPx: 30,
      history: { reservePx: 800, prefetchViewports: 3 },
      scrollContainer: VirtualList.ScrollContainer.Ancestor({
        selector: '#fruit-scroll',
      }),
    })

    // @ts-expect-error History momentum requires the list's own scroll container.
    virtualList.init({
      id: 'window-history',
      rowHeightPx: 30,
      history: { reservePx: 800, prefetchViewports: 3 },
      scrollContainer: VirtualList.ScrollContainer.Window(),
    })
  },
).pipe(Effect.provide(VirtualList.layer))
