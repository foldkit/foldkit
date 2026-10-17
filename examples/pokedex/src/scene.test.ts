import { Result } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { test } from 'vitest'

import { Animation, RadioGroup } from '@foldkit/ui'

import { Message, PushUrl, ReplaceUrl, pokemonQuery, update } from './main'
import { bulbasaurDetail, failedListModel, loadedModel } from './main.fixture'
import { PokeApiError } from './pokeApi'
import { view } from './view'

const FIRST_REQUEST_GENERATION = 1
const SECOND_REQUEST_GENERATION = 2
const FIRST_TRANSITION_GENERATION = 1

const resolveDetailEnter = Command.resolveAll(
  [
    Animation.WaitForPaint,
    Animation.Message.CompletedWaitForPaint({
      generation: FIRST_TRANSITION_GENERATION,
    }),
  ],
  [
    Animation.WaitForAnimationSettled,
    Animation.Message.EndedAnimation({
      generation: FIRST_TRANSITION_GENERATION,
    }),
  ],
)

const resolveFocusOption = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.Message.CompletedFocusOption(),
)

const resolvePushUrl = Command.resolve(PushUrl, Message.CompletedPushUrl())

const resolveReplaceUrl = Command.resolve(
  ReplaceUrl,
  Message.CompletedReplaceUrl(),
)

const resolveBulbasaurFetch = Command.resolve(
  pokemonQuery.Fetch,
  pokemonQuery.Message.CompletedFetch({
    args: { name: 'bulbasaur' },
    generation: FIRST_REQUEST_GENERATION,
    result: Result.succeed(bulbasaurDetail),
  }),
)

const failBulbasaurFetch = (error: PokeApiError) =>
  Command.resolve(
    pokemonQuery.Fetch,
    pokemonQuery.Message.CompletedFetch({
      args: { name: 'bulbasaur' },
      generation: FIRST_REQUEST_GENERATION,
      result: Result.fail(error),
    }),
  )

test('a loaded list renders the result count and the first page', () => {
  scene(
    { update, view },
    given(loadedModel),
    expect(text('31 Pokémon')).toExist(),
    expect(text('Page 1 of 2')).toExist(),
    expect(role('button', { name: 'Bulbasaur' })).toExist(),
    expect(role('button', { name: 'Sceptile' })).toBeAbsent(),
  )
})

test('typing a search narrows the rows', () => {
  scene(
    { update, view },
    given(loadedModel),
    type(role('searchbox', { name: 'Search Pokémon' }), 'saur'),
    resolveReplaceUrl,
    expect(text('3 Pokémon')).toExist(),
    expect(role('button', { name: 'Ivysaur' })).toExist(),
    expect(role('button', { name: 'Pikachu' })).toBeAbsent(),
  )
})

test('typing a Pokédex number finds that Pokémon', () => {
  scene(
    { update, view },
    given(loadedModel),
    type(role('searchbox', { name: 'Search Pokémon' }), '#025'),
    resolveReplaceUrl,
    expect(text('1 Pokémon')).toExist(),
    expect(role('button', { name: 'Pikachu' })).toExist(),
  )
})

test('choosing a region narrows the rows', () => {
  scene(
    { update, view },
    given(loadedModel),
    click(role('radio', { name: 'Hoenn' })),
    resolveFocusOption,
    resolvePushUrl,
    expect(text('3 Pokémon')).toExist(),
    expect(role('button', { name: 'Treecko' })).toExist(),
    expect(role('button', { name: 'Bulbasaur' })).toBeAbsent(),
  )
})

test('clearing filters from the empty state restores every row', () => {
  scene(
    { update, view },
    given(loadedModel),
    type(role('searchbox', { name: 'Search Pokémon' }), 'zzz'),
    resolveReplaceUrl,
    expect(text('No Pokémon match your filters.')).toExist(),
    click(role('button', { name: 'Clear filters' })),
    resolvePushUrl,
    expect(text('31 Pokémon')).toExist(),
    expect(role('searchbox', { name: 'Search Pokémon' })).toHaveValue(''),
  )
})

test('expanding a row shows a skeleton, then the details and base stats', () => {
  scene(
    { update, view },
    given(loadedModel),
    expect(role('button', { name: 'Bulbasaur' })).not.toHaveAttr(
      'aria-controls',
    ),
    click(role('button', { name: 'Bulbasaur' })),
    expect(role('button', { name: 'Bulbasaur' })).toHaveAttr(
      'aria-expanded',
      'true',
    ),
    expect(role('button', { name: 'Bulbasaur' })).toHaveAttr(
      'aria-controls',
      'pokemon-bulbasaur-detail',
    ),
    expect(text('Loading Bulbasaur…')).toExist(),
    resolveDetailEnter,
    resolveReplaceUrl,
    resolveBulbasaurFetch,
    expect(text('Loading Bulbasaur…')).toBeAbsent(),
    expect(role('meter', { name: 'Attack' })).toHaveAttr('aria-valuenow', '49'),
    expect(role('meter', { name: 'Sp. Atk' })).toExist(),
    expect(text('318')).toExist(),
    expect(text('0.7 m')).toExist(),
    expect(text('6.9 kg')).toExist(),
    expect(text('Overgrow, Chlorophyll')).toExist(),
  )
})

test('clicking anywhere on a row expands it', () => {
  scene(
    { update, view },
    given(loadedModel),
    click(text('#001')),
    expect(role('button', { name: 'Bulbasaur' })).toHaveAttr(
      'aria-expanded',
      'true',
    ),
    resolveDetailEnter,
    resolveReplaceUrl,
    resolveBulbasaurFetch,
    expect(text('Overgrow, Chlorophyll')).toExist(),
  )
})

test('an unreachable PokéAPI can be retried from the expanded row', () => {
  scene(
    { update, view },
    given(loadedModel),
    click(role('button', { name: 'Bulbasaur' })),
    resolveDetailEnter,
    resolveReplaceUrl,
    failBulbasaurFetch(PokeApiError.Unavailable()),
    expect(text('Could not reach PokéAPI to load Bulbasaur.')).toExist(),
    click(role('button', { name: 'Retry' })),
    Command.resolve(
      pokemonQuery.Fetch,
      pokemonQuery.Message.CompletedFetch({
        args: { name: 'bulbasaur' },
        generation: SECOND_REQUEST_GENERATION,
        result: Result.succeed(bulbasaurDetail),
      }),
    ),
    expect(role('meter', { name: 'Attack' })).toHaveAttr('aria-valuenow', '49'),
  )
})

test('a Pokémon missing from PokéAPI shows a not-found message without Retry', () => {
  scene(
    { update, view },
    given(loadedModel),
    click(role('button', { name: 'Bulbasaur' })),
    resolveDetailEnter,
    resolveReplaceUrl,
    failBulbasaurFetch(PokeApiError.NotFound()),
    expect(text('Bulbasaur was not found in the Pokédex.')).toExist(),
    expect(role('button', { name: 'Retry' })).toBeAbsent(),
  )
})

test('a failed list fetch shows the error with a Retry button', () => {
  scene(
    { update, view },
    given(failedListModel),
    expect(text('Could not reach PokéAPI to load the Pokédex.')).toExist(),
    expect(role('button', { name: 'Retry' })).toExist(),
    expect(role('table')).toBeAbsent(),
  )
})
