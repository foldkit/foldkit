import {
  Array,
  Effect,
  Function,
  Match,
  Number,
  Option,
  Record,
  Schema,
  pipe,
} from 'effect'
import { AsyncData, Command, Dom, Runtime, Subscription, Update } from 'foldkit'
import { Query } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Animation, HoverIntent, RadioGroup } from '@foldkit/ui'

import {
  PokeApi,
  PokeApiError,
  PokemonDetail,
  PokemonListError,
  PokemonSummary,
} from './pokeApi'
import { Region } from './region'
import { type PokedexFields, pokedexRouter, urlToPokedexFields } from './route'
import { tableFor } from './table'

// QUERY

export const pokemonListQuery = Query.define({
  name: 'PokemonList',
  data: Schema.Array(PokemonSummary),
  error: PokemonListError,
  execute: Effect.gen(function* () {
    const pokeApi = yield* PokeApi
    return yield* pokeApi.fetchPokemonList
  }),
})

export const pokemonQuery = Query.define({
  name: 'Pokemon',
  args: { name: Schema.String },
  data: PokemonDetail,
  error: PokeApiError,
  execute: ({ name }) =>
    Effect.gen(function* () {
      const pokeApi = yield* PokeApi
      return yield* pokeApi.fetchPokemon(name)
    }),
})

// FLAGS

export const ShortcutPlatform = Schema.Literals(['Apple', 'Other'])
export type ShortcutPlatform = typeof ShortcutPlatform.Type

export const Flags = Schema.Struct({ shortcutPlatform: ShortcutPlatform })
export type Flags = typeof Flags.Type

// MODEL

const PAGE_SIZE = 20
const REGION_RADIO_GROUP_ID = 'region'

export const SEARCH_INPUT_ID = 'pokemon-search'
export const SEARCH_SHORTCUT_KEYS = ['Control+K', 'Meta+K']

export const detailAnimationId = (name: string): string =>
  `pokemon-${name}-detail-animation`

export const RegionRadioGroup = RadioGroup.create<Region>()

const PageSize = Schema.Literal(PAGE_SIZE)

const Pagination = Schema.Struct({
  pageIndex: Schema.Number,
  pageSize: PageSize,
})
type Pagination = typeof Pagination.Type

export const Model = Schema.Struct({
  pokemonList: pokemonListQuery.Model,
  pokemonDetails: pokemonQuery.Model,
  search: Schema.String,
  region: Region,
  regionRadioGroup: RadioGroup.Model,
  pagination: Pagination,
  detailAnimations: Schema.Record(Schema.String, Animation.Model),
  rowHoverIntents: Schema.Record(Schema.String, HoverIntent.Model),
  shortcutPlatform: ShortcutPlatform,
})
export type Model = typeof Model.Type

export const rowHoverIntent = (model: Model, name: string): HoverIntent.Model =>
  Option.getOrElse(Record.get(model.rowHoverIntents, name), () =>
    HoverIntent.init(),
  )

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedSearch: { value: Schema.String },
  PressedSearchShortcut: {},
  CompletedFocusSearchInput: {},
  GotRegionRadioGroupMessage: { message: RadioGroup.Message },
  ClickedClearFilters: {},
  ClickedFirstPage: {},
  ClickedPreviousPage: {},
  ClickedNextPage: {},
  ClickedLastPage: {},
  ClickedTogglePokemon: { name: Schema.String },
  GotDetailAnimationMessage: {
    rowId: Schema.String,
    message: Animation.Message,
  },
  GotRowHoverIntentMessage: {
    rowId: Schema.String,
    message: HoverIntent.Message,
  },
  ClickedRetryPokemonList: {},
  ClickedRetryPokemon: { name: Schema.String },
  GotPokemonListMessage: { message: pokemonListQuery.Message },
  GotPokemonMessage: { message: pokemonQuery.Message },
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedPushUrl: {},
  CompletedReplaceUrl: {},
  CompletedLoadExternalUrl: {},
})
export type Message = typeof Message.Type

// COMMAND

export const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  execute: Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearchInput()),
  ),
})

export const PushUrl = Command.define('PushUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedPushUrl],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedPushUrl())),
})

export const ReplaceUrl = Command.define('ReplaceUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceUrl],
  execute: ({ url }) =>
    replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceUrl())),
})

const LoadExternalUrl = Command.define('LoadExternalUrl', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternalUrl],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternalUrl())),
})

// TABLE

export const pokemonTable = (
  model: Model,
  pokemon: ReadonlyArray<PokemonSummary>,
) =>
  tableFor({
    pokemon,
    search: model.search,
    region: model.region,
    pagination: model.pagination,
  })

// URL

const HistoryMode = Schema.Literals(['Push', 'Replace'])
type HistoryMode = typeof HistoryMode.Type

const expandedNames = (model: Model): ReadonlyArray<string> =>
  pipe(
    model.detailAnimations,
    Record.filter(({ isShowing }) => isShowing),
    Record.keys,
  )

const pokedexUrl = (model: Model): string =>
  pokedexRouter({
    search: model.search,
    region: model.region,
    pageIndex: model.pagination.pageIndex,
    expandedNames: expandedNames(model),
  })

const navigateTo = (
  historyMode: HistoryMode,
  url: string,
): Command.Command<Message> =>
  Match.value(historyMode).pipe(
    Match.withReturnType<Command.Command<Message>>(),
    Match.when('Push', () => PushUrl({ url })),
    Match.when('Replace', () => ReplaceUrl({ url })),
    Match.exhaustive,
  )

const syncUrl = (
  previousModel: Model,
  historyMode: HistoryMode,
  model: Model,
): Update.Return<Model, Message> => {
  const url = pokedexUrl(model)

  if (url === pokedexUrl(previousModel)) {
    return { model }
  } else {
    return { model, commands: [navigateTo(historyMode, url)] }
  }
}

// UPDATE

type UpdateReturn = Update.Return<Model, Message, PokeApi>

const pokemonList = pokemonListQuery.lift<Model, Message>({
  parentField: 'pokemonList',
  toParentMessage: message => Message.GotPokemonListMessage({ message }),
})

const pokemonDetails = pokemonQuery.lift<Model, Message>({
  parentField: 'pokemonDetails',
  toParentMessage: message => Message.GotPokemonMessage({ message }),
})

const resetPageIndex = (pagination: Pagination): Pagination =>
  modifyFields(pagination, { pageIndex: () => 0 })

const foldRegionRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Update.Step<Model, Message>,
  RadioGroup.OutMessage<Region>
>({
  Selected:
    ({ value }) =>
    model =>
      syncUrl(
        model,
        'Push',
        modifyFields(model, {
          region: () => value,
          pagination: resetPageIndex,
        }),
      ),
})

const foldRegionRadioGroup = Update.foldChild({
  update: RegionRadioGroup.update,
  read: (model: Model) => Option.some(model.regionRadioGroup),
  write: (model, nextRegionRadioGroup) =>
    modifyFields(model, { regionRadioGroup: () => nextRegionRadioGroup }),
  toParentMessage: message => Message.GotRegionRadioGroupMessage({ message }),
  foldOutMessage: foldRegionRadioGroupOutMessage,
})

const withClampedPageIndex = (
  model: Model,
  pokemon: ReadonlyArray<PokemonSummary>,
  toPageIndex: (pageIndex: number, lastPageIndex: number) => number,
): Model => {
  const lastPageIndex = Number.max(
    Number.decrement(pokemonTable(model, pokemon).getPageCount()),
    0,
  )
  const nextPageIndex = Number.clamp(
    toPageIndex(model.pagination.pageIndex, lastPageIndex),
    { minimum: 0, maximum: lastPageIndex },
  )

  return modifyFields(model, {
    pagination: modifyFields({ pageIndex: () => nextPageIndex }),
  })
}

const navigateToPage = (
  model: Model,
  toPageIndex: (pageIndex: number, lastPageIndex: number) => number,
): UpdateReturn => {
  const pokemon = AsyncData.getOrElse(
    pokemonListQuery.read(model.pokemonList),
    Array.empty,
  )

  return syncUrl(
    model,
    'Push',
    withClampedPageIndex(model, pokemon, toPageIndex),
  )
}

const clampPageIndex: Update.Step<Model, Message> = model =>
  pipe(
    pokemonListQuery.read(model.pokemonList),
    AsyncData.getData,
    Option.filter(() => model.pagination.pageIndex > 0),
    Option.match({
      onNone: () => ({ model }),
      onSome: pokemon =>
        syncUrl(
          model,
          'Replace',
          withClampedPageIndex(model, pokemon, Function.identity),
        ),
    }),
  )

const readDetailAnimation = (model: Model, name: string) =>
  Record.get(model.detailAnimations, name)

const writeDetailAnimation = (
  model: Model,
  name: string,
  nextDetailAnimation: Animation.Model,
): Model =>
  modifyFields(model, {
    detailAnimations: Record.set(name, nextDetailAnimation),
  })

const toDetailAnimationMessage = (
  name: string,
  message: Animation.Message,
): Message => Message.GotDetailAnimationMessage({ rowId: name, message })

const foldDetailAnimationOutMessage = (
  name: string,
  { liftCommand }: Update.FoldContext<Animation.Message, Message>,
) =>
  Animation.OutMessage.match<Update.Step<Model, Message>>({
    StartedLeaveAnimating:
      ({ generation }) =>
      model => ({
        model,
        commands: [
          liftCommand(
            Animation.WaitForAnimationSettled({
              id: detailAnimationId(name),
              generation,
            }),
          ),
        ],
      }),
    TransitionedOut: () => model => ({
      model: modifyFields(model, { detailAnimations: Record.remove(name) }),
    }),
  })

const foldDetailAnimation = Update.foldChildAt({
  update: Animation.update,
  readAt: readDetailAnimation,
  writeAt: writeDetailAnimation,
  toParentMessage: toDetailAnimationMessage,
  foldOutMessage: foldDetailAnimationOutMessage,
})

const foldDetailAnimationToggle = (name: string) =>
  Update.foldChildStep({
    update: Animation.toggle,
    read: (model: Model) => readDetailAnimation(model, name),
    write: (model, nextDetailAnimation) =>
      writeDetailAnimation(model, name, nextDetailAnimation),
    toParentMessage: message => toDetailAnimationMessage(name, message),
  })

const togglePokemon = (model: Model, name: string): UpdateReturn => {
  if (Record.has(model.detailAnimations, name)) {
    return foldDetailAnimationToggle(name)(model)
  } else {
    return Update.combine(
      writeDetailAnimation(
        model,
        name,
        Animation.init({ id: detailAnimationId(name) }),
      ),
      [
        foldDetailAnimationToggle(name),
        stepModel => pokemonDetails.loadIfMissing(stepModel, { name }),
      ],
    )
  }
}

const foldRowHoverIntentOutMessage = (name: string) =>
  HoverIntent.OutMessage.match<Update.Step<Model, Message, PokeApi>>({
    Opened: () => model => pokemonDetails.loadIfMissing(model, { name }),
    Closed: () => model => ({ model }),
  })

const foldRowHoverIntent = Update.foldChildAt({
  update: HoverIntent.update,
  readAt: (model: Model, name: string) =>
    Option.some(rowHoverIntent(model, name)),
  writeAt: (model, name, nextRowHoverIntent) =>
    modifyFields(model, {
      rowHoverIntents: Record.set(name, nextRowHoverIntent),
    }),
  toParentMessage: (name, message) =>
    Message.GotRowHoverIntentMessage({ rowId: name, message }),
  foldOutMessage: foldRowHoverIntentOutMessage,
})

const applyPokedexFields = (
  model: Model,
  {
    search,
    region,
    pageIndex,
    expandedNames: nextExpandedNames,
  }: PokedexFields,
): UpdateReturn => {
  const currentExpandedNames = expandedNames(model)
  const toggledNames = Array.union(
    Array.difference(nextExpandedNames, currentExpandedNames),
    Array.difference(currentExpandedNames, nextExpandedNames),
  )

  return Update.combine(
    modifyFields(model, {
      search: () => search,
      region: () => region,
      pagination: modifyFields({ pageIndex: () => pageIndex }),
    }),
    [
      ...Array.map(
        toggledNames,
        name => (stepModel: Model) => togglePokemon(stepModel, name),
      ),
      clampPageIndex,
    ],
  )
}

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedSearch: ({ value }) =>
      syncUrl(
        model,
        'Replace',
        modifyFields(model, {
          search: () => value,
          pagination: resetPageIndex,
        }),
      ),
    PressedSearchShortcut: () => ({
      model,
      commands: [FocusSearchInput()],
    }),
    CompletedFocusSearchInput: () => ({ model }),
    GotRegionRadioGroupMessage: ({ message }) =>
      foldRegionRadioGroup(model, message),
    ClickedClearFilters: () =>
      syncUrl(
        model,
        'Push',
        modifyFields(model, {
          search: () => '',
          region: () => 'All',
          pagination: resetPageIndex,
        }),
      ),
    ClickedFirstPage: () => navigateToPage(model, () => 0),
    ClickedPreviousPage: () => navigateToPage(model, Number.decrement),
    ClickedNextPage: () => navigateToPage(model, Number.increment),
    ClickedLastPage: () =>
      navigateToPage(model, (_pageIndex, lastPageIndex) => lastPageIndex),
    ClickedTogglePokemon: ({ name }) =>
      Update.combine(model, [
        stepModel => togglePokemon(stepModel, name),
        stepModel => syncUrl(model, 'Replace', stepModel),
      ]),
    GotDetailAnimationMessage: ({ rowId, message }) =>
      foldDetailAnimation(model, rowId, message),
    GotRowHoverIntentMessage: ({ rowId, message }) =>
      foldRowHoverIntent(model, rowId, message),
    ClickedRetryPokemonList: () => pokemonList.revalidateOrLoad(model),
    ClickedRetryPokemon: ({ name }) =>
      pokemonDetails.revalidateOrLoad(model, { name }),
    GotPokemonListMessage: ({ message }) =>
      Update.combine(model, [
        stepModel => pokemonList.fold(stepModel, message),
        clampPageIndex,
      ]),
    GotPokemonMessage: ({ message }) => pokemonDetails.fold(model, message),
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [PushUrl({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternalUrl({ href })],
        }),
      }),
    ChangedUrl: ({ url }) => applyPokedexFields(model, urlToPokedexFields(url)),
    CompletedPushUrl: () => ({ model }),
    CompletedReplaceUrl: () => ({ model }),
    CompletedLoadExternalUrl: () => ({ model }),
  })

// INIT

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  Flags,
  PokeApi
> = ({ shortcutPlatform }, url) => {
  const { search, region, pageIndex, expandedNames } = urlToPokedexFields(url)

  return Update.combine(
    Model.make({
      pokemonList: pokemonListQuery.init(),
      pokemonDetails: pokemonQuery.init(),
      search,
      region,
      regionRadioGroup: RadioGroup.init({ id: REGION_RADIO_GROUP_ID }),
      pagination: { pageIndex, pageSize: PAGE_SIZE },
      detailAnimations: Record.fromEntries(
        Array.map(expandedNames, name => [
          name,
          Animation.init({ id: detailAnimationId(name), isShowing: true }),
        ]),
      ),
      rowHoverIntents: Record.empty(),
      shortcutPlatform,
    }),
    [
      stepModel => pokemonList.revalidateOrLoad(stepModel),
      ...Array.map(
        expandedNames,
        name => (stepModel: Model) =>
          pokemonDetails.loadIfMissing(stepModel, { name }),
      ),
    ],
  )
}

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  searchShortcut: Subscription.persistentEntry(
    Dom.streamFromKeyBindings<Message>({
      bindings: Array.map(SEARCH_SHORTCUT_KEYS, keys => ({
        keys,
        whileTyping: 'Suppress',
        preventDefault: true,
        mapEvent: () => Message.PressedSearchShortcut(),
      })),
    }),
  ),
}))
