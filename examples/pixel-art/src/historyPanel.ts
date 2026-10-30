import clsx from 'clsx'
import { Array, Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

import type { Grid } from './domain/grid'
import { type PaletteTheme, resolveColor } from './domain/palette'

const VISIBLE_HISTORY_COUNT = 6
const THUMBNAIL_CELL_SIZE = 2

const Message = defineMessageUnion({
  ClickedUndo: {},
  ClickedRedo: {},
  ClickedHistoryStep: { stepIndex: Schema.Number },
  ClickedRedoStep: { stepIndex: Schema.Number },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  ClickedUndo: {},
  ClickedRedo: {},
  ClickedHistoryStep: { stepIndex: Schema.Number },
  ClickedRedoStep: { stepIndex: Schema.Number },
})

type ViewInput = Readonly<{
  undoStack: ReadonlyArray<Grid>
  redoStack: ReadonlyArray<Grid>
  grid: Grid
  gridSize: number
  theme: PaletteTheme
}>

export class HistoryPanel extends Block<HistoryPanel, void, ViewInput>()(
  'HistoryPanel',
  { Message, OutMessage },
) {}

type HistoryPanelViewBuilder = HtmlBuilder<Message>

const sectionLabel = (text: string, h: HistoryPanelViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2',
      ),
    ],
    [text],
  )

const historyButtonView = (
  label: string,
  shortcut: string,
  stackCount: number,
  onClick: Message,
  h: HistoryPanelViewBuilder,
): Html =>
  Button.view(
    {
      onClick,
      isDisabled: stackCount === 0,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(
              clsx(
                'flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none bg-gray-800 w-full',
                {
                  'text-gray-200 hover:bg-gray-700 cursor-pointer':
                    stackCount > 0,
                  'text-gray-600 opacity-40 cursor-not-allowed':
                    stackCount === 0,
                },
              ),
            ),
          ],
          [h.span([], [label]), h.span([h.Class('text-gray-400')], [shortcut])],
        ),
    },
    h,
  )

const thumbnailEntry = (
  grid: Grid,
  gridSize: number,
  isActive: boolean,
  label: string,
  maybeOnClick: Option.Option<Message>,
  theme: PaletteTheme,
  h: HistoryPanelViewBuilder,
): Html =>
  h.div(
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
            h.div([
              h.Style({
                width: `${THUMBNAIL_CELL_SIZE}px`,
                height: `${THUMBNAIL_CELL_SIZE}px`,
                backgroundColor: resolveColor(cell, theme),
              }),
            ]),
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

const view = (
  { undoStack, redoStack, grid, gridSize, theme }: ViewInput,
  h: HistoryPanelViewBuilder,
): Html => {
  const undoCount = undoStack.length
  const redoCount = redoStack.length
  const visibleUndoEntries = Array.takeRight(undoStack, VISIBLE_HISTORY_COUNT)
  const hiddenUndoCount = undoCount - visibleUndoEntries.length

  return h.div(
    [h.Class('w-full md:w-44 flex flex-col flex-shrink-0')],
    [
      sectionLabel('History', h),
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          historyButtonView('Undo', '⌘Z', undoCount, Message.ClickedUndo(), h),
          historyButtonView('Redo', '⌘⇧Z', redoCount, Message.ClickedRedo(), h),
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
              Option.some(Message.ClickedRedoStep({ stepIndex: index })),
              theme,
              h,
            ),
          ),
          thumbnailEntry(
            grid,
            gridSize,
            true,
            'Current',
            Option.none(),
            theme,
            h,
          ),
          ...Array.map(
            Array.reverse(visibleUndoEntries),
            (entryGrid, index) => {
              const stepIndex = undoCount - 1 - index
              return thumbnailEntry(
                entryGrid,
                gridSize,
                false,
                `Back ${index + 1}`,
                Option.some(Message.ClickedHistoryStep({ stepIndex })),
                theme,
                h,
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

export const HistoryPanelLive = HistoryPanel.make(
  Effect.fn(function* () {
    return {
      update: {
        ClickedUndo: model => ({
          model,
          outMessage: OutMessage.ClickedUndo(),
        }),
        ClickedRedo: model => ({
          model,
          outMessage: OutMessage.ClickedRedo(),
        }),
        ClickedHistoryStep: (model, { stepIndex }) => ({
          model,
          outMessage: OutMessage.ClickedHistoryStep({ stepIndex }),
        }),
        ClickedRedoStep: (model, { stepIndex }) => ({
          model,
          outMessage: OutMessage.ClickedRedoStep({ stepIndex }),
        }),
      },

      view: (_model, h, input) => view(input, h),
    }
  }),
)
