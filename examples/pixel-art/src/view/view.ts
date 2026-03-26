import clsx from 'clsx'
import { Array, Option, pipe } from 'effect'
import { Ui } from 'foldkit'
import { type Html, createLazy, html } from 'foldkit/html'

import { isGridEmpty } from '../grid'
import { ClickedExport, type Message } from '../message'
import type { Model } from '../model'
import { currentPaletteTheme } from '../palette'
import { canvasView } from './canvas'
import { errorDialogView, gridSizeConfirmDialogView } from './dialog'
import { historyPanelView } from './history'
import { toolPanelView } from './toolbar'

const {
  a,
  button,
  div,
  h1,
  path,
  span,
  svg,
  AriaHidden,
  Class,
  Href,
  D,
  Fill,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  ViewBox,
  Xmlns,
} = html<Message>()

const downloadIcon = (className: string): Html =>
  svg(
    [
      AriaHidden(true),
      Class(className),
      Xmlns('http://www.w3.org/2000/svg'),
      Fill('none'),
      ViewBox('0 0 24 24'),
      StrokeWidth('1.5'),
      Stroke('currentColor'),
    ],
    [
      path(
        [
          StrokeLinecap('round'),
          StrokeLinejoin('round'),
          D(
            'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
          ),
        ],
        [],
      ),
    ],
  )

const secondaryButtonStyle =
  'px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none'

const lazyHeader = createLazy()
const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyErrorDialog = createLazy()
const lazyGridSizeConfirmDialog = createLazy()

export const view = (model: Model): Html =>
  div(
    [Class('min-h-screen bg-gray-900 text-gray-100 flex flex-col')],
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
  )

const headerView = (): Html =>
  div(
    [
      Class(
        'flex items-center justify-between px-4 py-3 border-b border-gray-800',
      ),
    ],
    [
      div(
        [Class('flex flex-col')],
        [
          h1(
            [Class('text-lg font-bold tracking-tight leading-none mb-1')],
            ['PixelForge'],
          ),
          div(
            [
              Class(
                'flex items-center gap-1 text-xs text-gray-400 leading-none',
              ),
            ],
            [
              a(
                [
                  Href('https://foldkit.dev'),
                  Class('hover:text-gray-200 transition'),
                ],
                ['Built with Foldkit'],
              ),
              span([], ['/']),
              a(
                [
                  Href(
                    'https://github.com/foldkit/foldkit/tree/main/examples/pixel-art',
                  ),
                  Class('hover:text-gray-200 transition'),
                ],
                ['Source on GitHub'],
              ),
            ],
          ),
        ],
      ),
      div(
        [Class('flex items-center gap-4')],
        [
          Ui.Button.view({
            onClick: ClickedExport(),
            toView: attributes =>
              button(
                [
                  ...attributes.button,
                  Class(
                    clsx(
                      secondaryButtonStyle,
                      'flex items-center gap-2 hover:bg-gray-700 cursor-pointer',
                    ),
                  ),
                ],
                [downloadIcon('w-4 h-4'), span([], ['Export PNG'])],
              ),
          }),
        ],
      ),
    ],
  )

const contentView = (model: Model): Html => {
  const theme = currentPaletteTheme(model)

  return div(
    [
      Class(
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
