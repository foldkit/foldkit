import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { type Html, type HtmlBuilder, childAttributes } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Listbox } from '@foldkit/ui'
import { type AnchorConfig, buttonId } from '@foldkit/ui/listbox'

import * as Icon from '../domain/icon'

const ListboxItem = Schema.Literals([
  'Michael Bluth',
  'Lindsay Funke',
  'Gob Bluth',
  'George Michael',
  'Maeby Funke',
  'Buster Bluth',
  'Tobias Funke',
  'Lucille Bluth',
])
type ListboxItem = typeof ListboxItem.Type

type Character = Readonly<{
  firstName: string
  lastName: string
}>

const ItemListbox = Listbox.makeBlock<ListboxItem>()
const ItemMultiListbox = Listbox.Multi.makeBlock<ListboxItem>()
const CharacterListbox = Listbox.makeBlock<Character>()

const Model = Schema.Struct({
  listboxDemo: ItemListbox,
  maybeListboxDemoSelectedItem: Schema.Option(ListboxItem),
  listboxMultiDemo: ItemMultiListbox,
  listboxMultiDemoSelectedItems: Schema.Array(ListboxItem),
  listboxGroupedDemo: CharacterListbox,
  maybeListboxGroupedDemoSelectedItem: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

export class ListboxPage extends Block<ListboxPage>()('ListboxPage', {
  Model,
}) {}

type ItemListboxModel = Model['listboxDemo']
type ItemMultiListboxModel = Model['listboxMultiDemo']
type CharacterListboxModel = Model['listboxGroupedDemo']

const LISTBOX_ITEMS: ReadonlyArray<ListboxItem> = [
  'Michael Bluth',
  'Lindsay Funke',
  'Gob Bluth',
  'George Michael',
  'Maeby Funke',
  'Buster Bluth',
  'Tobias Funke',
  'Lucille Bluth',
]

const characterName = (character: Character): string =>
  `${character.firstName} ${character.lastName}`

const GROUPED_CHARACTERS: ReadonlyArray<Character> = [
  { firstName: 'Michael', lastName: 'Bluth' },
  { firstName: 'Gob', lastName: 'Bluth' },
  { firstName: 'George Michael', lastName: 'Bluth' },
  { firstName: 'Buster', lastName: 'Bluth' },
  { firstName: 'Lucille', lastName: 'Bluth' },
  { firstName: 'Lindsay', lastName: 'Funke' },
  { firstName: 'Maeby', lastName: 'Funke' },
  { firstName: 'Tobias', lastName: 'Funke' },
]

const triggerClassName =
  'inline-flex items-center justify-between gap-2 min-w-48 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const itemsClassName =
  'w-56 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none'

const itemClassName =
  'group px-3 py-2 text-base text-gray-700 cursor-pointer data-[active]:bg-gray-100'

const groupHeadingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400'

const separatorClassName = 'border-t border-gray-200'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const labelClassName = 'block text-sm font-medium text-gray-700'

const fieldClassName = 'flex flex-col gap-1.5 items-start'

const checkIconClassName =
  'w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-gray-900'

const buttonContentClassName = 'flex w-full items-center justify-between gap-4'

const sectionHeadingClassName = 'text-lg font-semibold text-gray-900 mt-8 mb-4'

const LISTBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

// PIECES

const itemContent = (label: string, h: HtmlBuilder<never>) =>
  h.div(
    [h.Class('flex items-center gap-2')],
    [Icon.check(checkIconClassName), h.span([], [label])],
  )

const buttonContent = (label: string, h: HtmlBuilder<never>) =>
  h.div(
    [h.Class(buttonContentClassName)],
    [h.span([], [label]), Icon.chevronDown('w-4 h-4')],
  )

const chromeAttributes = (h: HtmlBuilder<never>) => ({
  buttonAttributes: childAttributes([h.Class(triggerClassName)]),
  itemsAttributes: childAttributes([h.Class(itemsClassName)]),
  backdropAttributes: childAttributes([h.Class(backdropClassName)]),
  attributes: childAttributes([h.Class(wrapperClassName)]),
})

const field = (
  buttonId: string,
  label: string,
  listbox: Html,
  h: HtmlBuilder<never>,
): Html =>
  h.div(
    [h.Class(fieldClassName)],
    [
      h.label([h.For(buttonId), h.Class(labelClassName)], [label]),
      h.div([h.Class('relative')], [listbox]),
    ],
  )

// DEMOS

const singleSelectDemo = (
  listboxModel: ItemListboxModel,
  maybeSelectedItem: Option.Option<ListboxItem>,
  h: HtmlBuilder<never>,
): Html => {
  const buttonLabel = Option.getOrElse(
    maybeSelectedItem,
    () => 'Select a Bluth',
  )

  return field(
    buttonId(listboxModel.model.id),
    'Family member',
    listboxModel.view({
      anchor: LISTBOX_ANCHOR,
      items: LISTBOX_ITEMS,
      maybeSelectedValue: maybeSelectedItem,
      itemToConfig: item => ({
        className: itemClassName,
        content: itemContent(item, h),
      }),
      buttonContent: buttonContent(buttonLabel, h),
      ...chromeAttributes(h),
    }),
    h,
  )
}

const multiSelectDemo = (
  listboxModel: ItemMultiListboxModel,
  selectedItems: ReadonlyArray<ListboxItem>,
  h: HtmlBuilder<never>,
): Html => {
  const buttonLabel = Array.match(selectedItems, {
    onEmpty: () => 'Select Bluths',
    onNonEmpty: items =>
      items.length === 1
        ? Array.headNonEmpty(items)
        : `${items.length} selected`,
  })

  return field(
    buttonId(listboxModel.model.id),
    'Family members',
    listboxModel.view({
      anchor: LISTBOX_ANCHOR,
      items: LISTBOX_ITEMS,
      selectedValues: selectedItems,
      itemToConfig: item => ({
        className: itemClassName,
        content: itemContent(item, h),
      }),
      buttonContent: buttonContent(buttonLabel, h),
      ...chromeAttributes(h),
    }),
    h,
  )
}

const groupedDemo = (
  listboxModel: CharacterListboxModel,
  maybeSelectedItem: Option.Option<string>,
  h: HtmlBuilder<never>,
): Html => {
  const buttonLabel = Option.getOrElse(
    maybeSelectedItem,
    () => 'Select a character',
  )

  return field(
    buttonId(listboxModel.model.id),
    'Character',
    listboxModel.view({
      anchor: LISTBOX_ANCHOR,
      items: GROUPED_CHARACTERS,
      maybeSelectedValue: maybeSelectedItem,
      itemToValue: characterName,
      itemGroupKey: character => character.lastName,
      groupToHeading: lastName => ({
        content: h.span([], [`${lastName}s`]),
        className: groupHeadingClassName,
      }),
      separatorAttributes: childAttributes([h.Class(separatorClassName)]),
      itemToConfig: character => ({
        className: itemClassName,
        content: itemContent(characterName(character), h),
      }),
      buttonContent: buttonContent(buttonLabel, h),
      ...chromeAttributes(h),
    }),
    h,
  )
}

const view = (model: Model, h: HtmlBuilder<never>): Html => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Listbox']),

      h.h3([h.Class(sectionHeadingClassName)], ['Single-Select']),
      singleSelectDemo(
        model.listboxDemo,
        model.maybeListboxDemoSelectedItem,
        h,
      ),

      h.h3([h.Class(sectionHeadingClassName)], ['Multi-Select']),
      multiSelectDemo(
        model.listboxMultiDemo,
        model.listboxMultiDemoSelectedItems,
        h,
      ),

      h.h3([h.Class(sectionHeadingClassName)], ['Grouped']),
      groupedDemo(
        model.listboxGroupedDemo,
        model.maybeListboxGroupedDemoSelectedItem,
        h,
      ),
    ],
  )
}

export const ListboxPageLive = ListboxPage.make(
  Effect.fn(function* () {
    const listboxDemo = yield* new ItemListbox('listboxDemo', {
      id: 'listbox-demo',
    })
    const listboxMultiDemo = yield* new ItemMultiListbox('listboxMultiDemo', {
      id: 'listbox-multi-demo',
    })
    const listboxGroupedDemo = yield* new CharacterListbox(
      'listboxGroupedDemo',
      { id: 'listbox-grouped-demo' },
    )

    return {
      model: {
        listboxDemo,
        maybeListboxDemoSelectedItem: Option.none(),
        listboxMultiDemo,
        listboxMultiDemoSelectedItems: [],
        listboxGroupedDemo,
        maybeListboxGroupedDemoSelectedItem: Option.none(),
      },

      update: {
        ...listboxDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeListboxDemoSelectedItem: () => Option.some(value),
            }),
          }),
        }),

        ...listboxMultiDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              listboxMultiDemoSelectedItems: listboxMultiDemoSelectedItems =>
                Array.contains(listboxMultiDemoSelectedItems, value)
                  ? Array.filter(
                      listboxMultiDemoSelectedItems,
                      item => item !== value,
                    )
                  : Array.append(listboxMultiDemoSelectedItems, value),
            }),
          }),
        }),

        ...listboxGroupedDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
            }),
          }),
        }),
      },

      view,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ItemListbox.Live,
      ItemMultiListbox.Live,
      CharacterListbox.Live,
    ),
  ),
)
