import { clsx } from 'clsx'
import { Array, Match, Option, Order, String, pipe } from 'effect'
import { Html, childAttributes } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'
import { AnchorConfig, type ItemConfig } from '@foldkit/ui/listbox'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
  DietListboxBinding,
  PeriodListboxBinding,
} from './composition'
import { type Dinosaur, dinosaurs } from './data'
import { Message } from './message'
import { type Model, dietFilterItems, periodFilterItems } from './model'
import {
  ApplicationRoute,
  type BrowseFields,
  type SortColumn,
  Sorting,
  browseRouter,
  columnSortDirection,
  emptyBrowseFields,
  routeToBrowseFields,
} from './route'
import type { BrowseRoute } from './route'

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

const dinosaurRowView = (dinosaur: Dinosaur, h: ApplicationViewBuilder): Html =>
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
  h: ApplicationViewBuilder,
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

const filterItemConfig = (
  label: string,
  h: ApplicationViewBuilder,
): ItemConfig => {
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

const chevronDown = (className: string, h: ApplicationViewBuilder): Html =>
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

const filterButtonContent = (label: string, h: ApplicationViewBuilder): Html =>
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

const browseView = (
  model: Model,
  route: BrowseRoute,
  h: ApplicationViewBuilder,
): Html => {
  const fields = routeToBrowseFields(route)
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
          h.block(
            DietListboxBinding.embedView({
              slotId: model.dietListbox.id,
              model: model.dietListbox,
              viewInputs: {
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
                itemsAttributes: childAttributes([
                  h.Class(listboxItemsClassName),
                ]),
                backdropAttributes: childAttributes([
                  h.Class(listboxBackdropClassName),
                ]),
                attributes: childAttributes([h.Class(listboxWrapperClassName)]),
              },
            }),
          ),
          h.block(
            PeriodListboxBinding.embedView({
              slotId: model.periodListbox.id,
              model: model.periodListbox,
              viewInputs: {
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
                itemsAttributes: childAttributes([
                  h.Class(listboxItemsClassName),
                ]),
                backdropAttributes: childAttributes([
                  h.Class(listboxBackdropClassName),
                ]),
                attributes: childAttributes([h.Class(listboxWrapperClassName)]),
              },
            }),
          ),
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

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 — Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [
          h.Href(browseRouter(emptyBrowseFields)),
          h.Class('text-emerald-600 hover:underline'),
        ],
        ['← Back to Dinosaur Explorer'],
      ),
    ],
  )

const routeTitle = (route: Model['route']): string =>
  Match.value(route).pipe(
    Match.tag('Browse', () => 'Dinosaur Explorer'),
    Match.orElse(() => 'Not Found | Dinosaur Explorer'),
  )

export const view = ApplicationComposition.makeView((model, h) => {
  const routeContent = ApplicationRoute.match(model.route, {
    Browse: route => browseView(model, route, h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  const body = h.div(
    [h.Class('min-h-screen bg-gray-50')],
    [
      h.header(
        [h.Class('bg-emerald-600 text-white px-6 py-4 mb-8 shadow-sm')],
        [
          h.div(
            [h.Class('max-w-6xl mx-auto flex items-center gap-3')],
            [
              h.span([h.Class('text-lg font-semibold')], ['foldkit']),
              h.span(
                [h.Class('text-emerald-200 text-sm')],
                ['query-sync example'],
              ),
            ],
          ),
        ],
      ),
      h.main([h.Class('pb-12')], [routeContent]),
    ],
  )

  return { title: routeTitle(model.route), body }
})
