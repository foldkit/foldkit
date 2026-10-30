import { Array, Number, Option, String, pipe } from 'effect'

import {
  type ColumnFiltersState,
  type PaginationState,
  columnFilteringFeature,
  constructTable,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  filterFn_inNumberRange,
  rowPaginationFeature,
  tableFeatures,
} from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

import type { PokemonSummary } from './pokeApi'
import { type Region, regionIdRange } from './region'

// SEARCH

const POKEDEX_NUMBER_SEARCH_PATTERN = /^#?(\d+)$/

const pokedexNumberFromSearch = (search: string): Option.Option<number> =>
  pipe(
    search,
    String.match(POKEDEX_NUMBER_SEARCH_PATTERN),
    Option.flatMap(Array.get(1)),
    Option.flatMap(Number.parse),
  )

export const matchesSearch = (
  { id, name }: PokemonSummary,
  search: string,
): boolean => {
  const normalizedSearch = pipe(search, String.trim, String.toLowerCase)

  return (
    String.includes(normalizedSearch)(name) ||
    Option.contains(pokedexNumberFromSearch(normalizedSearch), id)
  )
}

// FEATURES

const features = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    inNumberRange: filterFn_inNumberRange,
    matchesSearch: (
      { original }: Readonly<{ original: PokemonSummary }>,
      _columnId: string,
      search: string,
    ) => matchesSearch(original, search),
  },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

// COLUMNS

const columnHelper = createColumnHelper<typeof features, PokemonSummary>()

const columns = columnHelper.columns([
  columnHelper.accessor('id', { filterFn: 'inNumberRange' }),
  columnHelper.accessor('name', { filterFn: 'matchesSearch' }),
])

// TABLE

type TableInput = Readonly<{
  pokemon: ReadonlyArray<PokemonSummary>
  search: string
  region: Region
  pagination: PaginationState
}>

const columnFiltersFor = (search: string, region: Region): ColumnFiltersState =>
  Array.getSomes([
    pipe(
      search,
      String.trim,
      Option.liftPredicate(String.isNonEmpty),
      Option.map(value => ({ id: 'name', value })),
    ),
    Option.map(regionIdRange(region), idRange => ({
      id: 'id',
      value: idRange,
    })),
  ])

export const tableFor = ({ pokemon, search, region, pagination }: TableInput) =>
  constructTable({
    features,
    columns,
    data: pokemon,
    getRowId: ({ name }) => name,
    autoResetPageIndex: false,
    state: {
      columnFilters: columnFiltersFor(search, region),
      pagination,
    },
  })
