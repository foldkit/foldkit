import clsx from 'clsx'
import { Array } from 'effect'
import { Ui } from 'foldkit'
import { type Html, childAttributes, html } from 'foldkit/html'

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
} from '../message'
import type { MirrorMode, PaletteIndex, Tool } from '../model'
import { PALETTE_THEMES, type PaletteTheme } from '../palette'

const TOOLS: ReadonlyArray<Tool> = ['Brush', 'Fill', 'Eraser']

export const ToolRadioGroup = Ui.RadioGroup.create<Tool>()
export const GridSizeRadioGroup = Ui.RadioGroup.create<string>()
export const PaletteRadioGroup = Ui.RadioGroup.create<string>()
export const ThemeListbox = Ui.Listbox.create<string>()

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

const trashIcon = (className: string): Html => {
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
            'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
          ),
        ],
        [],
      ),
    ],
  )
}

const chevronDownIcon = (className: string): Html => {
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
          h.D('M19.5 8.25l-7.5 7.5-7.5-7.5'),
        ],
        [],
      ),
    ],
  )
}

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
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('w-full md:w-44 flex flex-col gap-5 flex-shrink-0')],
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
}

const toolSectionView = (
  toolRadioGroup: typeof Ui.RadioGroup.Model.Type,
): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      sectionLabel('Tools'),
      h.submodel({
        slotId: toolRadioGroup.id,
        model: toolRadioGroup,
        view: ToolRadioGroup.view,
        viewInputs: {
          options: TOOLS,
          ariaLabel: 'Drawing tool',
          toView: ({ group, options }) =>
            h.div(
              [...group, h.Class('flex flex-col gap-1.5')],
              options.map(option => {
                const tool = option.value
                return h.button(
                  [
                    ...option.option,
                    h.Class(
                      clsx(
                        'flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none w-full cursor-pointer',
                        {
                          'bg-indigo-600 text-white': option.isSelected,
                          'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200':
                            !option.isSelected,
                        },
                      ),
                    ),
                  ],
                  [
                    h.span([], [tool]),
                    h.span(
                      [h.Class('text-xs text-gray-400')],
                      [TOOL_SHORTCUTS[tool]],
                    ),
                  ],
                )
              }),
            ),
        },
        toParentMessage: message => GotToolRadioGroupMessage({ message }),
      }),
    ],
  )
}

const mirrorSectionView = (
  mirrorMode: MirrorMode,
  mirrorHorizontalSwitch: typeof Ui.Switch.Model.Type,
  mirrorVerticalSwitch: typeof Ui.Switch.Model.Type,
): Html => {
  const h = html<Message>()

  const isMirrorHorizontal =
    mirrorMode === 'Horizontal' || mirrorMode === 'Both'
  const isMirrorVertical = mirrorMode === 'Vertical' || mirrorMode === 'Both'

  return h.div(
    [],
    [
      sectionLabel('Mirror'),
      h.div(
        [h.Class('flex gap-2')],
        [
          h.submodel({
            slotId: mirrorHorizontalSwitch.id,
            model: mirrorHorizontalSwitch,
            view: Ui.Switch.view,
            viewInputs: {
              toView: attributes =>
                h.div(
                  [h.Class('flex-1')],
                  [
                    h.span(
                      [...attributes.label, h.Class('sr-only')],
                      ['Mirror horizontal'],
                    ),
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
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
            },
            toParentMessage: message =>
              GotMirrorHorizontalSwitchMessage({ message }),
          }),
          h.submodel({
            slotId: mirrorVerticalSwitch.id,
            model: mirrorVerticalSwitch,
            view: Ui.Switch.view,
            viewInputs: {
              toView: attributes =>
                h.div(
                  [h.Class('flex-1')],
                  [
                    h.span(
                      [...attributes.label, h.Class('sr-only')],
                      ['Mirror vertical'],
                    ),
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
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
            },
            toParentMessage: message =>
              GotMirrorVerticalSwitchMessage({ message }),
          }),
        ],
      ),
    ],
  )
}

const sizeSectionView = (
  gridSizeRadioGroup: typeof Ui.RadioGroup.Model.Type,
): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      sectionLabel('Grid Size'),
      h.submodel({
        slotId: gridSizeRadioGroup.id,
        model: gridSizeRadioGroup,
        view: GridSizeRadioGroup.view,
        viewInputs: {
          options: GRID_SIZE_STRINGS,
          ariaLabel: 'Grid size',
          orientation: 'Horizontal',
          toView: ({ group, options }) =>
            h.div(
              [...group, h.Class('flex gap-1')],
              options.map(option =>
                h.button(
                  [
                    ...option.option,
                    h.Class(
                      clsx(
                        'flex-1 px-2 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer',
                        {
                          'bg-indigo-600 text-white': option.isSelected,
                          'bg-gray-800 text-gray-400 hover:text-gray-200':
                            !option.isSelected,
                        },
                      ),
                    ),
                  ],
                  [option.value],
                ),
              ),
            ),
        },
        toParentMessage: message => GotGridSizeRadioGroupMessage({ message }),
      }),
    ],
  )
}

const paletteSectionView = (
  selectedColorIndex: PaletteIndex,
  paletteRadioGroup: typeof Ui.RadioGroup.Model.Type,
  theme: PaletteTheme,
  themeListbox: typeof Ui.Listbox.Model.Type,
): Html => {
  const h = html<Message>()

  const paletteIndexStrings = theme.colors.map((_, index) => index.toString())
  const selectedHexColor = theme.colors[selectedColorIndex] ?? EMPTY_COLOR

  return h.div(
    [],
    [
      sectionLabel('Color'),
      h.div(
        [h.Class('text-xs text-gray-400 font-mono pb-3')],
        [selectedHexColor],
      ),
      h.submodel({
        slotId: paletteRadioGroup.id,
        model: paletteRadioGroup,
        view: PaletteRadioGroup.view,
        viewInputs: {
          options: paletteIndexStrings,
          ariaLabel: 'Color palette',
          orientation: 'Horizontal',
          toView: ({ group, options }) =>
            h.div(
              [...group, h.Class('grid grid-cols-4 gap-2.5')],
              options.map(option => {
                const hexColor =
                  theme.colors[Number(option.value)] ?? EMPTY_COLOR
                return h.button(
                  [
                    ...option.option,
                    h.Class(
                      clsx(
                        'aspect-square rounded-sm transition motion-reduce:transition-none cursor-pointer',
                        {
                          'ring-2 ring-white ring-offset-2 ring-offset-gray-900':
                            option.isSelected,
                          'hover:scale-105 motion-reduce:hover:scale-100':
                            !option.isSelected,
                        },
                      ),
                    ),
                    h.Style({ backgroundColor: hexColor }),
                  ],
                  [h.span([...option.label, h.Class('sr-only')], [hexColor])],
                )
              }),
            ),
        },
        toParentMessage: message => GotPaletteRadioGroupMessage({ message }),
      }),
      themeListboxView(themeListbox, theme),
    ],
  )
}

const themeListboxView = (
  themeListbox: typeof Ui.Listbox.Model.Type,
  theme: PaletteTheme,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: themeListbox.id,
    model: themeListbox,
    view: ThemeListbox.view,
    viewInputs: {
      anchor: THEME_LISTBOX_ANCHOR,
      items: THEME_INDEX_STRINGS,
      itemToConfig: (indexString, { isSelected }) => {
        const themeName =
          PALETTE_THEMES[Number(indexString)]?.name ?? indexString
        return {
          className: clsx(
            'px-3 py-2 text-sm cursor-pointer transition motion-reduce:transition-none',
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'text-gray-300 hover:bg-gray-700',
          ),
          content: h.div(
            [h.Class('flex items-center justify-between')],
            [
              h.span([], [themeName]),
              ...(isSelected ? [h.span([h.Class('text-xs')], ['✓'])] : []),
            ],
          ),
        }
      },
      buttonContent: h.div(
        [h.Class('flex items-center justify-between w-full')],
        [h.span([], [theme.name]), chevronDownIcon('w-4 h-4 text-gray-400')],
      ),
      buttonAttributes: childAttributes([
        h.Class(
          'w-full px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition motion-reduce:transition-none',
        ),
      ]),
      itemsAttributes: childAttributes([
        h.Class(
          'w-[var(--button-width)] rounded-lg border border-gray-700 bg-gray-800 shadow-lg overflow-hidden z-10 outline-none',
        ),
      ]),
      backdropAttributes: childAttributes([h.Class('fixed inset-0 z-0')]),
      attributes: childAttributes([h.Class('relative w-full mt-3')]),
    },
    toParentMessage: message => GotThemeListboxMessage({ message }),
  })
}

const clearCanvasView = (isCanvasEmpty: boolean): Html => {
  const h = html<Message>()

  return Ui.Button.view({
    onClick: ClickedClear(),
    isDisabled: isCanvasEmpty,
    toView: attributes =>
      h.button(
        [
          ...attributes.button,
          h.Class(
            clsx(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none',
              {
                'hover:bg-gray-700 cursor-pointer': !isCanvasEmpty,
                'opacity-40 cursor-not-allowed': isCanvasEmpty,
              },
            ),
          ),
        ],
        [trashIcon('w-4 h-4'), h.span([], ['Clear Canvas'])],
      ),
  })
}
