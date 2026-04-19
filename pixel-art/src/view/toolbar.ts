import clsx from 'clsx'
import { Array } from 'effect'
import { Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { EMPTY_COLOR, GRID_SIZE_STRINGS } from '../constant'
import {
  ClickedClear,
  GotGridSizeRadioGroupMessage,
  GotMirrorHorizontalSwitchMessage,
  GotMirrorVerticalSwitchMessage,
  GotPaletteRadioGroupMessage,
  GotThemeListboxMessage,
  GotToolRadioGroupMessage,
  type Message,
  SelectedColor,
  SelectedGridSize,
  SelectedPaletteTheme,
  SelectedTool,
} from '../message'
import type { MirrorMode, PaletteIndex, Tool } from '../model'
import { PALETTE_THEMES, type PaletteTheme } from '../palette'

const {
  button,
  div,
  path,
  span,
  svg,
  AriaHidden,
  Class,
  D,
  Fill,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  Style,
  ViewBox,
  Xmlns,
} = html<Message>()

const TOOLS: ReadonlyArray<Tool> = ['Brush', 'Fill', 'Eraser']

const TOOL_SHORTCUTS: Record<Tool, string> = {
  Brush: 'B',
  Fill: 'F',
  Eraser: 'E',
}

export const THEME_INDEX_STRINGS = Array.makeBy(PALETTE_THEMES.length, String)

export const THEME_LISTBOX_ANCHOR: Ui.Listbox.AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const sectionLabel = (text: string): Html =>
  div(
    [
      Class(
        'text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2',
      ),
    ],
    [text],
  )

const trashIcon = (className: string): Html =>
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
            'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
          ),
        ],
        [],
      ),
    ],
  )

const chevronDownIcon = (className: string): Html =>
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
          D('M19.5 8.25l-7.5 7.5-7.5-7.5'),
        ],
        [],
      ),
    ],
  )

export const toolPanelView = (
  mirrorMode: MirrorMode,
  selectedColorIndex: PaletteIndex,
  isCanvasEmpty: boolean,
  toolRadioGroup: typeof Ui.RadioGroup.Model.Type,
  gridSizeRadioGroup: typeof Ui.RadioGroup.Model.Type,
  paletteRadioGroup: typeof Ui.RadioGroup.Model.Type,
  mirrorHorizontalSwitch: typeof Ui.Switch.Model.Type,
  mirrorVerticalSwitch: typeof Ui.Switch.Model.Type,
  theme: PaletteTheme,
  themeListbox: typeof Ui.Listbox.Model.Type,
): Html =>
  div(
    [Class('w-full md:w-44 flex flex-col gap-5 flex-shrink-0')],
    [
      toolSectionView(toolRadioGroup),
      mirrorSectionView(
        mirrorMode,
        mirrorHorizontalSwitch,
        mirrorVerticalSwitch,
      ),
      sizeSectionView(gridSizeRadioGroup),
      paletteSectionView(
        selectedColorIndex,
        paletteRadioGroup,
        theme,
        themeListbox,
      ),
      clearCanvasView(isCanvasEmpty),
    ],
  )

const toolSectionView = (
  toolRadioGroup: typeof Ui.RadioGroup.Model.Type,
): Html =>
  div(
    [],
    [
      sectionLabel('Tools'),
      Ui.RadioGroup.view<Message, Tool>({
        model: toolRadioGroup,
        toParentMessage: message => GotToolRadioGroupMessage({ message }),
        onSelected: tool => SelectedTool({ tool }),
        options: TOOLS,
        ariaLabel: 'Drawing tool',
        optionToConfig: (tool, { isSelected }) => ({
          value: tool,
          content: attributes =>
            button(
              [
                ...attributes.option,
                Class(
                  clsx(
                    'flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none w-full cursor-pointer',
                    {
                      'bg-indigo-600 text-white': isSelected,
                      'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200':
                        !isSelected,
                    },
                  ),
                ),
              ],
              [
                span([], [tool]),
                span([Class('text-xs text-gray-400')], [TOOL_SHORTCUTS[tool]]),
              ],
            ),
        }),
        attributes: [Class('flex flex-col gap-1.5')],
      }),
    ],
  )

const mirrorSectionView = (
  mirrorMode: MirrorMode,
  mirrorHorizontalSwitch: typeof Ui.Switch.Model.Type,
  mirrorVerticalSwitch: typeof Ui.Switch.Model.Type,
): Html => {
  const isMirrorHorizontal =
    mirrorMode === 'Horizontal' || mirrorMode === 'Both'
  const isMirrorVertical = mirrorMode === 'Vertical' || mirrorMode === 'Both'

  return div(
    [],
    [
      sectionLabel('Mirror'),
      div(
        [Class('flex gap-2')],
        [
          Ui.Switch.view({
            model: mirrorHorizontalSwitch,
            toParentMessage: message =>
              GotMirrorHorizontalSwitchMessage({ message }),
            toView: attributes =>
              div(
                [Class('flex-1')],
                [
                  span(
                    [...attributes.label, Class('sr-only')],
                    ['Mirror horizontal'],
                  ),
                  button(
                    [
                      ...attributes.button,
                      Class(
                        clsx(
                          'w-full px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer',
                          {
                            'bg-indigo-600 text-white': isMirrorHorizontal,
                            'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200':
                              !isMirrorHorizontal,
                          },
                        ),
                      ),
                    ],
                    ['H'],
                  ),
                ],
              ),
          }),
          Ui.Switch.view({
            model: mirrorVerticalSwitch,
            toParentMessage: message =>
              GotMirrorVerticalSwitchMessage({ message }),
            toView: attributes =>
              div(
                [Class('flex-1')],
                [
                  span(
                    [...attributes.label, Class('sr-only')],
                    ['Mirror vertical'],
                  ),
                  button(
                    [
                      ...attributes.button,
                      Class(
                        clsx(
                          'w-full px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer',
                          {
                            'bg-indigo-600 text-white': isMirrorVertical,
                            'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200':
                              !isMirrorVertical,
                          },
                        ),
                      ),
                    ],
                    ['V'],
                  ),
                ],
              ),
          }),
        ],
      ),
    ],
  )
}

const sizeSectionView = (
  gridSizeRadioGroup: typeof Ui.RadioGroup.Model.Type,
): Html =>
  div(
    [],
    [
      sectionLabel('Grid Size'),
      Ui.RadioGroup.view<Message, string>({
        model: gridSizeRadioGroup,
        toParentMessage: message => GotGridSizeRadioGroupMessage({ message }),
        onSelected: sizeString =>
          SelectedGridSize({ size: Number(sizeString) }),
        options: GRID_SIZE_STRINGS,
        ariaLabel: 'Grid size',
        orientation: 'Horizontal',
        optionToConfig: (sizeString, { isSelected }) => ({
          value: sizeString,
          content: attributes =>
            button(
              [
                ...attributes.option,
                Class(
                  clsx(
                    'flex-1 px-2 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer',
                    {
                      'bg-indigo-600 text-white': isSelected,
                      'bg-gray-800 text-gray-400 hover:text-gray-200':
                        !isSelected,
                    },
                  ),
                ),
              ],
              [sizeString],
            ),
        }),
        attributes: [Class('flex gap-1')],
      }),
    ],
  )

const paletteSectionView = (
  selectedColorIndex: PaletteIndex,
  paletteRadioGroup: typeof Ui.RadioGroup.Model.Type,
  theme: PaletteTheme,
  themeListbox: typeof Ui.Listbox.Model.Type,
): Html => {
  const paletteIndexStrings = theme.colors.map((_, index) => index.toString())
  const selectedHexColor = theme.colors[selectedColorIndex] ?? EMPTY_COLOR

  return div(
    [],
    [
      sectionLabel('Color'),
      div([Class('text-xs text-gray-400 font-mono pb-3')], [selectedHexColor]),
      Ui.RadioGroup.view<Message, string>({
        model: paletteRadioGroup,
        toParentMessage: message => GotPaletteRadioGroupMessage({ message }),
        onSelected: indexString =>
          SelectedColor({ colorIndex: Number(indexString) as PaletteIndex }),
        options: paletteIndexStrings,
        ariaLabel: 'Color palette',
        orientation: 'Horizontal',
        optionToConfig: (indexString, { isSelected }) => {
          const hexColor = theme.colors[Number(indexString)] ?? EMPTY_COLOR
          return {
            value: indexString,
            content: attributes =>
              button(
                [
                  ...attributes.option,
                  Class(
                    clsx(
                      'aspect-square rounded-sm transition motion-reduce:transition-none cursor-pointer',
                      {
                        'ring-2 ring-white ring-offset-2 ring-offset-gray-900':
                          isSelected,
                        'hover:scale-105 motion-reduce:hover:scale-100':
                          !isSelected,
                      },
                    ),
                  ),
                  Style({ backgroundColor: hexColor }),
                ],
                [span([...attributes.label, Class('sr-only')], [hexColor])],
              ),
          }
        },
        attributes: [Class('grid grid-cols-4 gap-2.5')],
      }),
      themeListboxView(themeListbox, theme),
    ],
  )
}

const themeListboxView = (
  themeListbox: typeof Ui.Listbox.Model.Type,
  theme: PaletteTheme,
): Html =>
  Ui.Listbox.view<Message, string>({
    model: themeListbox,
    toParentMessage: message => GotThemeListboxMessage({ message }),
    onSelectedItem: value =>
      SelectedPaletteTheme({ themeIndex: Number(value) }),
    anchor: THEME_LISTBOX_ANCHOR,
    items: THEME_INDEX_STRINGS,
    itemToConfig: (indexString, { isSelected }) => {
      const themeName = PALETTE_THEMES[Number(indexString)]?.name ?? indexString
      return {
        className: clsx(
          'px-3 py-2 text-sm cursor-pointer transition motion-reduce:transition-none',
          isSelected
            ? 'bg-indigo-600 text-white'
            : 'text-gray-300 hover:bg-gray-700',
        ),
        content: div(
          [Class('flex items-center justify-between')],
          [
            span([], [themeName]),
            ...(isSelected ? [span([Class('text-xs')], ['\u2713'])] : []),
          ],
        ),
      }
    },
    buttonContent: div(
      [Class('flex items-center justify-between w-full')],
      [span([], [theme.name]), chevronDownIcon('w-4 h-4 text-gray-400')],
    ),
    buttonAttributes: [
      Class(
        'w-full px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition motion-reduce:transition-none',
      ),
    ],
    itemsAttributes: [
      Class(
        'w-[var(--button-width)] rounded-lg border border-gray-700 bg-gray-800 shadow-lg overflow-hidden z-10 outline-none',
      ),
    ],
    backdropAttributes: [Class('fixed inset-0 z-0')],
    attributes: [Class('relative w-full mt-3')],
  })

const clearCanvasView = (isCanvasEmpty: boolean): Html =>
  Ui.Button.view({
    onClick: ClickedClear(),
    isDisabled: isCanvasEmpty,
    toView: attributes =>
      button(
        [
          ...attributes.button,
          Class(
            clsx(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none',
              {
                'hover:bg-gray-700 cursor-pointer': !isCanvasEmpty,
                'opacity-40 cursor-not-allowed': isCanvasEmpty,
              },
            ),
          ),
        ],
        [trashIcon('w-4 h-4'), span([], ['Clear Canvas'])],
      ),
  })
