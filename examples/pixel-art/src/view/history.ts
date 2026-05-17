import clsx from 'clsx'
import { Array, Option } from 'effect'
import { Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { THUMBNAIL_CELL_SIZE, VISIBLE_HISTORY_COUNT } from '../constant'
import {
  ClickedHistoryStep,
  ClickedRedo,
  ClickedRedoStep,
  ClickedUndo,
  type Message,
} from '../message'
import type { Grid } from '../model'
import { type PaletteTheme, resolveColor } from '../palette'

const sectionLabel = (text: string): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2',
      ),
    ],
    [text],
  )
}

export const historyPanelView = (
  undoStack: ReadonlyArray<Grid>,
  redoStack: ReadonlyArray<Grid>,
  grid: Grid,
  gridSize: number,
  theme: PaletteTheme,
): Html => {
  const h = html<Message>()

  const undoCount = undoStack.length
  const redoCount = redoStack.length
  const visibleUndoEntries = Array.takeRight(undoStack, VISIBLE_HISTORY_COUNT)
  const hiddenUndoCount = undoCount - visibleUndoEntries.length

  return h.div(
    [h.Class('w-full md:w-44 flex flex-col flex-shrink-0')],
    [
      sectionLabel('History'),
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          Ui.Button.view({
            onClick: ClickedUndo(),
            isDisabled: undoCount === 0,
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    clsx(
                      'flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none bg-gray-800 w-full',
                      {
                        'text-gray-200 hover:bg-gray-700 cursor-pointer':
                          undoCount > 0,
                        'text-gray-600 opacity-40 cursor-not-allowed':
                          undoCount === 0,
                      },
                    ),
                  ),
                ],
                [
                  h.span([], ['Undo']),
                  h.span([h.Class('text-gray-400')], ['⌘Z']),
                ],
              ),
          }),
          Ui.Button.view({
            onClick: ClickedRedo(),
            isDisabled: redoCount === 0,
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    clsx(
                      'flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none bg-gray-800 w-full',
                      {
                        'text-gray-200 hover:bg-gray-700 cursor-pointer':
                          redoCount > 0,
                        'text-gray-600 opacity-40 cursor-not-allowed':
                          redoCount === 0,
                      },
                    ),
                  ),
                ],
                [
                  h.span([], ['Redo']),
                  h.span([h.Class('text-gray-400')], ['⌘⇧Z']),
                ],
              ),
          }),
        ],
      ),
      h.div(
        [h.Class('flex flex-col gap-1.5 overflow-y-auto max-h-[420px] mt-3')],
        [
          ...Array.map(redoStack, (entryGrid, index) =>
            thumbnailEntry(
              entryGrid,
              gridSize,
              false,
              `Forward ${redoCount - index}`,
              Option.some(ClickedRedoStep({ stepIndex: index })),
              theme,
            ),
          ),
          thumbnailEntry(grid, gridSize, true, 'Current', Option.none(), theme),
          ...Array.map(
            Array.reverse(visibleUndoEntries),
            (entryGrid, index) => {
              const stepIndex = undoCount - 1 - index
              return thumbnailEntry(
                entryGrid,
                gridSize,
                false,
                `Back ${index + 1}`,
                Option.some(ClickedHistoryStep({ stepIndex })),
                theme,
              )
            },
          ),
          ...(hiddenUndoCount > 0
            ? [
                h.div(
                  [h.Class('text-[10px] text-gray-500 text-center py-1')],
                  [`${hiddenUndoCount} more…`],
                ),
              ]
            : []),
        ],
      ),
    ],
  )
}

const thumbnailEntry = (
  grid: Grid,
  gridSize: number,
  isActive: boolean,
  label: string,
  maybeOnClick: Option.Option<Message>,
  theme: PaletteTheme,
): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        clsx('flex items-center gap-2 px-2 py-1.5 rounded', {
          'bg-indigo-600 text-white': isActive,
          'bg-gray-800 cursor-pointer hover:bg-gray-700': !isActive,
        }),
      ),
      ...Array.fromOption(Option.map(maybeOnClick, h.OnClick)),
      ...Array.fromOption(
        Option.map(maybeOnClick, clickMessage =>
          h.OnKeyDownPreventDefault(key =>
            key === 'Enter' || key === ' '
              ? Option.some(clickMessage)
              : Option.none(),
          ),
        ),
      ),
      ...(Option.isSome(maybeOnClick) ? [h.Role('button'), h.Tabindex(0)] : []),
    ],
    [
      h.div(
        [
          h.Class('flex-shrink-0'),
          h.Style({
            display: 'grid',
            'grid-template-columns': `repeat(${gridSize}, ${THUMBNAIL_CELL_SIZE}px)`,
          }),
        ],
        Array.flatMap(grid, row =>
          Array.map(row, cell =>
            h.div(
              [
                h.Style({
                  width: `${THUMBNAIL_CELL_SIZE}px`,
                  height: `${THUMBNAIL_CELL_SIZE}px`,
                  backgroundColor: resolveColor(cell, theme),
                }),
              ],
              [],
            ),
          ),
        ),
      ),
      h.span(
        [
          h.Class(
            clsx('text-[10px] truncate', {
              'text-white': isActive,
              'text-gray-400': !isActive,
            }),
          ),
        ],
        [label],
      ),
    ],
  )
}
