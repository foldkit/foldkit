import {
  Array,
  Number,
  Option,
  Schema,
  SchemaTransformation,
  String,
  pipe,
} from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'
import type { Url } from 'foldkit/url'

import { Region } from './region'

// CONSTANT

const FIRST_PAGE_NUMBER = 1
const EXPANDED_NAMES_SEPARATOR = ','

// QUERY PARAM

const queryParam = <A>(
  schema: Schema.Codec<A, A>,
  decode: (maybeRaw: Option.Option<string>) => A,
  encode: (value: A) => Option.Option<string>,
) =>
  Schema.OptionFromOptional(Schema.String).pipe(
    Schema.decodeTo(schema, SchemaTransformation.transform({ decode, encode })),
  )

const decodeRegion = Schema.decodeUnknownOption(Region)

const SearchParam = queryParam(
  Schema.String,
  Option.getOrElse(() => ''),
  Option.liftPredicate(String.isNonEmpty),
)

const RegionParam = queryParam(
  Region,
  maybeRaw =>
    pipe(
      maybeRaw,
      Option.flatMap(decodeRegion),
      Option.getOrElse((): Region => 'All'),
    ),
  Option.liftPredicate(region => region !== 'All'),
)

const isPageNumber = (pageNumber: number): boolean =>
  globalThis.Number.isSafeInteger(pageNumber) && pageNumber >= FIRST_PAGE_NUMBER

const PageIndexParam = queryParam(
  Schema.Number,
  maybeRaw =>
    pipe(
      maybeRaw,
      Option.flatMap(Number.parse),
      Option.filter(isPageNumber),
      Option.match({
        onNone: () => 0,
        onSome: pageNumber => pageNumber - FIRST_PAGE_NUMBER,
      }),
    ),
  pageIndex =>
    pipe(
      pageIndex,
      Option.liftPredicate(Number.isGreaterThan(0)),
      Option.map(index => `${index + FIRST_PAGE_NUMBER}`),
    ),
)

const ExpandedNamesParam = queryParam(
  Schema.Array(Schema.String),
  maybeRaw =>
    Option.match(maybeRaw, {
      onNone: () => [],
      onSome: raw =>
        pipe(
          raw,
          String.split(EXPANDED_NAMES_SEPARATOR),
          Array.map(String.trim),
          Array.filter(String.isNonEmpty),
          Array.dedupe,
        ),
    }),
  names =>
    pipe(
      names,
      Option.liftPredicate(Array.isReadonlyArrayNonEmpty),
      Option.map(Array.join(EXPANDED_NAMES_SEPARATOR)),
    ),
)

// ROUTE

export const AppRoute = defineRouteUnion({
  Pokedex: {
    search: Schema.String,
    region: Region,
    pageIndex: Schema.Number,
    expandedNames: Schema.Array(Schema.String),
  },
  NotFound: { path: Schema.String },
})
export type AppRoute = typeof AppRoute.Type

export type PokedexFields = Omit<typeof AppRoute.Pokedex.Type, '_tag'>

export const pokedexRouter = pipe(
  Route.root,
  Route.query(
    Schema.Struct({
      search: SearchParam,
      region: RegionParam,
      pageIndex: PageIndexParam,
      expandedNames: ExpandedNamesParam,
    }).pipe(
      Schema.encodeKeys({
        search: 'q',
        pageIndex: 'page',
        expandedNames: 'expanded',
      }),
    ),
  ),
  Route.mapTo(AppRoute.Pokedex),
)

const urlToAppRoute = Route.parseUrlWithFallback(
  Route.oneOf(pokedexRouter),
  AppRoute.NotFound,
)

const defaultPokedexFields: PokedexFields = {
  search: '',
  region: 'All',
  pageIndex: 0,
  expandedNames: [],
}

export const urlToPokedexFields = (url: Url) =>
  AppRoute.match<PokedexFields>(urlToAppRoute(url), {
    Pokedex: ({ search, region, pageIndex, expandedNames }) => ({
      search,
      region,
      pageIndex,
      expandedNames,
    }),
    NotFound: () => defaultPokedexFields,
  })
