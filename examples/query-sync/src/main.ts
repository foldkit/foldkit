import { clsx } from 'clsx'
import {
  Array,
  Effect,
  Match as M,
  Option,
  Order,
  Predicate,
  Schema as S,
  SchemaTransformation,
  String,
  Types,
  pipe,
} from 'effect'
import { Command, Route, Runtime, Ui } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { r } from 'foldkit/route'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import { AnchorConfig } from 'foldkit/ui/listbox'
import { Url, toString as urlToString } from 'foldkit/url'

import { type Dinosaur, dinosaurs } from './data'

const Diet = S.Literals(['Carnivore', 'Herbivore', 'Omnivore'])
const Period = S.Literals(['Triassic', 'Jurassic', 'Cretaceous'])
const SortColumn = S.Literals(['Name', 'Period', 'Diet', 'Length', 'Weight'])
type SortColumn = typeof SortColumn.Type

const Unsorted = ts('Unsorted')
const Ascending = ts('Ascending', { column: SortColumn })
const Descending = ts('Descending', { column: SortColumn })
const Sorting = S.Union([Unsorted, Ascending, Descending])
type Sorting = typeof Sorting.Type

const dietFilterItems: ReadonlyArray<string> = ['', ...Diet.literals]
const periodFilterItems: ReadonlyArray<string> = ['', ...Period.literals]

// ROUTE

const SORT_PARAM_SEPARATOR = ':'

const optionFromValidParam = <A extends string>(schema: S.Codec<A, A>) => {
  const decode = S.decodeUnknownOption(schema)

  return S.UndefinedOr(S.String).pipe(
    S.decodeTo(
      S.Option(schema),
      SchemaTransformation.transform({
        decode: (value: string | undefined): Option.Option<A> =>
          decode(value),
        encode: (option: Option.Option<A>): string | undefined =>
          Option.getOrUndefined(option),
      }),
    ),
  )
}

const SortDirection = S.Literals(['Ascending', 'Descending'])

const sortingFromParam = (() => {
  const decodeColumn = S.decodeUnknownOption(SortColumn)
  const decodeDirection = S.decodeUnknownOption(SortDirection)

  return S.UndefinedOr(S.String).pipe(
    S.decodeTo(
      Sorting,
      SchemaTransformation.transform({
        decode: (value: string | undefined) => {
          if (Predicate.isUndefined(value)) {
            return Unsorted()
          }

          const parts = String.split(value, SORT_PARAM_SEPARATOR)

          return pipe(
            Option.all({
              column: pipe(Array.get(parts, 0), Option.flatMap(decodeColumn)),
              direction: pipe(
                Array.get(parts, 1),
                Option.flatMap(decodeDirection),
              ),
            }),
            Option.map(({ column, direction }) =>
              M.value(direction).pipe(
                M.when('Ascending', () => Ascending({ column })),
                M.when('Descending', () => Descending({ column })),
                M.exhaustive,
              ),
            ),
            Option.getOrElse(() => Unsorted()),
          )
        },
        encode: sorting =>
          M.value(sorting).pipe(
            M.withReturnType<string | undefined>(),
            M.tagsExhaustive({
              Unsorted: () => undefined,
              Ascending: ({ column }) =>
                `${column}${SORT_PARAM_SEPARATOR}Ascending`,
              Descending: ({ column }) =>
                `${column}${SORT_PARAM_SEPARATOR}Descending`,
            }),
          ),
      }),
    ),
  )
})()

const BrowseRoute = r('Browse', {
  search: S.Option(S.String),
  sorting: Sorting,
  diet: S.Option(Diet),
  period: S.Option(Period),
})

const NotFoundRoute = r('NotFound', { path: S.String })

const AppRoute = S.Union([BrowseRoute, NotFoundRoute])
type AppRoute = typeof AppRoute.Type

const browseRouter = pipe(
  Route.root,
  Route.query(
    S.Struct({
      search: S.OptionFromUndefinedOr(S.String),
      sorting: sortingFromParam,
      diet: optionFromValidParam(Diet),
      period: optionFromValidParam(Period),
    }),
  ),
  Route.mapTo(BrowseRoute),
)

const routeParser = Route.oneOf(browseRouter)
const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

const Model = S.Struct({
  route: AppRoute,
  dietListbox: Ui.Listbox.Model,
  periodListbox: Ui.Listbox.Model,
})
type Model = typeof Model.Type

// MESSAGE

const CompletedNavigateInternal = m('CompletedNavigateInternal')
const CompletedLoadExternal = m('CompletedLoadExternal')
const CompletedReplaceUrl = m('CompletedReplaceUrl')
const ClickedLink = m('ClickedLink', { request: Runtime.UrlRequest })
const ChangedUrl = m('ChangedUrl', { url: Url })
const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })
const ClickedColumnHeader = m('ClickedColumnHeader', { column: SortColumn })
const GotDietListboxMessage = m('GotDietListboxMessage', {
  message: Ui.Listbox.Message,
})
const GotPeriodListboxMessage = m('GotPeriodListboxMessage', {
  message: Ui.Listbox.Message,
})
const SelectedDietFilter = m('SelectedDietFilter', { value: S.String })
const SelectedPeriodFilter = m('SelectedPeriodFilter', { value: S.String })

const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  CompletedReplaceUrl,
  ClickedLink,
  ChangedUrl,
  ChangedSearchInput,
  ClickedColumnHeader,
  GotDietListboxMessage,
  GotPeriodListboxMessage,
  SelectedDietFilter,
  SelectedPeriodFilter,
])
type Message = typeof Message.Type

// INIT

type BrowseFields = Omit<typeof BrowseRoute.Type, '_tag'>

const emptyBrowseFields: BrowseFields = {
  search: Option.none(),
  sorting: Unsorted(),
  diet: Option.none(),
  period: Option.none(),
}

const routeToBrowseFields = (route: AppRoute): BrowseFields =>
  M.value(route).pipe(
    M.tag('Browse', route => route),
    M.orElse(() => emptyBrowseFields),
  )

const init: Runtime.RoutingProgramInit<Model, Message> = (url: Url) => {
  const route = urlToAppRoute(url)
  const fields = routeToBrowseFields(route)

  return [
    {
      route,
      dietListbox: Ui.Listbox.init({
        id: 'diet-filter',
        selectedItem: Option.getOrElse(fields.diet, () => ''),
      }),
      periodListbox: Ui.Listbox.init({
        id: 'period-filter',
        selectedItem: Option.getOrElse(fields.period, () => ''),
      }),
    },
    [],
  ]
}

// UPDATE

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
    M.value,
    M.when('Unsorted', () => Ascending({ column })),
    M.when('Ascending', () => Descending({ column })),
    M.when('Descending', () => Unsorted()),
    M.exhaustive,
  )

const selectionToParam = <A extends string>(
  maybeSelectedItem: Option.Option<string>,
  schema: S.Codec<A, A>,
): Option.Option<A> => {
  const decode = S.decodeUnknownOption(schema)

  return pipe(
    maybeSelectedItem,
    Option.filter(String.isNonEmpty),
    Option.flatMap(value => decode(value)),
  )
}

const ReplaceFilters = Command.define('ReplaceFilters', CompletedReplaceUrl)
const NavigateInternal = Command.define(
  'NavigateInternal',
  CompletedNavigateInternal,
)
const LoadExternal = Command.define('LoadExternal', CompletedLoadExternal)

const replaceFilters = (fields: BrowseFields) =>
  ReplaceFilters(
    replaceUrl(browseRouter(fields)).pipe(Effect.as(CompletedReplaceUrl())),
  )

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],
      CompletedReplaceUrl: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [
                NavigateInternal(
                  pushUrl(urlToString(url)).pipe(
                    Effect.as(CompletedNavigateInternal()),
                  ),
                ),
              ],
            ],
            External: ({ href }) => [
              model,
              [
                LoadExternal(
                  load(href).pipe(Effect.as(CompletedLoadExternal())),
                ),
              ],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const fields = routeToBrowseFields(nextRoute)

        return [
          evo(model, {
            route: () => nextRoute,
            dietListbox: () =>
              evo(model.dietListbox, {
                maybeSelectedItem: () =>
                  Option.orElse(fields.diet, () => Option.some('')),
              }),
            periodListbox: () =>
              evo(model.periodListbox, {
                maybeSelectedItem: () =>
                  Option.orElse(fields.period, () => Option.some('')),
              }),
          }),
          [],
        ]
      },

      ChangedSearchInput: ({ value }) => {
        const fields = routeToBrowseFields(model.route)

        return [
          model,
          [
            replaceFilters({
              ...fields,
              search: Option.liftPredicate(value, String.isNonEmpty),
            }),
          ],
        ]
      },

      ClickedColumnHeader: ({ column }) => {
        const fields = routeToBrowseFields(model.route)

        return [
          model,
          [
            replaceFilters({
              ...fields,
              sorting: nextSorting(fields.sorting, column),
            }),
          ],
        ]
      },

      GotDietListboxMessage: ({ message }) => {
        const [nextDietListbox, listboxCommands] = Ui.Listbox.update(
          model.dietListbox,
          message,
        )

        return [
          evo(model, { dietListbox: () => nextDietListbox }),
          listboxCommands.map(
            Command.mapEffect(
              Effect.map(message => GotDietListboxMessage({ message })),
            ),
          ),
        ]
      },

      GotPeriodListboxMessage: ({ message }) => {
        const [nextPeriodListbox, listboxCommands] = Ui.Listbox.update(
          model.periodListbox,
          message,
        )

        return [
          evo(model, { periodListbox: () => nextPeriodListbox }),
          listboxCommands.map(
            Command.mapEffect(
              Effect.map(message => GotPeriodListboxMessage({ message })),
            ),
          ),
        ]
      },

      SelectedDietFilter: ({ value }) => {
        const [nextDietListbox, listboxCommands] = Ui.Listbox.selectItem(
          model.dietListbox,
          value,
        )
        const fields = routeToBrowseFields(model.route)

        return [
          evo(model, { dietListbox: () => nextDietListbox }),
          [
            ...listboxCommands.map(
              Command.mapEffect(
                Effect.map(message => GotDietListboxMessage({ message })),
              ),
            ),
            replaceFilters({
              ...fields,
              diet: selectionToParam(nextDietListbox.maybeSelectedItem, Diet),
            }),
          ],
        ]
      },

      SelectedPeriodFilter: ({ value }) => {
        const [nextPeriodListbox, listboxCommands] = Ui.Listbox.selectItem(
          model.periodListbox,
          value,
        )
        const fields = routeToBrowseFields(model.route)

        return [
          evo(model, { periodListbox: () => nextPeriodListbox }),
          [
            ...listboxCommands.map(
              Command.mapEffect(
                Effect.map(message => GotPeriodListboxMessage({ message })),
              ),
            ),
            replaceFilters({
              ...fields,
              period: selectionToParam(
                nextPeriodListbox.maybeSelectedItem,
                Period,
              ),
            }),
          ],
        ]
      },
    }),
  )

// VIEW

const {
  a,
  button,
  div,
  h1,
  header,
  input,
  keyed,
  main,
  p,
  path,
  span,
  svg,
  table,
  tbody,
  td,
  th,
  thead,
  tr,
  AriaHidden,
  AriaLabel,
  AriaSort,
  Class,
  D,
  Fill,
  Href,
  OnClick,
  OnInput,
  Placeholder,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  Type,
  Value,
  ViewBox,
  Xmlns,
} = html<Message>()

const columnOrders: Record<SortColumn, Order.Order<Dinosaur>> = {
  Name: Order.mapInput(Order.String, ({ name }: Dinosaur) => name),
  Period: Order.mapInput(Order.String, ({ period }: Dinosaur) => period),
  Diet: Order.mapInput(Order.String, ({ diet }: Dinosaur) => diet),
  Length: Order.mapInput(
    Order.Number,
    ({ lengthMeters }: Dinosaur) => lengthMeters,
  ),
  Weight: Order.mapInput(Order.Number, ({ weightKg }: Dinosaur) => weightKg),
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
    M.value(sorting).pipe(
      M.tag('Unsorted', () => items),
      M.tag('Ascending', ({ column }) => Array.sort(items, orders[column])),
      M.tag('Descending', ({ column }) =>
        Array.sort(items, Order.flip(orders[column])),
      ),
      M.exhaustive,
    )

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
  M.value(columnSortDirection(sorting, column)).pipe(
    M.when('Unsorted', () => ''),
    M.when('Ascending', () => '\u2191'),
    M.when('Descending', () => '\u2193'),
    M.exhaustive,
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

const sortAriaLabel = (column: SortColumn, sorting: Sorting): string =>
  M.value(columnSortDirection(sorting, column)).pipe(
    M.when('Unsorted', () => `Sort by ${column}`),
    M.when('Ascending', () => `Sort by ${column}, currently ascending`),
    M.when('Descending', () => `Sort by ${column}, currently descending`),
    M.exhaustive,
  )

const ariaSortValue = (column: SortColumn, sorting: Sorting): string =>
  M.value(columnSortDirection(sorting, column)).pipe(
    M.when('Unsorted', () => 'none'),
    M.when('Ascending', () => 'ascending'),
    M.when('Descending', () => 'descending'),
    M.exhaustive,
  )

const sortableColumnHeader = (
  column: SortColumn,
  displayLabel: string,
  fields: BrowseFields,
  isRightAligned: boolean,
): Html => {
  const indicator = span(
    [Class(clsx(SORT_INDICATOR_WIDTH, 'inline-block text-center'))],
    [sortIndicator(column, fields.sorting)],
  )
  const label = span([], [displayLabel])
  const alignment = isRightAligned ? 'text-right' : 'text-left'

  return th(
    [AriaSort(ariaSortValue(column, fields.sorting))],
    [
      button(
        [
          Type('button'),
          OnClick(ClickedColumnHeader({ column })),
          AriaLabel(sortAriaLabel(column, fields.sorting)),
          Class(clsx(headerButtonClass, alignment)),
        ],
        isRightAligned ? [indicator, label] : [label, indicator],
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

const filterItemConfig = (label: string): Ui.Listbox.ItemConfig => ({
  className: listboxItemClassName,
  content: div(
    [Class('flex items-center gap-2')],
    [
      span(
        [
          Class(
            'w-4 text-center text-emerald-600 invisible group-data-[selected]:visible',
          ),
        ],
        ['\u2713'],
      ),
      span([], [label]),
    ],
  ),
})

const chevronDown = (className: string): Html =>
  svg(
    [
      AriaHidden(true),
      Class(className),
      Xmlns('http://www.w3.org/2000/svg'),
      Fill('none'),
      ViewBox('0 0 24 24'),
      StrokeWidth('1.5'),
      Stroke('currentColor'),
    ],
    [
      path(
        [
          StrokeLinecap('round'),
          StrokeLinejoin('round'),
          D('M19.5 8.25l-7.5 7.5-7.5-7.5'),
        ],
        [],
      ),
    ],
  )

const filterButtonContent = (label: string): Html =>
  div(
    [Class('flex w-full items-center justify-between gap-4')],
    [span([], [label]), chevronDown('w-4 h-4 text-gray-400')],
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

const browseView = (model: Model, route: typeof BrowseRoute.Type): Html => {
  const fields = routeToBrowseFields(route)
  const results = filterAndSort(fields)

  return div(
    [Class('max-w-6xl mx-auto px-4')],
    [
      h1(
        [Class('text-3xl font-bold text-gray-800 mb-2')],
        ['Dinosaur Explorer'],
      ),
      p(
        [Class('text-gray-500 mb-6')],
        [
          'Filter, sort, and search \u2014 every control syncs to the URL. Try changing the filters, then copy the URL or hit the back button.',
        ],
      ),

      div(
        [Class('flex flex-wrap items-start gap-3 mb-6')],
        [
          input([
            Value(Option.getOrElse(fields.search, () => '')),
            Placeholder('Search by name\u2026'),
            OnInput(value => ChangedSearchInput({ value })),
            Class(
              'flex-1 min-w-48 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
            ),
          ]),
          Ui.Listbox.view<Message, string>({
            model: model.dietListbox,
            toParentMessage: message => GotDietListboxMessage({ message }),
            onSelectedItem: value => SelectedDietFilter({ value }),
            anchor: LISTBOX_ANCHOR,
            items: dietFilterItems,
            itemToConfig: item => filterItemConfig(dietLabel(item)),
            itemToSearchText: dietLabel,
            buttonContent: filterButtonContent(
              filterButtonLabel(
                model.dietListbox.maybeSelectedItem,
                'All Diets',
              ),
            ),
            buttonAttributes: [Class(listboxButtonClassName)],
            itemsAttributes: [Class(listboxItemsClassName)],
            backdropAttributes: [Class(listboxBackdropClassName)],
            attributes: [Class(listboxWrapperClassName)],
          }),
          Ui.Listbox.view<Message, string>({
            model: model.periodListbox,
            toParentMessage: message => GotPeriodListboxMessage({ message }),
            onSelectedItem: value => SelectedPeriodFilter({ value }),
            anchor: LISTBOX_ANCHOR,
            items: periodFilterItems,
            itemToConfig: item => filterItemConfig(periodLabel(item)),
            itemToSearchText: periodLabel,
            buttonContent: filterButtonContent(
              filterButtonLabel(
                model.periodListbox.maybeSelectedItem,
                'All Periods',
              ),
            ),
            buttonAttributes: [Class(listboxButtonClassName)],
            itemsAttributes: [Class(listboxItemsClassName)],
            backdropAttributes: [Class(listboxBackdropClassName)],
            attributes: [Class(listboxWrapperClassName)],
          }),
        ],
      ),

      p(
        [Class('text-sm text-gray-500 mb-3')],
        [
          `Showing ${Array.length(results)} of ${Array.length(dinosaurs)} dinosaurs`,
        ],
      ),

      Array.match(results, {
        onEmpty: () =>
          div(
            [Class('text-center py-12 text-gray-400')],
            [
              p([Class('text-lg')], ['No dinosaurs match your filters.']),
              p(
                [Class('text-sm mt-2')],
                ['Try broadening your search or removing filters.'],
              ),
            ],
          ),
        onNonEmpty: rows =>
          div(
            [Class('overflow-x-auto rounded-lg border border-gray-200')],
            [
              table(
                [Class('w-full')],
                [
                  thead(
                    [Class('bg-gray-50 border-b border-gray-200')],
                    [
                      tr(
                        [],
                        [
                          sortableColumnHeader('Name', 'Name', fields, false),
                          sortableColumnHeader(
                            'Period',
                            'Period',
                            fields,
                            false,
                          ),
                          sortableColumnHeader('Diet', 'Diet', fields, false),
                          sortableColumnHeader(
                            'Length',
                            'Length (m)',
                            fields,
                            true,
                          ),
                          sortableColumnHeader(
                            'Weight',
                            'Weight (kg)',
                            fields,
                            true,
                          ),
                        ],
                      ),
                    ],
                  ),
                  tbody(
                    [],
                    Array.map(rows, dinosaur =>
                      tr(
                        [
                          Class(
                            'border-b border-gray-100 hover:bg-gray-50 transition',
                          ),
                        ],
                        [
                          td(
                            [
                              Class(
                                clsx(
                                  bodyCellClass,
                                  'font-medium text-gray-900',
                                ),
                              ),
                            ],
                            [dinosaur.name],
                          ),
                          td(
                            [Class(bodyCellClass)],
                            [
                              span(
                                [Class(periodBadgeClass(dinosaur.period))],
                                [dinosaur.period],
                              ),
                            ],
                          ),
                          td(
                            [Class(bodyCellClass)],
                            [
                              span(
                                [Class(dietBadgeClass(dinosaur.diet))],
                                [dinosaur.diet],
                              ),
                            ],
                          ),
                          td(
                            [
                              Class(
                                clsx(bodyCellClass, 'text-right tabular-nums'),
                              ),
                            ],
                            [dinosaur.lengthMeters.toString()],
                          ),
                          td(
                            [
                              Class(
                                clsx(bodyCellClass, 'text-right tabular-nums'),
                              ),
                            ],
                            [dinosaur.weightKg.toLocaleString()],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
      }),

      p(
        [Class('text-xs text-gray-400 mt-6 text-center')],
        [
          'All filter and sort state lives in the URL. Share it or bookmark it.',
        ],
      ),
    ],
  )
}

const notFoundView = (path: string): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h1(
        [Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 \u2014 Page Not Found'],
      ),
      p(
        [Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      a(
        [
          Href(browseRouter(emptyBrowseFields)),
          Class('text-emerald-600 hover:underline'),
        ],
        ['\u2190 Back to Dinosaur Explorer'],
      ),
    ],
  )

const routeTitle = (route: Model['route']): string =>
  M.value(route).pipe(
    M.tag('Browse', () => 'Dinosaur Explorer'),
    M.orElse(() => 'Not Found — Dinosaur Explorer'),
  )

const view = (model: Model): Document => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Browse: route => browseView(model, route),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  const body = div(
    [Class('min-h-screen bg-gray-50')],
    [
      header(
        [Class('bg-emerald-600 text-white px-6 py-4 mb-8 shadow-sm')],
        [
          div(
            [Class('max-w-6xl mx-auto flex items-center gap-3')],
            [
              span([Class('text-lg font-semibold')], ['foldkit']),
              span([Class('text-emerald-200 text-sm')], ['query-sync example']),
            ],
          ),
        ],
      ),
      main(
        [Class('pb-12')],
        [keyed('div')(model.route._tag, [], [routeContent])],
      ),
    ],
  )

  return { title: routeTitle(model.route), body }
}

// RUN

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.run(program)
