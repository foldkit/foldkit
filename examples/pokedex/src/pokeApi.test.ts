import { Effect, Layer, Schema } from 'effect'
import {
  HttpClient,
  HttpClientError,
  type HttpClientRequest,
  HttpClientResponse,
} from 'effect/http'
import { expect, test } from 'vitest'

import {
  PokeApi,
  PokeApiError,
  PokeApiLive,
  PokemonListResponse,
} from './pokeApi'

const NOT_FOUND_STATUS = 404
const SERVICE_UNAVAILABLE_STATUS = 503

const decodePokemonList = Schema.decodeUnknownSync(PokemonListResponse)

const fetchBulbasaurError = (
  respond: (
    request: HttpClientRequest.HttpClientRequest,
  ) => Effect.Effect<
    HttpClientResponse.HttpClientResponse,
    HttpClientError.HttpClientError
  >,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const pokeApi = yield* PokeApi
      return yield* Effect.flip(pokeApi.fetchPokemon('bulbasaur'))
    }).pipe(
      Effect.provide(
        PokeApiLive.pipe(
          Layer.provide(
            Layer.succeed(HttpClient.HttpClient)(HttpClient.make(respond)),
          ),
        ),
      ),
    ),
  )

const respondWithStatus =
  (status: number) => (request: HttpClientRequest.HttpClientRequest) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response('', { status })),
    )

test('a list entry decodes its id from the Pokémon URL', () => {
  expect(
    decodePokemonList({
      results: [
        { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
        { name: 'deoxys', url: 'https://pokeapi.co/api/v2/pokemon/386/' },
      ],
    }),
  ).toEqual({
    results: [
      { id: 1, name: 'bulbasaur' },
      { id: 386, name: 'deoxys' },
    ],
  })
})

test('a list entry with a URL that has no numeric id fails to decode', () => {
  expect(() =>
    decodePokemonList({
      results: [
        {
          name: 'bulbasaur',
          url: 'https://pokeapi.co/api/v2/pokemon/bulbasaur/',
        },
      ],
    }),
  ).toThrow()
})

test('a 404 from PokéAPI maps to NotFound', async () => {
  expect(
    await fetchBulbasaurError(respondWithStatus(NOT_FOUND_STATUS)),
  ).toEqual(PokeApiError.NotFound())
})

test('any other failed status maps to Unavailable', async () => {
  expect(
    await fetchBulbasaurError(respondWithStatus(SERVICE_UNAVAILABLE_STATUS)),
  ).toEqual(PokeApiError.Unavailable())
})

test('a transport failure maps to Unavailable', async () => {
  expect(
    await fetchBulbasaurError(request =>
      Effect.fail(
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({ request }),
        }),
      ),
    ),
  ).toEqual(PokeApiError.Unavailable())
})
