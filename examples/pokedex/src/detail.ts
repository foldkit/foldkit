import { Array, Number, Option, Record, pipe } from 'effect'
import { AsyncData } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Meter } from '@foldkit/ui'

import { displayName } from './format'
import { Message, type Model, pokemonQuery } from './main'
import { PokeApiError, type PokemonDetail, type PokemonStat } from './pokeApi'
import { retryButton } from './retryButton'

// CONSTANT

const ARTWORK_SIZE_PIXELS = 160
const MAX_BASE_STAT = 255
const DECIMETRES_PER_METRE = 10
const HECTOGRAMS_PER_KILOGRAM = 10
const SKELETON_TYPE_COUNT = 2
const SKELETON_FACT_COUNT = 3
const SKELETON_STAT_COUNT = 6

const STAT_LABELS: Record.ReadonlyRecord<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const TYPE_BADGE_CLASS_NAMES: Record.ReadonlyRecord<string, string> = {
  normal: 'bg-neutral-200 text-neutral-800',
  fire: 'bg-orange-100 text-orange-800',
  water: 'bg-blue-100 text-blue-800',
  electric: 'bg-yellow-100 text-yellow-800',
  grass: 'bg-green-100 text-green-800',
  ice: 'bg-cyan-100 text-cyan-800',
  fighting: 'bg-red-100 text-red-800',
  poison: 'bg-purple-100 text-purple-800',
  ground: 'bg-amber-100 text-amber-800',
  flying: 'bg-sky-100 text-sky-800',
  psychic: 'bg-pink-100 text-pink-800',
  bug: 'bg-lime-100 text-lime-800',
  rock: 'bg-stone-200 text-stone-800',
  ghost: 'bg-violet-100 text-violet-800',
  dragon: 'bg-indigo-100 text-indigo-800',
  dark: 'bg-zinc-700 text-zinc-50',
  steel: 'bg-slate-200 text-slate-800',
  fairy: 'bg-rose-100 text-rose-800',
}

const FALLBACK_TYPE_BADGE_CLASS_NAME = 'bg-zinc-100 text-zinc-700'

// FORMAT

const formatHeight = (heightDecimetres: number): string =>
  `${(heightDecimetres / DECIMETRES_PER_METRE).toFixed(1)} m`

const formatWeight = (weightHectograms: number): string =>
  `${(weightHectograms / HECTOGRAMS_PER_KILOGRAM).toFixed(1)} kg`

const statLabel = (statName: string): string =>
  Option.getOrElse(Record.get(STAT_LABELS, statName), () =>
    displayName(statName),
  )

const typeBadgeClassName = (type: string): string =>
  Option.getOrElse(
    Record.get(TYPE_BADGE_CLASS_NAMES, type),
    () => FALLBACK_TYPE_BADGE_CLASS_NAME,
  )

const errorMessage = (error: PokeApiError, name: string): string =>
  PokeApiError.match(error, {
    NotFound: () => `${displayName(name)} was not found in the Pokédex.`,
    Unavailable: () => `Could not reach PokéAPI to load ${displayName(name)}.`,
  })

// SHARED STYLES

const panelLayoutClassName = 'flex flex-col gap-6 sm:flex-row'
const columnsClassName = 'grid flex-1 gap-6 sm:grid-cols-2'
const factsClassName = 'grid grid-cols-2 gap-x-4 gap-y-2 text-sm'
const statRowClassName = 'grid grid-cols-[4.5rem_2rem_1fr] items-center gap-3'
const totalRowClassName = `${statRowClassName} border-t border-zinc-200 pt-2`
const artworkClassName = 'size-40 shrink-0 self-center rounded-xl sm:self-start'
const skeletonBarClassName = 'rounded bg-zinc-200'

// VIEW

export const pokemonDetail = (
  model: Model,
  name: string,
  h: HtmlBuilder<Message>,
): Html =>
  AsyncData.matchData(pokemonQuery.read(model.pokemonDetails, { name }), {
    onEmpty: () => skeleton(name, h),
    onFailure: error =>
      h.p(
        [
          h.Role('alert'),
          h.Class(
            'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800',
          ),
        ],
        [errorMessage(error, name)],
      ),
    onData: detail => panel(detail, h),
  })

export const detailRetry = (
  model: Model,
  name: string,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  AsyncData.matchData(pokemonQuery.read(model.pokemonDetails, { name }), {
    onEmpty: () => [],
    onFailure: error =>
      PokeApiError.match<ReadonlyArray<Html>>(error, {
        NotFound: () => [],
        Unavailable: () => [
          h.div(
            [h.Class('px-4 pb-5 sm:px-6')],
            [retryButton(Message.ClickedRetryPokemon({ name }), h)],
          ),
        ],
      }),
    onData: () => [],
  })

const panel = (detail: PokemonDetail, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class(panelLayoutClassName)],
    [
      Option.match(detail.maybeArtworkUrl, {
        onNone: () => h.empty,
        onSome: artworkUrl =>
          h.img([
            h.Src(artworkUrl),
            h.Alt(displayName(detail.name)),
            h.Loading('lazy'),
            h.Width(`${ARTWORK_SIZE_PIXELS}`),
            h.Height(`${ARTWORK_SIZE_PIXELS}`),
            h.Class(`${artworkClassName} bg-white p-2 shadow-sm`),
          ]),
      }),
      h.div(
        [h.Class(columnsClassName)],
        [
          h.div(
            [h.Class('flex flex-col gap-4')],
            [typeBadges(detail.types, h), facts(detail, h)],
          ),
          baseStats(detail, h),
        ],
      ),
    ],
  )

const typeBadges = (
  types: ReadonlyArray<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.ul(
    [h.AriaLabel('Types'), h.Class('flex flex-wrap gap-2')],
    Array.map(types, type =>
      h.keyed('li')(
        type,
        [
          h.Class(
            `rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadgeClassName(type)}`,
          ),
        ],
        [displayName(type)],
      ),
    ),
  )

const facts = (detail: PokemonDetail, h: HtmlBuilder<Message>): Html =>
  h.dl(
    [h.Class(factsClassName)],
    [
      h.dt([h.Class('text-zinc-500')], ['Height']),
      h.dd(
        [h.Class('font-medium tabular-nums')],
        [formatHeight(detail.heightDecimetres)],
      ),
      h.dt([h.Class('text-zinc-500')], ['Weight']),
      h.dd(
        [h.Class('font-medium tabular-nums')],
        [formatWeight(detail.weightHectograms)],
      ),
      h.dt([h.Class('text-zinc-500')], ['Abilities']),
      h.dd(
        [h.Class('font-medium')],
        [pipe(detail.abilities, Array.map(displayName), Array.join(', '))],
      ),
    ],
  )

const baseStats = (detail: PokemonDetail, h: HtmlBuilder<Message>): Html => {
  const total = Number.sumAll(
    Array.map(detail.stats, ({ baseStat }) => baseStat),
  )

  return h.div(
    [h.Class('flex flex-col gap-2')],
    [
      h.ul(
        [h.AriaLabel('Base stats'), h.Class('flex flex-col gap-2')],
        Array.map(detail.stats, stat =>
          h.keyed('li')(stat.name, [], [statMeter(detail.name, stat, h)]),
        ),
      ),
      h.p(
        [h.Class(totalRowClassName)],
        [
          h.span([h.Class('text-xs font-medium text-zinc-700')], ['Total']),
          h.span(
            [h.Class('text-right text-xs font-semibold tabular-nums')],
            [`${total}`],
          ),
        ],
      ),
    ],
  )
}

const statMeter = (
  pokemonName: string,
  { name, baseStat }: PokemonStat,
  h: HtmlBuilder<Message>,
): Html =>
  Meter.view(
    {
      id: `${pokemonName}-${name}`,
      value: baseStat,
      max: MAX_BASE_STAT,
      toView: ({ meter, label, fill }) =>
        h.div(
          [h.Class(statRowClassName)],
          [
            h.span(
              [...label, h.Class('text-xs text-zinc-500')],
              [statLabel(name)],
            ),
            h.span(
              [h.Class('text-right text-xs font-semibold tabular-nums')],
              [`${baseStat}`],
            ),
            h.div(
              [
                ...meter,
                h.Class('h-2 overflow-hidden rounded-full bg-zinc-200'),
              ],
              [h.div([...fill, h.Class('h-full rounded-full bg-indigo-500')])],
            ),
          ],
        ),
    },
    h,
  )

const skeleton = (name: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.AriaBusy(true), h.Class(`${panelLayoutClassName} animate-pulse`)],
    [
      h.span([h.Class('sr-only')], [`Loading ${displayName(name)}…`]),
      h.div([h.AriaHidden(true), h.Class(`${artworkClassName} bg-zinc-200`)]),
      h.div(
        [h.AriaHidden(true), h.Class(columnsClassName)],
        [
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              h.div(
                [h.Class('flex gap-2')],
                Array.makeBy(SKELETON_TYPE_COUNT, () =>
                  h.div([h.Class('h-5 w-14 rounded-full bg-zinc-200')]),
                ),
              ),
              h.div(
                [h.Class(factsClassName)],
                Array.flatten(
                  Array.makeBy(SKELETON_FACT_COUNT, () => [
                    h.div([h.Class(`${skeletonBarClassName} h-5 w-16`)]),
                    h.div([h.Class(`${skeletonBarClassName} h-5 w-24`)]),
                  ]),
                ),
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-col gap-2')],
            [
              ...Array.makeBy(SKELETON_STAT_COUNT, () =>
                skeletonStatRow(statRowClassName, h),
              ),
              skeletonStatRow(totalRowClassName, h),
            ],
          ),
        ],
      ),
    ],
  )

const skeletonStatRow = (className: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class(`${className} h-4 box-content`)],
    [
      h.div([h.Class(`${skeletonBarClassName} h-3 w-12`)]),
      h.div([h.Class(`${skeletonBarClassName} h-3 w-6 justify-self-end`)]),
      h.div([h.Class('h-2 rounded-full bg-zinc-200')]),
    ],
  )
