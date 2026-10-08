import { Array, Match, Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Input } from '@foldkit/ui'

import {
  Message,
  type Model,
  RegionRadioGroup,
  SEARCH_INPUT_ID,
  SEARCH_SHORTCUT_KEYS,
  type ShortcutPlatform,
} from './main'
import { Region } from './region'

// FORMAT

const shortcutHint = (shortcutPlatform: ShortcutPlatform): string =>
  Match.value(shortcutPlatform).pipe(
    Match.when('Apple', () => '⌘ K'),
    Match.when('Other', () => 'Ctrl K'),
    Match.exhaustive,
  )

// VIEW

export const toolbar = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class(
        'flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between',
      ),
    ],
    [searchInput(model, h), regionRadioGroup(model, h)],
  )

const searchInput = (model: Model, h: HtmlBuilder<Message>): Html =>
  Input.view(
    {
      id: SEARCH_INPUT_ID,
      type: 'search',
      value: model.search,
      placeholder: 'Pikachu or #25',
      onInput: value => Message.UpdatedSearch({ value }),
      toView: attributes =>
        h.div(
          [h.Class('flex flex-col gap-1.5 sm:w-72')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('text-xs font-medium text-zinc-500'),
              ],
              ['Search Pokémon'],
            ),
            h.div(
              [h.Class('relative')],
              [
                h.input([
                  ...attributes.input,
                  h.AriaKeyshortcuts(Array.join(SEARCH_SHORTCUT_KEYS, ' ')),
                  h.Class(
                    'w-full rounded-md border border-zinc-300 bg-white py-2 pl-3 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:pr-16 [&::-webkit-search-cancel-button]:hidden',
                  ),
                ]),
                h.kbd(
                  [
                    h.AriaHidden(true),
                    h.Class(
                      'pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-zinc-50 px-1.5 font-mono text-xs text-zinc-400 sm:block',
                    ),
                  ],
                  [shortcutHint(model.shortcutPlatform)],
                ),
              ],
            ),
          ],
        ),
    },
    h,
  )

const regionRadioGroup = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.span([h.Class('text-xs font-medium text-zinc-500')], ['Region']),
      h.submodel({
        slotId: model.regionRadioGroup.id,
        model: model.regionRadioGroup,
        view: RegionRadioGroup.view,
        viewInputs: {
          options: Region.literals,
          selectedValue: Option.some(model.region),
          ariaLabel: 'Region',
          orientation: 'Horizontal',
          toView: ({ group, options }) =>
            h.div(
              [
                ...group,
                h.Class(
                  'grid grid-cols-4 rounded-md border border-zinc-200 bg-zinc-100 p-1',
                ),
              ],
              Array.map(options, option =>
                h.div(
                  [
                    ...option.option,
                    h.Key(option.value),
                    h.Class(
                      'flex min-h-8 cursor-pointer items-center justify-center rounded px-3 text-xs font-medium text-zinc-600 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 data-[checked]:bg-white data-[checked]:text-indigo-700 data-[checked]:shadow-sm',
                    ),
                  ],
                  [h.span([...option.label], [option.value])],
                ),
              ),
            ),
        },
        toParentMessage: message =>
          Message.GotRegionRadioGroupMessage({ message }),
      }),
    ],
  )
