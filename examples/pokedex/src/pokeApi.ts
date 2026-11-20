import {
  Array,
  Context,
  Effect,
  Layer,
  Number,
  Option,
  Schema,
  SchemaIssue,
  SchemaTransformation,
  String,
  pipe,
} from 'effect'
import { type HttpClient, HttpClientError } from 'effect/http'
import {
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
} from 'effect/http-api'
import { defineTaggedUnion } from 'foldkit/schema'

import { POKEDEX_SIZE } from './region'

// CONSTANT

const POKEAPI_URL = 'https://pokeapi.co/api/v2'
const NOT_FOUND_STATUS = 404
const POKEMON_URL_ID_PATTERN = /\/pokemon\/(\d+)\/?$/

// DOMAIN

export const PokemonSummary = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
})
export type PokemonSummary = typeof PokemonSummary.Type

const PokemonStat = Schema.Struct({
  name: Schema.String,
  baseStat: Schema.Number,
})
export type PokemonStat = typeof PokemonStat.Type

export const PokemonDetail = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  heightDecimetres: Schema.Number,
  weightHectograms: Schema.Number,
  types: Schema.Array(Schema.String),
  stats: Schema.Array(PokemonStat),
  abilities: Schema.Array(Schema.String),
  maybeArtworkUrl: Schema.Option(Schema.String),
})
export type PokemonDetail = typeof PokemonDetail.Type

export const PokeApiError = defineTaggedUnion({
  NotFound: {},
  Unavailable: {},
})
export type PokeApiError = typeof PokeApiError.Type

export const PokemonListError = PokeApiError.subset(['Unavailable'])
type PokemonListError = typeof PokemonListError.Type

// WIRE

const pokemonIdFromUrl = (url: string): Option.Option<number> =>
  pipe(
    url,
    String.match(POKEMON_URL_ID_PATTERN),
    Option.flatMap(Array.get(1)),
    Option.flatMap(Number.parse),
  )

const PokemonListEntry = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
})

const PokemonSummaryFromListEntry = PokemonListEntry.pipe(
  Schema.decodeTo(
    PokemonSummary,
    SchemaTransformation.transformEffect({
      decode: ({ name, url }, options) =>
        Option.match(pokemonIdFromUrl(url), {
          onNone: () =>
            Effect.fail(
              new SchemaIssue.InvalidValue(
                { expected: 'a PokeAPI Pokémon URL ending in a numeric id' },
                url,
                options,
              ),
            ),
          onSome: id => Effect.succeed({ id, name }),
        }),
      encode: ({ id, name }) =>
        Effect.succeed({ name, url: `${POKEAPI_URL}/pokemon/${id}/` }),
    }),
  ),
)

export const PokemonListResponse = Schema.Struct({
  results: Schema.Array(PokemonSummaryFromListEntry),
})

const NamedResource = Schema.Struct({ name: Schema.String })

const PokemonResponse = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  height: Schema.Number,
  weight: Schema.Number,
  types: Schema.Array(Schema.Struct({ type: NamedResource })),
  stats: Schema.Array(
    Schema.Struct({ base_stat: Schema.Number, stat: NamedResource }),
  ),
  abilities: Schema.Array(Schema.Struct({ ability: NamedResource })),
  sprites: Schema.Struct({
    other: Schema.Struct({
      'official-artwork': Schema.Struct({
        front_default: Schema.NullOr(Schema.String),
      }),
    }),
  }),
})
type PokemonResponse = typeof PokemonResponse.Type

const toPokemonDetail = (response: PokemonResponse): PokemonDetail =>
  PokemonDetail.make({
    id: response.id,
    name: response.name,
    heightDecimetres: response.height,
    weightHectograms: response.weight,
    types: Array.map(response.types, ({ type }) => type.name),
    stats: Array.map(response.stats, ({ base_stat, stat }) => ({
      name: stat.name,
      baseStat: base_stat,
    })),
    abilities: Array.map(response.abilities, ({ ability }) => ability.name),
    maybeArtworkUrl: Option.fromNullOr(
      response.sprites.other['official-artwork'].front_default,
    ),
  })

// API

const PokeApiDefinition = HttpApi.make('PokeApi').add(
  HttpApiGroup.make('pokemon', { topLevel: true }).add(
    HttpApiEndpoint.get('listPokemon', '/pokemon', {
      query: { limit: Schema.Number },
      success: PokemonListResponse,
    }),
    HttpApiEndpoint.get('getPokemon', '/pokemon/:name', {
      params: { name: Schema.String },
      success: PokemonResponse,
    }),
  ),
)

// ERROR

type ClientError = HttpClientError.HttpClientError | Schema.SchemaError

const isNotFoundResponse = (error: ClientError): boolean =>
  HttpClientError.isHttpClientError(error) &&
  Option.exists(
    Option.fromUndefinedOr(error.response),
    ({ status }) => status === NOT_FOUND_STATUS,
  )

const toPokeApiError = (error: ClientError): PokeApiError => {
  if (isNotFoundResponse(error)) {
    return PokeApiError.NotFound()
  } else {
    return PokeApiError.Unavailable()
  }
}

// SERVICE

type PokeApiShape = Readonly<{
  fetchPokemonList: Effect.Effect<
    ReadonlyArray<PokemonSummary>,
    PokemonListError
  >
  fetchPokemon: (name: string) => Effect.Effect<PokemonDetail, PokeApiError>
}>

export class PokeApi extends Context.Service<PokeApi, PokeApiShape>()(
  'pokedex/PokeApi',
) {}

export const PokeApiLive: Layer.Layer<PokeApi, never, HttpClient.HttpClient> =
  Layer.effect(
    PokeApi,
    Effect.gen(function* () {
      const client = yield* HttpApiClient.make(PokeApiDefinition, {
        baseUrl: POKEAPI_URL,
      })

      return {
        fetchPokemonList: client
          .listPokemon({ query: { limit: POKEDEX_SIZE } })
          .pipe(
            Effect.map(({ results }) => results),
            Effect.mapError(() => PokeApiError.Unavailable()),
          ),
        fetchPokemon: (name: string) =>
          client
            .getPokemon({ params: { name } })
            .pipe(Effect.map(toPokemonDetail), Effect.mapError(toPokeApiError)),
      }
    }),
  )
