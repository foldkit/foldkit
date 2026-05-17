import clsx from 'clsx'
import { Array, Option, pipe } from 'effect'
import { Ui } from 'foldkit'
import { type Document, type Html, createLazy, html } from 'foldkit/html'

import { isGridEmpty } from '../grid'
import { ClickedExport, type Message } from '../message'
import type { Model } from '../model'
import { currentPaletteTheme } from '../palette'
import { canvasView } from './canvas'
import { errorDialogView, gridSizeConfirmDialogView } from './dialog'
import { historyPanelView } from './history'
import { toolPanelView } from './toolbar'

const downloadIcon = (className: string): Html => {
  const h = html<Message>()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('1.5'),
      h.Stroke('currentColor'),
    ],
    [
      h.path(
        [
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
          h.D(
            'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
          ),
        ],
        [],
      ),
    ],
  )
}

const secondaryButtonStyle =
  'px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none'

const lazyHeader = createLazy()
const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyErrorDialog = createLazy()
const lazyGridSizeConfirmDialog = createLazy()

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'Pixel Art',
    body: h.div(
      [h.Class('min-h-screen bg-gray-900 text-gray-100 flex flex-col')],
      [
        lazyHeader(headerView, []),
        contentView(model),
        lazyErrorDialog(errorDialogView, [
          model.errorDialog,
          model.maybeExportError,
        ]),
        lazyGridSizeConfirmDialog(gridSizeConfirmDialogView, [
          model.gridSizeConfirmDialog,
          model.maybePendingGridSize,
        ]),
      ],
    ),
  }
}

const headerView = (): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'flex items-center justify-between px-4 py-3 border-b border-gray-800',
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col')],
        [
          h.h1(
            [h.Class('text-lg font-bold tracking-tight leading-none mb-1')],
            ['PixelForge'],
          ),
          h.div(
            [
              h.Class(
                'flex items-center gap-1 text-xs text-gray-400 leading-none',
              ),
            ],
            [
              h.a(
                [
                  h.Href('https://foldkit.dev'),
                  h.Class('hover:text-gray-200 transition'),
                ],
                ['Built with Foldkit'],
              ),
              h.span([], ['/']),
              h.a(
                [
                  h.Href(
                    'https://github.com/foldkit/foldkit/tree/main/examples/pixel-art',
                  ),
                  h.Class('hover:text-gray-200 transition'),
                ],
                ['Source on GitHub'],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-4')],
        [
          Ui.Button.view({
            onClick: ClickedExport(),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    clsx(
                      secondaryButtonStyle,
                      'flex items-center gap-2 hover:bg-gray-700 cursor-pointer',
                    ),
                  ),
                ],
                [downloadIcon('w-4 h-4'), h.span([], ['Export PNG'])],
              ),
          }),
        ],
      ),
    ],
  )
}

const contentView = (model: Model): Html => {
  const h = html<Message>()

  const theme = currentPaletteTheme(model)

  return h.div(
    [
      h.Class(
        'flex-1 grid gap-6 p-4 md:p-6 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-[auto_1fr_auto] md:justify-center md:items-start max-w-5xl mx-auto w-full',
      ),
    ],
    [
      lazyToolPanel(toolPanelView, [
        model.mirrorMode,
        model.selectedColorIndex,
        isGridEmpty(model.grid),
        model.toolRadioGroup,
        model.gridSizeRadioGroup,
        model.paletteRadioGroup,
        model.mirrorHorizontalSwitch,
        model.mirrorVerticalSwitch,
        theme,
        model.themeListbox,
      ]),
      canvasView(model, theme),
      lazyHistoryPanel(historyPanelView, [
        model.undoStack,
        model.redoStack,
        model.isDrawing
          ? pipe(
              Array.last(model.undoStack),
              Option.getOrElse(() => model.grid),
            )
          : model.grid,
        model.gridSize,
        theme,
      ]),
    ],
  )
}
