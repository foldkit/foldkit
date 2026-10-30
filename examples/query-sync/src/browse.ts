import { clsx } from 'clsx'
import {
  Array,
  Effect,
  Layer,
  Match,
  Option,
  Order,
  Schema,
  String,
  Types,
  pipe,
} from 'effect'
import { Block, Command } from 'foldkit'
import { Html, type HtmlBuilder, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import * as Button from '@foldkit/ui/button'
import * as Input from '@foldkit/ui/input'
import * as Listbox from '@foldkit/ui/listbox'
import { AnchorConfig, type ItemConfig } from '@foldkit/ui/listbox'

import {
  BrowseFields,
  Diet,
  Period,
  SortColumn,
  Sorting,
  browseRouter,
} from './route'

type Dinosaur = Readonly<{
  name: string
  period: string
  diet: string
  lengthMeters: number
  weightKg: number
}>

const dinosaurs: ReadonlyArray<Dinosaur> = [
  {
    name: 'Tyrannosaurus Rex',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 12.3,
    weightKg: 8400,
  },
  {
    name: 'Triceratops',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 9,
    weightKg: 6000,
  },
  {
    name: 'Velociraptor',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 2,
    weightKg: 15,
  },
  {
    name: 'Brachiosaurus',
    period: 'Jurassic',
    diet: 'Herbivore',
    lengthMeters: 26,
    weightKg: 56000,
  },
  {
    name: 'Stegosaurus',
    period: 'Jurassic',
    diet: 'Herbivore',
    lengthMeters: 9,
    weightKg: 3500,
  },
  {
    name: 'Ankylosaurus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 6.5,
    weightKg: 6000,
  },
  {
    name: 'Spinosaurus',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 15,
    weightKg: 7000,
  },
  {
    name: 'Allosaurus',
    period: 'Jurassic',
    diet: 'Carnivore',
    lengthMeters: 9.7,
    weightKg: 2300,
  },
  {
    name: 'Diplodocus',
    period: 'Jurassic',
    diet: 'Herbivore',
    lengthMeters: 25,
    weightKg: 12000,
  },
  {
    name: 'Parasaurolophus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 9.5,
    weightKg: 2500,
  },
  {
    name: 'Compsognathus',
    period: 'Jurassic',
    diet: 'Carnivore',
    lengthMeters: 1,
    weightKg: 3,
  },
  {
    name: 'Pachycephalosaurus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 4.5,
    weightKg: 450,
  },
  {
    name: 'Dilophosaurus',
    period: 'Jurassic',
    diet: 'Carnivore',
    lengthMeters: 7,
    weightKg: 400,
  },
  {
    name: 'Iguanodon',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 10,
    weightKg: 3500,
  },
  {
    name: 'Gallimimus',
    period: 'Cretaceous',
    diet: 'Omnivore',
    lengthMeters: 6,
    weightKg: 440,
  },
  {
    name: 'Therizinosaurus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 10,
    weightKg: 5000,
  },
  {
    name: 'Carnotaurus',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 7.5,
    weightKg: 1300,
  },
  {
    name: 'Oviraptor',
    period: 'Cretaceous',
    diet: 'Omnivore',
    lengthMeters: 1.6,
    weightKg: 33,
  },
  {
    name: 'Baryonyx',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 10,
    weightKg: 1700,
  },
  {
    name: 'Coelophysis',
    period: 'Triassic',
    diet: 'Carnivore',
    lengthMeters: 3,
    weightKg: 20,
  },
  {
    name: 'Plateosaurus',
    period: 'Triassic',
    diet: 'Herbivore',
    lengthMeters: 8,
    weightKg: 700,
  },
  {
    name: 'Herrerasaurus',
    period: 'Triassic',
    diet: 'Carnivore',
    lengthMeters: 6,
    weightKg: 350,
  },
]

const dietFilterItems: ReadonlyArray<string> = ['', ...Diet.literals]
const periodFilterItems: ReadonlyArray<string> = ['', ...Period.literals]
export const DietListbox = Listbox.makeBlock()
export const PeriodListbox = Listbox.makeBlock()

const Model = Schema.Struct({
  fields: BrowseFields,
  dietListbox: DietListbox,
  periodListbox: PeriodListbox,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  InformedOfRouteChange: { fields: BrowseFields },
  CompletedReplaceFilters: {},
  ChangedSearchInput: { value: Schema.String },
  ClickedColumnHeader: { column: SortColumn },
})
type Message = typeof Message.Type

export const ReplaceFilters = Command.define('ReplaceFilters', {
  args: BrowseFields.fields,
  messages: [Message.CompletedReplaceFilters],
})

export class Browse extends Block<Browse, Readonly<{ fields: BrowseFields }>>()(
  'Browse',
  {
    Model,
    Message,
    Command: [ReplaceFilters],
  },
) {}

type BrowseViewBuilder = HtmlBuilder<Message>

const columnSortDirection = (
  sorting: Sorting,
  column: SortColumn,
): Types.Tags<Sorting> => {
  const isColumnSorted =
    sorting._tag !== 'Unsorted' && sorting.column === column

  if (isColumnSorted) {
    return sorting._tag
  } else {
    return 'Unsorted'
  }
}

const nextSorting = (sorting: Sorting, column: SortColumn): Sorting =>
  pipe(
    columnSortDirection(sorting, column),
    Match.value,
    Match.when('Unsorted', () => Sorting.Ascending({ column })),
    Match.when('Ascending', () => Sorting.Descending({ column })),
    Match.when('Descending', () => Sorting.Unsorted()),
    Match.exhaustive,
  )

const selectionToParam = <A extends string>(
  maybeSelectedItem: Option.Option<string>,
  schema: Schema.Codec<A, A>,
): Option.Option<A> => {
  const decode = Schema.decodeUnknownOption(schema)

  return pipe(
    maybeSelectedItem,
    Option.filter(String.isNonEmpty),
    Option.flatMap(value => decode(value)),
  )
}

const columnOrders: Record<SortColumn, Order.Order<Dinosaur>> = {
  Name: Order.mapInput(Order.String, ({ name }) => name),
  Period: Order.mapInput(Order.String, ({ period }) => period),
  Diet: Order.mapInput(Order.String, ({ diet }) => diet),
  Length: Order.mapInput(Order.Number, ({ lengthMeters }) => lengthMeters),
  Weight: Order.mapInput(Order.Number, ({ weightKg }) => weightKg),
}

const filterWhenSome =
  <A, B>(
    maybeValue: Option.Option<A>,
    predicate: (value: A, item: B) => boolean,
  ) =>
  (items: ReadonlyArray<B>): ReadonlyArray<B> =>
    Option.match(maybeValue, {
      onNone: () => items,
      onSome: value => Array.filter(items, item => predicate(value, item)),
    })

const sortBySorting =
  <A>(sorting: Sorting, orders: Record<SortColumn, Order.Order<A>>) =>
  (items: ReadonlyArray<A>): ReadonlyArray<A> =>
    Sorting.match(sorting, {
      Unsorted: () => items,
      Ascending: ({ column }) => Array.sort(items, orders[column]),
      Descending: ({ column }) => Array.sort(items, Order.flip(orders[column])),
    })

const filterAndSort = (fields: BrowseFields): ReadonlyArray<Dinosaur> =>
  pipe(
    dinosaurs,
    filterWhenSome(fields.search, (query, dinosaur) =>
      dinosaur.name.toLowerCase().includes(query.toLowerCase()),
    ),
    filterWhenSome(
      fields.diet,
      (dietValue, dinosaur) => dinosaur.diet === dietValue,
    ),
    filterWhenSome(
      fields.period,
      (periodValue, dinosaur) => dinosaur.period === periodValue,
    ),
    sortBySorting(fields.sorting, columnOrders),
  )

const sortIndicator = (column: SortColumn, sorting: Sorting): string =>
  Match.value(columnSortDirection(sorting, column)).pipe(
    Match.when('Unsorted', () => ''),
    Match.when('Ascending', () => '↑'),
    Match.when('Descending', () => '↓'),
    Match.exhaustive,
  )

const BADGE_BASE = 'px-2 py-0.5 rounded-full text-xs font-medium'

const periodBadgeClass = (period: string): string =>
  clsx(BADGE_BASE, {
    'bg-amber-100 text-amber-800': period === 'Triassic',
    'bg-sky-100 text-sky-800': period === 'Jurassic',
    'bg-purple-100 text-purple-800': period === 'Cretaceous',
  })

const dietBadgeClass = (diet: string): string =>
  clsx(BADGE_BASE, {
    'bg-red-100 text-red-800': diet === 'Carnivore',
    'bg-green-100 text-green-800': diet === 'Herbivore',
    'bg-orange-100 text-orange-800': diet === 'Omnivore',
  })

const SORT_INDICATOR_WIDTH = 'w-4'

const headerButtonClass =
  'w-full px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100 focus-visible:bg-emerald-100 focus-visible:text-emerald-900 focus-visible:outline-none transition'

const bodyCellClass = 'px-4 py-3 text-sm text-gray-700'

const dinosaurRowView = (dinosaur: Dinosaur, h: BrowseViewBuilder): Html =>
  h.keyed('tr')(
    dinosaur.name,
    [h.Class('border-b border-gray-100 hover:bg-gray-50 transition')],
    [
      h.td(
        [h.Class(clsx(bodyCellClass, 'font-medium text-gray-900'))],
        [dinosaur.name],
      ),
      h.td(
        [h.Class(bodyCellClass)],
        [
          h.span(
            [h.Class(periodBadgeClass(dinosaur.period))],
            [dinosaur.period],
          ),
        ],
      ),
      h.td(
        [h.Class(bodyCellClass)],
        [h.span([h.Class(dietBadgeClass(dinosaur.diet))], [dinosaur.diet])],
      ),
      h.td(
        [h.Class(clsx(bodyCellClass, 'text-right tabular-nums'))],
        [dinosaur.lengthMeters.toString()],
      ),
      h.td(
        [h.Class(clsx(bodyCellClass, 'text-right tabular-nums'))],
        [dinosaur.weightKg.toLocaleString()],
      ),
    ],
  )

const sortAriaLabel = (column: SortColumn, sorting: Sorting): string =>
  Match.value(columnSortDirection(sorting, column)).pipe(
    Match.when('Unsorted', () => `Sort by ${column}`),
    Match.when('Ascending', () => `Sort by ${column}, currently ascending`),
    Match.when('Descending', () => `Sort by ${column}, currently descending`),
    Match.exhaustive,
  )

const ariaSortValue = (column: SortColumn, sorting: Sorting): string =>
  Match.value(columnSortDirection(sorting, column)).pipe(
    Match.when('Unsorted', () => 'none'),
    Match.when('Ascending', () => 'ascending'),
    Match.when('Descending', () => 'descending'),
    Match.exhaustive,
  )

const sortableColumnHeader = (
  column: SortColumn,
  displayLabel: string,
  fields: BrowseFields,
  isRightAligned: boolean,
  h: BrowseViewBuilder,
): Html => {
  const indicator = h.span(
    [h.Class(clsx(SORT_INDICATOR_WIDTH, 'inline-block text-center'))],
    [sortIndicator(column, fields.sorting)],
  )
  const label = h.span([], [displayLabel])
  const alignment = isRightAligned ? 'text-right' : 'text-left'

  return h.th(
    [h.AriaSort(ariaSortValue(column, fields.sorting))],
    [
      Button.view(
        {
          onClick: Message.ClickedColumnHeader({ column }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaLabel(sortAriaLabel(column, fields.sorting)),
                h.Class(clsx(headerButtonClass, alignment)),
              ],
              isRightAligned ? [indicator, label] : [label, indicator],
            ),
        },
        h,
      ),
    ],
  )
}

const LISTBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const listboxButtonClassName =
  'inline-flex items-center justify-between gap-2 min-w-40 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer select-none hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500'

const listboxItemsClassName =
  'absolute mt-1 min-w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-10 outline-none'

const listboxItemClassName =
  'group px-3 py-2 text-sm text-gray-700 cursor-pointer data-[active]:bg-emerald-50 data-[active]:text-emerald-900'

const listboxBackdropClassName = 'fixed inset-0 z-0'

const listboxWrapperClassName = 'relative inline-block'

const filterItemConfig = (label: string, h: BrowseViewBuilder): ItemConfig => {
  return {
    className: listboxItemClassName,
    content: h.div(
      [h.Class('flex items-center gap-2')],
      [
        h.span(
          [
            h.Class(
              'w-4 text-center text-emerald-600 invisible group-data-[selected]:visible',
            ),
          ],
          ['✓'],
        ),
        h.span([], [label]),
      ],
    ),
  }
}

const chevronDown = (className: string, h: BrowseViewBuilder): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('1.5'),
      h.Stroke('currentColor'),
    ],
    [
      h.path([
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
        h.D('M19.5 8.25l-7.5 7.5-7.5-7.5'),
      ]),
    ],
  )

const filterButtonContent = (label: string, h: BrowseViewBuilder): Html =>
  h.div(
    [h.Class('flex w-full items-center justify-between gap-4')],
    [h.span([], [label]), chevronDown('w-4 h-4 text-gray-400', h)],
  )

const filterButtonLabel = (
  maybeSelectedItem: Option.Option<string>,
  fallback: string,
): string =>
  pipe(
    maybeSelectedItem,
    Option.filter(String.isNonEmpty),
    Option.getOrElse(() => fallback),
  )

const dietLabel = (item: string): string =>
  String.isEmpty(item) ? 'All Diets' : item

const periodLabel = (item: string): string =>
  String.isEmpty(item) ? 'All Periods' : item

const browseView = (model: Model, h: BrowseViewBuilder): Html => {
  const { fields } = model
  const results = filterAndSort(fields)

  return h.div(
    [h.Class('max-w-6xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-3xl font-bold text-gray-800 mb-2')],
        ['Dinosaur Explorer'],
      ),
      h.p(
        [h.Class('text-gray-500 mb-6')],
        [
          'Filter, sort, and search. Every control syncs to the URL. Try changing the filters, then copy the URL or hit the back button.',
        ],
      ),

      h.div(
        [h.Class('flex flex-wrap items-start gap-3 mb-6')],
        [
          Input.view(
            {
              id: 'dinosaur-search',
              value: Option.getOrElse(fields.search, () => ''),
              placeholder: 'Search by name…',
              onInput: value => Message.ChangedSearchInput({ value }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.Class(
                    'flex-1 min-w-48 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                  ),
                ]),
            },
            h,
          ),
          model.dietListbox.view({
            anchor: LISTBOX_ANCHOR,
            items: dietFilterItems,
            maybeSelectedValue: Option.orElseSome(fields.diet, () => ''),
            itemToConfig: item => filterItemConfig(dietLabel(item), h),
            itemToSearchText: dietLabel,
            buttonContent: filterButtonContent(
              filterButtonLabel(fields.diet, 'All Diets'),
              h,
            ),
            buttonAttributes: childAttributes([
              h.Class(listboxButtonClassName),
            ]),
            itemsAttributes: childAttributes([h.Class(listboxItemsClassName)]),
            backdropAttributes: childAttributes([
              h.Class(listboxBackdropClassName),
            ]),
            attributes: childAttributes([h.Class(listboxWrapperClassName)]),
          }),
          model.periodListbox.view({
            anchor: LISTBOX_ANCHOR,
            items: periodFilterItems,
            maybeSelectedValue: Option.orElseSome(fields.period, () => ''),
            itemToConfig: item => filterItemConfig(periodLabel(item), h),
            itemToSearchText: periodLabel,
            buttonContent: filterButtonContent(
              filterButtonLabel(fields.period, 'All Periods'),
              h,
            ),
            buttonAttributes: childAttributes([
              h.Class(listboxButtonClassName),
            ]),
            itemsAttributes: childAttributes([h.Class(listboxItemsClassName)]),
            backdropAttributes: childAttributes([
              h.Class(listboxBackdropClassName),
            ]),
            attributes: childAttributes([h.Class(listboxWrapperClassName)]),
          }),
        ],
      ),

      h.p(
        [h.Class('text-sm text-gray-500 mb-3')],
        [
          `Showing ${Array.length(results)} of ${Array.length(dinosaurs)} dinosaurs`,
        ],
      ),

      Array.match(results, {
        onEmpty: () =>
          h.div(
            [h.Class('text-center py-12 text-gray-400')],
            [
              h.p([h.Class('text-lg')], ['No dinosaurs match your filters.']),
              h.p(
                [h.Class('text-sm mt-2')],
                ['Try broadening your search or removing filters.'],
              ),
            ],
          ),
        onNonEmpty: rows =>
          h.div(
            [h.Class('overflow-x-auto rounded-lg border border-gray-200')],
            [
              h.table(
                [h.Class('w-full')],
                [
                  h.thead(
                    [h.Class('bg-gray-50 border-b border-gray-200')],
                    [
                      h.tr(
                        [],
                        [
                          sortableColumnHeader(
                            'Name',
                            'Name',
                            fields,
                            false,
                            h,
                          ),
                          sortableColumnHeader(
                            'Period',
                            'Period',
                            fields,
                            false,
                            h,
                          ),
                          sortableColumnHeader(
                            'Diet',
                            'Diet',
                            fields,
                            false,
                            h,
                          ),
                          sortableColumnHeader(
                            'Length',
                            'Length (m)',
                            fields,
                            true,
                            h,
                          ),
                          sortableColumnHeader(
                            'Weight',
                            'Weight (kg)',
                            fields,
                            true,
                            h,
                          ),
                        ],
                      ),
                    ],
                  ),
                  h.tbody(
                    [],
                    rows.map(row => dinosaurRowView(row, h)),
                  ),
                ],
              ),
            ],
          ),
      }),

      h.p(
        [h.Class('text-xs text-gray-400 mt-6 text-center')],
        [
          'All filter and sort state lives in the URL. Share it or bookmark it.',
        ],
      ),
    ],
  )
}

export const BrowseLive = Browse.make(
  Effect.fn(function* (_id, { fields }) {
    const dietListbox = yield* new DietListbox('dietListbox', {
      id: 'diet-filter',
    })
    const periodListbox = yield* new PeriodListbox('periodListbox', {
      id: 'period-filter',
    })

    return {
      model: { fields, dietListbox, periodListbox },

      update: {
        InformedOfRouteChange: (model, { fields }) => ({
          model: modifyFields(model, { fields: () => fields }),
        }),

        CompletedReplaceFilters: model => ({ model }),

        ChangedSearchInput: (model, { value }) => ({
          model,
          commands: [
            ReplaceFilters({
              ...model.fields,
              search: Option.liftPredicate(value, String.isNonEmpty),
            }),
          ],
        }),

        ClickedColumnHeader: (model, { column }) => ({
          model,
          commands: [
            ReplaceFilters({
              ...model.fields,
              sorting: nextSorting(model.fields.sorting, column),
            }),
          ],
        }),

        ...dietListbox.on<Model>({
          Selected: (model, { value }) => ({
            model,
            commands: [
              ReplaceFilters({
                ...model.fields,
                diet: selectionToParam(Option.some(value), Diet),
              }),
            ],
          }),
        }),

        ...periodListbox.on<Model>({
          Selected: (model, { value }) => ({
            model,
            commands: [
              ReplaceFilters({
                ...model.fields,
                period: selectionToParam(Option.some(value), Period),
              }),
            ],
          }),
        }),
      },

      commands: {
        ReplaceFilters: fields =>
          replaceUrl(browseRouter(fields)).pipe(
            Effect.as(Message.CompletedReplaceFilters()),
          ),
      },

      view: browseView,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(DietListbox.Live, PeriodListbox.Live)))
