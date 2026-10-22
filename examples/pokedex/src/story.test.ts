import { Option, Record, Result } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, test } from 'vitest'

import { Animation, HoverIntent, RadioGroup } from '@foldkit/ui'

import {
  FocusSearchInput,
  Message,
  type Model,
  PushUrl,
  ReplaceUrl,
  init,
  pokemonQuery,
  update,
} from './main'
import {
  bulbasaurDetail,
  cachedBulbasaurModel,
  expandedBulbasaurModel,
  flags,
  loadedModel,
  urlOrThrow,
} from './main.fixture'
import { Region } from './region'

const FIRST_REQUEST_GENERATION = 1
const FIRST_TRANSITION_GENERATION = 1
const SECOND_TRANSITION_GENERATION = 2
const FIRST_HOVER_INTENT_VERSION = 1

const resolveWaitForPaint = Command.resolve(
  Animation.WaitForPaint,
  Animation.Message.CompletedWaitForPaint({
    generation: FIRST_TRANSITION_GENERATION,
  }),
)

const resolveWaitForAnimationSettled = Command.resolve(
  Animation.WaitForAnimationSettled,
  Animation.Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
)

const resolveBulbasaurFetch = Command.resolve(
  pokemonQuery.Fetch,
  pokemonQuery.Message.CompletedFetch({
    args: { name: 'bulbasaur' },
    generation: FIRST_REQUEST_GENERATION,
    result: Result.succeed(bulbasaurDetail),
  }),
)

const resolvePushUrl = (url: string) =>
  Command.resolve(PushUrl({ url }), Message.CompletedPushUrl())

const resolveReplaceUrl = (url: string) =>
  Command.resolve(ReplaceUrl({ url }), Message.CompletedReplaceUrl())

const changedUrl = (url: string) =>
  Message.ChangedUrl({ url: urlOrThrow(`http://localhost${url}`) })

const isBulbasaurDetailShowing = ({ detailAnimations }: Model) =>
  Option.exists(
    Record.get(detailAnimations, 'bulbasaur'),
    ({ isShowing }) => isShowing,
  )

const secondPageModel = modifyFields(loadedModel, {
  pagination: modifyFields({ pageIndex: () => 1 }),
})

const selectedRegion = (region: Region) =>
  Message.GotRegionRadioGroupMessage({
    message: RadioGroup.Message.SelectedOption({
      index: Region.literals.indexOf(region),
      value: region,
    }),
  })

const resolveFocusOption = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.Message.CompletedFocusOption(),
)

const hoveredBulbasaurRow = (message: HoverIntent.Message) =>
  Message.GotRowHoverIntentMessage({ rowId: 'bulbasaur', message })

const resolveHoverIntentOpen = Command.resolve(
  HoverIntent.WaitBeforeOpening,
  HoverIntent.Message.CompletedWaitBeforeOpening({
    version: FIRST_HOVER_INTENT_VERSION,
  }),
)

const bulbasaurAsyncDataTag = (
  pokemonDetails: typeof loadedModel.pokemonDetails,
) => pokemonQuery.read(pokemonDetails, { name: 'bulbasaur' })._tag

test('searching returns to the first page and replaces the URL', () => {
  story(
    update,
    given(secondPageModel),
    message(Message.UpdatedSearch({ value: 'char' })),
    model(model => {
      expect(model.search).toBe('char')
      expect(model.pagination.pageIndex).toBe(0)
    }),
    resolveReplaceUrl('/?q=char'),
  )
})

test('pressing the search shortcut focuses the search input', () => {
  story(
    update,
    given(loadedModel),
    message(Message.PressedSearchShortcut()),
    Command.expectExact(FocusSearchInput),
    Command.resolve(FocusSearchInput, Message.CompletedFocusSearchInput()),
  )
})

test('choosing a region returns to the first page and pushes the URL', () => {
  story(
    update,
    given(secondPageModel),
    message(selectedRegion('Johto')),
    resolveFocusOption,
    model(model => {
      expect(model.region).toBe('Johto')
      expect(model.pagination.pageIndex).toBe(0)
    }),
    resolvePushUrl('/?region=Johto'),
  )
})

test('page navigation stops at the last page of the filtered rows', () => {
  story(
    update,
    given(loadedModel),
    message(Message.ClickedLastPage()),
    resolvePushUrl('/?page=2'),
    message(Message.ClickedNextPage()),
    model(model => {
      expect(model.pagination.pageIndex).toBe(1)
    }),
    message(Message.UpdatedSearch({ value: 'saur' })),
    resolveReplaceUrl('/?q=saur'),
    message(Message.ClickedNextPage()),
    message(Message.ClickedLastPage()),
    model(model => {
      expect(model.pagination.pageIndex).toBe(0)
    }),
  )
})

test('clearing filters resets the search, region, and page', () => {
  story(
    update,
    given(
      modifyFields(secondPageModel, {
        search: () => 'zzz',
        region: () => 'Kanto',
      }),
    ),
    message(Message.ClickedClearFilters()),
    model(model => {
      expect(model.search).toBe('')
      expect(model.region).toBe('All')
      expect(model.pagination.pageIndex).toBe(0)
    }),
    resolvePushUrl('/'),
  )
})

test('expanding an uncached Pokémon fetches its details and animates them in', () => {
  story(
    update,
    given(loadedModel),
    message(Message.ClickedTogglePokemon({ name: 'bulbasaur' })),
    model(model => {
      expect(isBulbasaurDetailShowing(model)).toBe(true)
      expect(bulbasaurAsyncDataTag(model.pokemonDetails)).toBe('Loading')
    }),
    Command.expectExact(
      pokemonQuery.Fetch,
      Animation.WaitForPaint,
      ReplaceUrl({ url: '/?expanded=bulbasaur' }),
    ),
    resolveBulbasaurFetch,
    resolveWaitForPaint,
    resolveWaitForAnimationSettled,
    resolveReplaceUrl('/?expanded=bulbasaur'),
    model(model => {
      expect(bulbasaurAsyncDataTag(model.pokemonDetails)).toBe('Success')
      expect(
        Option.map(
          Record.get(model.detailAnimations, 'bulbasaur'),
          ({ transitionState }) => transitionState,
        ),
      ).toEqual(Option.some('Idle'))
    }),
  )
})

test('expanding a cached Pokémon reuses its details without fetching', () => {
  story(
    update,
    given(cachedBulbasaurModel),
    message(Message.ClickedTogglePokemon({ name: 'bulbasaur' })),
    Command.expectExact(
      Animation.WaitForPaint,
      ReplaceUrl({ url: '/?expanded=bulbasaur' }),
    ),
    model(model => {
      expect(isBulbasaurDetailShowing(model)).toBe(true)
      expect(bulbasaurAsyncDataTag(model.pokemonDetails)).toBe('Success')
    }),
    resolveWaitForPaint,
    resolveWaitForAnimationSettled,
    resolveReplaceUrl('/?expanded=bulbasaur'),
  )
})

test('collapsing a Pokémon keeps its detail row until the leave animation ends', () => {
  story(
    update,
    given(expandedBulbasaurModel),
    message(Message.ClickedTogglePokemon({ name: 'bulbasaur' })),
    model(model => {
      expect(isBulbasaurDetailShowing(model)).toBe(false)
      expect(Record.has(model.detailAnimations, 'bulbasaur')).toBe(true)
    }),
    resolveReplaceUrl('/'),
    resolveWaitForPaint,
    Command.expectExact(Animation.WaitForAnimationSettled),
    model(model => {
      expect(Record.has(model.detailAnimations, 'bulbasaur')).toBe(true)
    }),
    resolveWaitForAnimationSettled,
    model(model => {
      expect(Record.has(model.detailAnimations, 'bulbasaur')).toBe(false)
    }),
  )
})

test('resting the pointer on a row prefetches its details', () => {
  story(
    update,
    given(loadedModel),
    message(hoveredBulbasaurRow(HoverIntent.Message.EnteredTrigger())),
    Command.expectExact(HoverIntent.WaitBeforeOpening),
    resolveHoverIntentOpen,
    Command.expectExact(pokemonQuery.Fetch),
    model(model => {
      expect(bulbasaurAsyncDataTag(model.pokemonDetails)).toBe('Loading')
    }),
    resolveBulbasaurFetch,
  )
})

test('resting the pointer on a cached row does not fetch again', () => {
  story(
    update,
    given(cachedBulbasaurModel),
    message(hoveredBulbasaurRow(HoverIntent.Message.EnteredTrigger())),
    resolveHoverIntentOpen,
    Command.expectNone(),
  )
})

test('a URL change restores the filters and expanded rows', () => {
  story(
    update,
    given(loadedModel),
    message(changedUrl('/?q=saur&region=Kanto&expanded=bulbasaur')),
    model(model => {
      expect(model.search).toBe('saur')
      expect(model.region).toBe('Kanto')
      expect(isBulbasaurDetailShowing(model)).toBe(true)
    }),
    Command.expectExact(pokemonQuery.Fetch, Animation.WaitForPaint),
    resolveBulbasaurFetch,
    resolveWaitForPaint,
    resolveWaitForAnimationSettled,
    message(changedUrl('/')),
    model(model => {
      expect(model.search).toBe('')
      expect(model.region).toBe('All')
      expect(isBulbasaurDetailShowing(model)).toBe(false)
    }),
    Command.resolve(
      Animation.WaitForPaint,
      Animation.Message.CompletedWaitForPaint({
        generation: SECOND_TRANSITION_GENERATION,
      }),
    ),
    Command.resolve(
      Animation.WaitForAnimationSettled,
      Animation.Message.EndedAnimation({
        generation: SECOND_TRANSITION_GENERATION,
      }),
    ),
    model(model => {
      expect(Record.has(model.detailAnimations, 'bulbasaur')).toBe(false)
    }),
  )
})

test('a URL past the last page lands on the last page', () => {
  story(
    update,
    given(loadedModel),
    message(changedUrl('/?page=9')),
    model(model => {
      expect(model.pagination.pageIndex).toBe(1)
    }),
    resolveReplaceUrl('/?page=2'),
  )
})

test('booting from a shared link restores the state and loads expanded details', () => {
  const init_ = init(
    flags,
    urlOrThrow('http://localhost/?q=saur&page=2&expanded=bulbasaur'),
  )

  expect(init_.model.search).toBe('saur')
  expect(init_.model.pagination.pageIndex).toBe(1)
  expect(isBulbasaurDetailShowing(init_.model)).toBe(true)
  expect(bulbasaurAsyncDataTag(init_.model.pokemonDetails)).toBe('Loading')
})
