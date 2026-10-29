import {
  Array,
  Match,
  Option,
  Schema,
  SchemaTransformation,
  String,
  Types,
  pipe,
} from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'
import { defineTaggedUnion } from 'foldkit/schema'

export const Diet = Schema.Literals(['Carnivore', 'Herbivore', 'Omnivore'])
export type Diet = typeof Diet.Type
export const Period = Schema.Literals(['Triassic', 'Jurassic', 'Cretaceous'])
export type Period = typeof Period.Type
export const SortColumn = Schema.Literals([
  'Name',
  'Period',
  'Diet',
  'Length',
  'Weight',
])
export type SortColumn = typeof SortColumn.Type

export const Sorting = defineTaggedUnion({
  Unsorted: {},
  Ascending: { column: SortColumn },
  Descending: { column: SortColumn },
})
export type Sorting = typeof Sorting.Type
const SORT_PARAM_SEPARATOR = ':'

const optionFromValidParam = <A extends string>(schema: Schema.Codec<A, A>) => {
  const decode = Schema.decodeUnknownOption(schema)

  return Schema.OptionFromOptional(Schema.String).pipe(
    Schema.decodeTo(
      Schema.Option(schema),
      SchemaTransformation.transform({
        decode: maybeRaw => Option.flatMap(maybeRaw, decode),
        encode: maybeValue => maybeValue,
      }),
    ),
  )
}

const SortDirection = Schema.Literals(['Ascending', 'Descending'])
type SortDirection = typeof SortDirection.Type

const sortingFromParam = (() => {
  const decodeColumn = Schema.decodeUnknownOption(SortColumn)
  const decodeDirection = Schema.decodeUnknownOption(SortDirection)

  return Schema.OptionFromOptional(Schema.String).pipe(
    Schema.decodeTo(
      Sorting,
      SchemaTransformation.transform({
        decode: maybeRaw =>
          Option.match(maybeRaw, {
            onNone: () => Sorting.Unsorted(),
            onSome: value => {
              const parts = String.split(value, SORT_PARAM_SEPARATOR)

              return pipe(
                Option.all({
                  column: pipe(
                    parts,
                    Array.get(0),
                    Option.flatMap(decodeColumn),
                  ),
                  direction: pipe(
                    parts,
                    Array.get(1),
                    Option.flatMap(decodeDirection),
                  ),
                }),
                Option.map(({ column, direction }) =>
                  Match.value(direction).pipe(
                    Match.when('Ascending', () =>
                      Sorting.Ascending({ column }),
                    ),
                    Match.when('Descending', () =>
                      Sorting.Descending({ column }),
                    ),
                    Match.exhaustive,
                  ),
                ),
                Option.getOrElse(() => Sorting.Unsorted()),
              )
            },
          }),
        encode: sorting =>
          Sorting.match<Option.Option<string>>(sorting, {
            Unsorted: () => Option.none(),
            Ascending: ({ column }) =>
              Option.some(`${column}${SORT_PARAM_SEPARATOR}Ascending`),
            Descending: ({ column }) =>
              Option.some(`${column}${SORT_PARAM_SEPARATOR}Descending`),
          }),
      }),
    ),
  )
})()

export const ApplicationRoute = defineRouteUnion({
  Browse: {
    search: Schema.Option(Schema.String),
    sorting: Sorting,
    diet: Schema.Option(Diet),
    period: Schema.Option(Period),
  },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type
export type BrowseRoute = typeof ApplicationRoute.Browse.Type

export const browseRouter = pipe(
  Route.root,
  Route.query(
    Schema.Struct({
      search: Schema.OptionFromOptional(Schema.String),
      sorting: sortingFromParam,
      diet: optionFromValidParam(Diet),
      period: optionFromValidParam(Period),
    }),
  ),
  Route.mapTo(ApplicationRoute.Browse),
)

const routeParser = Route.oneOf(browseRouter)
export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
export type BrowseFields = Omit<BrowseRoute, '_tag'>

export const emptyBrowseFields: BrowseFields = {
  search: Option.none(),
  sorting: Sorting.Unsorted(),
  diet: Option.none(),
  period: Option.none(),
}

export const routeToBrowseFields = (route: ApplicationRoute): BrowseFields =>
  Match.value(route).pipe(
    Match.tag('Browse', route => route),
    Match.orElse(() => emptyBrowseFields),
  )
export const columnSortDirection = (
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

export const nextSorting = (sorting: Sorting, column: SortColumn): Sorting =>
  pipe(
    columnSortDirection(sorting, column),
    Match.value,
    Match.when('Unsorted', () => Sorting.Ascending({ column })),
    Match.when('Ascending', () => Sorting.Descending({ column })),
    Match.when('Descending', () => Sorting.Unsorted()),
    Match.exhaustive,
  )
