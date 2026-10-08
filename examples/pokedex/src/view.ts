import { Array, Option, Record, String, pipe } from 'effect'
import { AsyncData } from 'foldkit'
import type { ChildAttribute, Document, Html, HtmlBuilder } from 'foldkit/html'

import { Animation, Button, HoverIntent } from '@foldkit/ui'

import { detailRetry, pokemonDetail } from './detail'
import { displayName } from './format'
import {
  Message,
  type Model,
  pokemonListQuery,
  pokemonTable,
  rowHoverIntent,
} from './main'
import type { PokemonSummary } from './pokeApi'
import { retryButton } from './retryButton'
import { toolbar } from './toolbar'

type PokemonTable = ReturnType<typeof pokemonTable>

// CONSTANT

const COLUMN_COUNT = 4
const SPRITE_SIZE_PIXELS = 48
const POKEDEX_NUMBER_DIGITS = 3
const LIST_ERROR_MESSAGE = 'Could not reach PokéAPI to load the Pokédex.'
const SPRITE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

// FORMAT

const formatPokedexNumber = (id: number): string =>
  `#${pipe(`${id}`, String.padStart(POKEDEX_NUMBER_DIGITS, '0'))}`

const spriteUrl = (id: number): string => `${SPRITE_URL}/${id}.png`

const detailRowId = (name: string): string => `pokemon-${name}-detail`

const rowHoverIntentSlotId = (name: string): string =>
  `pokemon-${name}-hover-intent`

// SHARED STYLES

const panelClassName =
  'rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-sm'

const secondaryButtonClassName =
  'inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:hover:bg-white'

const headerCellClassName =
  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500'

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const tableAsyncData = AsyncData.map(
    pokemonListQuery.read(model.pokemonList),
    pokemon => pokemonTable(model, pokemon),
  )

  return {
    title: 'Pokédex',
    body: h.div(
      [h.Class('min-h-screen bg-zinc-100 text-zinc-900')],
      [
        h.main(
          [
            h.Class(
              'mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6',
            ),
          ],
          [
            headerView(AsyncData.getData(tableAsyncData), h),
            toolbar(model, h),
            AsyncData.matchData(tableAsyncData, {
              onEmpty: () =>
                h.div([h.Class(panelClassName)], ['Loading Pokémon…']),
              onFailure: () =>
                errorView(
                  LIST_ERROR_MESSAGE,
                  Message.ClickedRetryPokemonList(),
                  h,
                ),
              onData: table => resultsView(model, table, h),
            }),
          ],
        ),
      ],
    ),
  }
}

const headerView = (
  maybeTable: Option.Option<PokemonTable>,
  h: HtmlBuilder<Message>,
): Html =>
  h.header(
    [h.Class('flex flex-col gap-1')],
    [
      h.h1(
        [h.Class('text-3xl font-bold tracking-tight text-zinc-950')],
        ['Pokédex'],
      ),
      h.p(
        [h.Class('text-sm text-zinc-500')],
        ['The first three generations, from Kanto to Hoenn.'],
      ),
      h.p(
        [h.AriaLive('polite'), h.Class('text-sm font-medium text-indigo-700')],
        Option.match(maybeTable, {
          onNone: () => [],
          onSome: table => [`${table.getRowCount()} Pokémon`],
        }),
      ),
    ],
  )

const resultsView = (
  model: Model,
  table: PokemonTable,
  h: HtmlBuilder<Message>,
): Html => {
  if (table.getRowCount() === 0) {
    return noMatchesView(h)
  } else {
    return h.div(
      [h.Class('flex flex-col gap-4')],
      [tableView(model, table, h), pagerView(model, table, h)],
    )
  }
}

const noMatchesView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class(`${panelClassName} flex flex-col items-center gap-3`)],
    [
      h.p([], ['No Pokémon match your filters.']),
      Button.view(
        {
          onClick: Message.ClickedClearFilters(),
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class(secondaryButtonClassName)],
              ['Clear filters'],
            ),
        },
        h,
      ),
    ],
  )

const tableView = (
  model: Model,
  table: PokemonTable,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm',
      ),
    ],
    [
      h.table(
        [h.Class('w-full text-left text-sm')],
        [
          h.thead(
            [h.Class('border-b border-zinc-200 bg-zinc-50')],
            [
              h.tr(
                [],
                [
                  h.th(
                    [h.Scope('col'), h.Class(`${headerCellClassName} w-20`)],
                    ['#'],
                  ),
                  h.th(
                    [h.Scope('col'), h.Class(`${headerCellClassName} w-16`)],
                    [h.span([h.Class('sr-only')], ['Sprite'])],
                  ),
                  h.th(
                    [h.Scope('col'), h.Class(headerCellClassName)],
                    ['Name'],
                  ),
                  h.th(
                    [h.Scope('col'), h.Class(`${headerCellClassName} w-12`)],
                    [h.span([h.Class('sr-only')], ['Details'])],
                  ),
                ],
              ),
            ],
          ),
          h.tbody(
            [h.Class('divide-y divide-zinc-100')],
            Array.flatMap(table.getRowModel().rows, row =>
              pokemonRowsView(model, row.original, h),
            ),
          ),
        ],
      ),
    ],
  )

const pokemonRowsView = (
  model: Model,
  pokemon: PokemonSummary,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const { name } = pokemon
  const maybeDetailAnimation = Record.get(model.detailAnimations, name)

  return [
    h.submodel({
      slotId: rowHoverIntentSlotId(name),
      model: rowHoverIntent(model, name),
      view: HoverIntent.view,
      viewInputs: {
        toView: ({ trigger }) =>
          pokemonRowView(pokemon, maybeDetailAnimation, trigger, h),
      },
      toParentMessage: message =>
        Message.GotRowHoverIntentMessage({ rowId: name, message }),
    }),
    ...Option.match(maybeDetailAnimation, {
      onNone: () => [],
      onSome: detailAnimation => [
        detailRowView(model, name, detailAnimation, h),
      ],
    }),
  ]
}

const pokemonRowView = (
  { id, name }: PokemonSummary,
  maybeDetailAnimation: Option.Option<Animation.Model>,
  hoverIntentTrigger: ReadonlyArray<ChildAttribute>,
  h: HtmlBuilder<Message>,
): Html => {
  const isExpanded = Option.exists(
    maybeDetailAnimation,
    ({ isShowing }) => isShowing,
  )

  return h.keyed('tr')(
    name,
    [
      ...hoverIntentTrigger,
      h.OnClick(Message.ClickedTogglePokemon({ name })),
      h.Class('cursor-pointer transition hover:bg-zinc-50'),
    ],
    [
      h.td(
        [h.Class('px-4 py-2 font-mono text-xs tabular-nums text-zinc-500')],
        [formatPokedexNumber(id)],
      ),
      h.td(
        [h.Class('px-4 py-1')],
        [
          h.img([
            h.Src(spriteUrl(id)),
            h.Alt(''),
            h.Loading('lazy'),
            h.Width(`${SPRITE_SIZE_PIXELS}`),
            h.Height(`${SPRITE_SIZE_PIXELS}`),
            h.Class('size-12 [image-rendering:pixelated]'),
          ]),
        ],
      ),
      h.td(
        [h.Class('px-4 py-2')],
        [
          h.button(
            [
              h.Type('button'),
              h.AriaExpanded(isExpanded),
              ...Option.match(maybeDetailAnimation, {
                onNone: () => [],
                onSome: () => [h.AriaControls(detailRowId(name))],
              }),
              h.Class(
                'cursor-pointer rounded text-sm font-semibold text-zinc-900 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              ),
            ],
            [displayName(name)],
          ),
        ],
      ),
      h.td(
        [h.Class('px-4 py-2 text-right text-zinc-400')],
        [
          h.span(
            [
              h.AriaHidden(true),
              h.Class(
                isExpanded
                  ? 'inline-block rotate-90 transition-transform duration-200'
                  : 'inline-block transition-transform duration-200',
              ),
            ],
            ['›'],
          ),
        ],
      ),
    ],
  )
}

const detailRowView = (
  model: Model,
  name: string,
  detailAnimation: Animation.Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('tr')(
    `${name}-detail`,
    [h.Id(detailRowId(name)), h.Class('bg-zinc-50')],
    [
      h.td(
        [h.Colspan(COLUMN_COUNT), h.Class('p-0')],
        [
          h.submodel({
            slotId: detailAnimation.id,
            model: detailAnimation,
            view: Animation.view,
            viewInputs: {
              animateSize: true,
              className:
                'px-4 py-5 transition-opacity duration-200 ease-out data-[closed]:opacity-0 sm:px-6',
              content: pokemonDetail(model, name, h),
            },
            toParentMessage: message =>
              Message.GotDetailAnimationMessage({ rowId: name, message }),
          }),
          ...(detailAnimation.isShowing ? detailRetry(model, name, h) : []),
        ],
      ),
    ],
  )

const pagerView = (
  model: Model,
  table: PokemonTable,
  h: HtmlBuilder<Message>,
): Html => {
  const { pageIndex } = model.pagination
  const isFirstPage = !table.getCanPreviousPage()
  const isLastPage = !table.getCanNextPage()

  return h.nav(
    [
      h.AriaLabel('Pagination'),
      h.Class('flex items-center justify-between gap-4'),
    ],
    [
      h.p(
        [h.Class('text-sm tabular-nums text-zinc-500')],
        [`Page ${pageIndex + 1} of ${table.getPageCount()}`],
      ),
      h.div(
        [h.Class('flex gap-1')],
        [
          pagerButtonView(
            'First page',
            '«',
            Message.ClickedFirstPage(),
            isFirstPage,
            h,
          ),
          pagerButtonView(
            'Previous page',
            '‹',
            Message.ClickedPreviousPage(),
            isFirstPage,
            h,
          ),
          pagerButtonView(
            'Next page',
            '›',
            Message.ClickedNextPage(),
            isLastPage,
            h,
          ),
          pagerButtonView(
            'Last page',
            '»',
            Message.ClickedLastPage(),
            isLastPage,
            h,
          ),
        ],
      ),
    ],
  )
}

const pagerButtonView = (
  label: string,
  glyph: string,
  message: Message,
  isDisabled: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: message,
      isDisabled,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.AriaLabel(label),
            h.Class(`${secondaryButtonClassName} w-9`),
          ],
          [h.span([h.AriaHidden(true)], [glyph])],
        ),
    },
    h,
  )

const errorView = (
  error: string,
  retryMessage: Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Role('alert'),
      h.Class(
        'flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800',
      ),
    ],
    [h.p([], [error]), retryButton(retryMessage, h)],
  )
