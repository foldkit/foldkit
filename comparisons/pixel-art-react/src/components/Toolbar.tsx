import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Radio,
  RadioGroup,
  Switch,
} from '@headlessui/react'
import { memo, useCallback } from 'react'

import { EMPTY_COLOR, GRID_SIZES } from '../constants'
import { isGridEmpty } from '../grid'
import { PALETTE_THEMES, type PaletteTheme } from '../palette'
import type { Action } from '../reducer'
import type { Grid, MirrorMode, PaletteIndex, Tool } from '../types'

type ToolbarProps = Readonly<{
  tool: Tool
  mirrorMode: MirrorMode
  selectedColorIndex: PaletteIndex
  gridSize: number
  grid: Grid
  paletteThemeIndex: number
  theme: PaletteTheme
  dispatch: React.Dispatch<Action>
}>

const TOOLS: ReadonlyArray<Tool> = ['Brush', 'Fill', 'Eraser']

const TOOL_SHORTCUTS: Record<Tool, string> = {
  Brush: 'B',
  Fill: 'F',
  Eraser: 'E',
}

const SectionLabel = ({ text }: Readonly<{ text: string }>) => (
  <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
    {text}
  </div>
)

const ToolSection = memo(function ToolSection({
  tool,
  dispatch,
}: Readonly<{ tool: Tool; dispatch: React.Dispatch<Action> }>) {
  const handleChange = useCallback(
    (value: Tool) => dispatch({ type: 'SelectedTool', tool: value }),
    [dispatch],
  )

  return (
    <div>
      <SectionLabel text="Tools" />
      <RadioGroup
        value={tool}
        onChange={handleChange}
        aria-label="Drawing tool"
        className="flex flex-col gap-1.5"
      >
        {TOOLS.map(toolOption => (
          <Radio key={toolOption} value={toolOption}>
            {({ checked }) => (
              <button
                className={`flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none w-full cursor-pointer ${
                  checked
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <span>{toolOption}</span>
                <span className="text-xs text-gray-400">
                  {TOOL_SHORTCUTS[toolOption]}
                </span>
              </button>
            )}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  )
})

const MirrorSection = memo(function MirrorSection({
  mirrorMode,
  dispatch,
}: Readonly<{ mirrorMode: MirrorMode; dispatch: React.Dispatch<Action> }>) {
  const isMirrorHorizontal =
    mirrorMode === 'Horizontal' || mirrorMode === 'Both'
  const isMirrorVertical = mirrorMode === 'Vertical' || mirrorMode === 'Both'

  const handleHorizontalChange = useCallback(
    () => dispatch({ type: 'ToggledMirrorHorizontal' }),
    [dispatch],
  )
  const handleVerticalChange = useCallback(
    () => dispatch({ type: 'ToggledMirrorVertical' }),
    [dispatch],
  )

  return (
    <div>
      <SectionLabel text="Mirror" />
      <div className="flex gap-2">
        <div className="flex-1">
          <Switch
            checked={isMirrorHorizontal}
            onChange={handleHorizontalChange}
            as="button"
            className={`w-full px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer ${
              isMirrorHorizontal
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            H
          </Switch>
        </div>
        <div className="flex-1">
          <Switch
            checked={isMirrorVertical}
            onChange={handleVerticalChange}
            as="button"
            className={`w-full px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer ${
              isMirrorVertical
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            V
          </Switch>
        </div>
      </div>
    </div>
  )
})

const SizeSection = memo(function SizeSection({
  gridSize,
  dispatch,
}: Readonly<{ gridSize: number; dispatch: React.Dispatch<Action> }>) {
  const handleChange = useCallback(
    (value: number) => dispatch({ type: 'SelectedGridSize', size: value }),
    [dispatch],
  )

  return (
    <div>
      <SectionLabel text="Grid Size" />
      <RadioGroup
        value={gridSize}
        onChange={handleChange}
        aria-label="Grid size"
        className="flex gap-1"
      >
        {GRID_SIZES.map(size => (
          <Radio key={size} value={size} className="flex-1">
            {({ checked }) => (
              <button
                className={`w-full px-2 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer ${
                  checked
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {size}
              </button>
            )}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  )
})

const PaletteSection = memo(function PaletteSection({
  selectedColorIndex,
  paletteThemeIndex,
  theme,
  dispatch,
}: Readonly<{
  selectedColorIndex: PaletteIndex
  paletteThemeIndex: number
  theme: PaletteTheme
  dispatch: React.Dispatch<Action>
}>) {
  const selectedHexColor = theme.colors[selectedColorIndex] ?? EMPTY_COLOR

  const handleColorChange = useCallback(
    (value: number) =>
      dispatch({ type: 'SelectedColor', colorIndex: value as PaletteIndex }),
    [dispatch],
  )
  const handleThemeChange = useCallback(
    (value: number) =>
      dispatch({ type: 'SelectedPaletteTheme', themeIndex: value }),
    [dispatch],
  )

  return (
    <div>
      <SectionLabel text="Color" />
      <div className="text-xs text-gray-400 font-mono pb-3">
        {selectedHexColor}
      </div>
      <RadioGroup
        value={selectedColorIndex}
        onChange={handleColorChange}
        aria-label="Color palette"
        className="grid grid-cols-4 gap-2.5"
      >
        {theme.colors.map((hexColor, index) => (
          <Radio key={index} value={index} className="flex">
            {({ checked }) => (
              <button
                className={`w-full aspect-square rounded-sm transition motion-reduce:transition-none cursor-pointer ${
                  checked
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                    : 'hover:scale-105 motion-reduce:hover:scale-100'
                }`}
                style={{ backgroundColor: hexColor }}
              >
                <span className="sr-only">{hexColor}</span>
              </button>
            )}
          </Radio>
        ))}
      </RadioGroup>
      <div className="relative w-full mt-3">
        <Listbox value={paletteThemeIndex} onChange={handleThemeChange}>
          <ListboxButton className="w-full px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition motion-reduce:transition-none">
            <div className="flex items-center justify-between w-full">
              <span>{theme.name}</span>
              <ChevronDownIcon />
            </div>
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            className="w-[var(--button-width)] rounded-lg border border-gray-700 bg-gray-800 shadow-lg overflow-hidden z-10 outline-none"
          >
            {PALETTE_THEMES.map((paletteTheme, index) => (
              <ListboxOption
                key={index}
                value={index}
                className={({ selected }) =>
                  `px-3 py-2 text-sm cursor-pointer transition motion-reduce:transition-none ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center justify-between">
                    <span>{paletteTheme.name}</span>
                    {selected && <span className="text-xs">{'\u2713'}</span>}
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </div>
    </div>
  )
})

const ClearCanvasSection = memo(function ClearCanvasSection({
  grid,
  dispatch,
}: Readonly<{ grid: Grid; dispatch: React.Dispatch<Action> }>) {
  const isEmpty = isGridEmpty(grid)
  const handleClick = useCallback(
    () => dispatch({ type: 'ClickedClear' }),
    [dispatch],
  )

  return (
    <button
      onClick={handleClick}
      disabled={isEmpty}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none ${
        isEmpty
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-gray-700 cursor-pointer'
      }`}
    >
      <TrashIcon />
      <span>Clear Canvas</span>
    </button>
  )
})

const TrashIcon = () => (
  <svg
    aria-hidden="true"
    className="w-4 h-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
)

const ChevronDownIcon = () => (
  <svg
    aria-hidden="true"
    className="w-4 h-4 text-gray-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
)

export const Toolbar = memo(function Toolbar({
  tool,
  mirrorMode,
  selectedColorIndex,
  gridSize,
  grid,
  paletteThemeIndex,
  theme,
  dispatch,
}: ToolbarProps) {
  return (
    <div className="w-full md:w-44 flex flex-col gap-5 flex-shrink-0">
      <ToolSection tool={tool} dispatch={dispatch} />
      <MirrorSection mirrorMode={mirrorMode} dispatch={dispatch} />
      <SizeSection gridSize={gridSize} dispatch={dispatch} />
      <PaletteSection
        selectedColorIndex={selectedColorIndex}
        paletteThemeIndex={paletteThemeIndex}
        theme={theme}
        dispatch={dispatch}
      />
      <ClearCanvasSection grid={grid} dispatch={dispatch} />
    </div>
  )
})
