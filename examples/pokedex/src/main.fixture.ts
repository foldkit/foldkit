import { Option, Result } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { type Url, fromString } from 'foldkit/url'

import { Animation } from '@foldkit/ui'

import {
  Flags,
  detailAnimationId,
  init,
  pokemonListQuery,
  pokemonQuery,
} from './main'
import {
  PokeApiError,
  type PokemonDetail,
  type PokemonSummary,
} from './pokeApi'

export const urlOrThrow = (raw: string): Url =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const rootUrl = urlOrThrow('http://localhost/')

export const flags = Flags.make({ shortcutPlatform: 'Other' })

const fixturePokemon: ReadonlyArray<PokemonSummary> = [
  { id: 1, name: 'bulbasaur' },
  { id: 2, name: 'ivysaur' },
  { id: 3, name: 'venusaur' },
  { id: 4, name: 'charmander' },
  { id: 5, name: 'charmeleon' },
  { id: 6, name: 'charizard' },
  { id: 7, name: 'squirtle' },
  { id: 8, name: 'wartortle' },
  { id: 9, name: 'blastoise' },
  { id: 10, name: 'caterpie' },
  { id: 11, name: 'metapod' },
  { id: 12, name: 'butterfree' },
  { id: 13, name: 'weedle' },
  { id: 14, name: 'kakuna' },
  { id: 15, name: 'beedrill' },
  { id: 16, name: 'pidgey' },
  { id: 17, name: 'pidgeotto' },
  { id: 18, name: 'pidgeot' },
  { id: 19, name: 'rattata' },
  { id: 20, name: 'raticate' },
  { id: 21, name: 'spearow' },
  { id: 22, name: 'fearow' },
  { id: 23, name: 'ekans' },
  { id: 24, name: 'arbok' },
  { id: 25, name: 'pikachu' },
  { id: 152, name: 'chikorita' },
  { id: 153, name: 'bayleef' },
  { id: 154, name: 'meganium' },
  { id: 252, name: 'treecko' },
  { id: 253, name: 'grovyle' },
  { id: 254, name: 'sceptile' },
]

export const bulbasaurDetail: PokemonDetail = {
  id: 1,
  name: 'bulbasaur',
  heightDecimetres: 7,
  weightHectograms: 69,
  types: ['grass', 'poison'],
  stats: [
    { name: 'hp', baseStat: 45 },
    { name: 'attack', baseStat: 49 },
    { name: 'defense', baseStat: 49 },
    { name: 'special-attack', baseStat: 65 },
    { name: 'special-defense', baseStat: 65 },
    { name: 'speed', baseStat: 45 },
  ],
  abilities: ['overgrow', 'chlorophyll'],
  maybeArtworkUrl: Option.some(
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
  ),
}

const loadingModel = init(flags, rootUrl).model

const loadedPokemonListQueryModel = pokemonListQuery.update(
  loadingModel.pokemonList,
  pokemonListQuery.Message.CompletedFetch({
    generation: loadingModel.pokemonList.generation,
    result: Result.succeed(fixturePokemon),
  }),
).model

export const loadedModel = modifyFields(loadingModel, {
  pokemonList: () => loadedPokemonListQueryModel,
})

const failedPokemonListQueryModel = pokemonListQuery.update(
  loadingModel.pokemonList,
  pokemonListQuery.Message.CompletedFetch({
    generation: loadingModel.pokemonList.generation,
    result: Result.fail(PokeApiError.Unavailable()),
  }),
).model

export const failedListModel = modifyFields(loadingModel, {
  pokemonList: () => failedPokemonListQueryModel,
})

const bulbasaurArgs = { name: 'bulbasaur' }

const loadingBulbasaurQueryModel = pokemonQuery.loadIfMissing(
  pokemonQuery.init(),
  bulbasaurArgs,
).model

const cachedBulbasaurQueryModel = pokemonQuery.update(
  loadingBulbasaurQueryModel,
  pokemonQuery.Message.CompletedFetch({
    args: bulbasaurArgs,
    generation: loadingBulbasaurQueryModel.generation,
    result: Result.succeed(bulbasaurDetail),
  }),
).model

export const cachedBulbasaurModel = modifyFields(loadedModel, {
  pokemonDetails: () => cachedBulbasaurQueryModel,
})

export const expandedBulbasaurModel = modifyFields(cachedBulbasaurModel, {
  detailAnimations: () => ({
    bulbasaur: Animation.init({
      id: detailAnimationId('bulbasaur'),
      isShowing: true,
    }),
  }),
})
