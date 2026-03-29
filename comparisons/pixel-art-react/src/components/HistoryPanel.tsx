import { memo, useCallback } from 'react'

import { THUMBNAIL_CELL_SIZE, VISIBLE_HISTORY_COUNT } from '../constants'
import { resolveColor } from '../palette'
import type { PaletteTheme } from '../palette'
import type { Action } from '../reducer'
import type { Grid } from '../types'

type HistoryPanelProps = Readonly<{
  undoStack: ReadonlyArray<Grid>
  redoStack: ReadonlyArray<Grid>
  currentGrid: Grid
  gridSize: number
  theme: PaletteTheme
  dispatch: React.Dispatch<Action>
}>

const SectionLabel = ({ text }: Readonly<{ text: string }>) => (
  <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
    {text}
  </div>
)

const ThumbnailEntry = memo(function ThumbnailEntry({
  grid,
  gridSize,
  isActive,
  label,
  stepIndex,
  actionType,
  dispatch,
  theme,
}: Readonly<{
  grid: Grid
  gridSize: number
  isActive: boolean
  label: string
  stepIndex: number | null
  actionType: 'ClickedHistoryStep' | 'ClickedRedoStep' | null
  dispatch: React.Dispatch<Action>
  theme: PaletteTheme
}>) {
  const isClickable = stepIndex !== null && actionType !== null

  const handleClick = useCallback(() => {
    if (stepIndex !== null && actionType !== null) {
      dispatch({ type: actionType, stepIndex })
    }
  }, [dispatch, stepIndex, actionType])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        handleClick()
      }
    },
    [isClickable, handleClick],
  )

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded ${
        isActive
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-800 cursor-pointer hover:bg-gray-700'
      }`}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div
        className="flex-shrink-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${THUMBNAIL_CELL_SIZE}px)`,
        }}
      >
        {grid.flatMap((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              style={{
                width: `${THUMBNAIL_CELL_SIZE}px`,
                height: `${THUMBNAIL_CELL_SIZE}px`,
                backgroundColor: resolveColor(cell, theme),
              }}
            />
          )),
        )}
      </div>
      <span
        className={`text-[10px] truncate ${isActive ? 'text-white' : 'text-gray-400'}`}
      >
        {label}
      </span>
    </div>
  )
})

export const HistoryPanel = memo(function HistoryPanel({
  undoStack,
  redoStack,
  currentGrid,
  gridSize,
  theme,
  dispatch,
}: HistoryPanelProps) {
  const undoCount = undoStack.length
  const redoCount = redoStack.length
  const visibleUndoEntries = undoStack.slice(-VISIBLE_HISTORY_COUNT)
  const hiddenUndoCount = undoCount - visibleUndoEntries.length

  const handleUndo = useCallback(
    () => dispatch({ type: 'ClickedUndo' }),
    [dispatch],
  )
  const handleRedo = useCallback(
    () => dispatch({ type: 'ClickedRedo' }),
    [dispatch],
  )

  return (
    <div className="w-full md:w-44 flex flex-col flex-shrink-0">
      <SectionLabel text="History" />
      <div className="flex flex-col gap-1.5">
        <button
          onClick={handleUndo}
          disabled={undoCount === 0}
          className={`flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none bg-gray-800 w-full ${
            undoCount > 0
              ? 'text-gray-200 hover:bg-gray-700 cursor-pointer'
              : 'text-gray-600 opacity-40 cursor-not-allowed'
          }`}
        >
          <span>Undo</span>
          <span className="text-gray-400">{'\u2318Z'}</span>
        </button>
        <button
          onClick={handleRedo}
          disabled={redoCount === 0}
          className={`flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none bg-gray-800 w-full ${
            redoCount > 0
              ? 'text-gray-200 hover:bg-gray-700 cursor-pointer'
              : 'text-gray-600 opacity-40 cursor-not-allowed'
          }`}
        >
          <span>Redo</span>
          <span className="text-gray-400">{'\u2318\u21e7Z'}</span>
        </button>
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[420px] mt-3">
        {redoStack.map((entryGrid, index) => (
          <ThumbnailEntry
            key={`redo-${index}`}
            grid={entryGrid}
            gridSize={gridSize}
            isActive={false}
            label={`Forward ${redoCount - index}`}
            stepIndex={index}
            actionType="ClickedRedoStep"
            dispatch={dispatch}
            theme={theme}
          />
        ))}
        <ThumbnailEntry
          key="current"
          grid={currentGrid}
          gridSize={gridSize}
          isActive={true}
          label="Current"
          stepIndex={null}
          actionType={null}
          dispatch={dispatch}
          theme={theme}
        />
        {visibleUndoEntries.toReversed().map((entryGrid, index) => {
          const stepIndex = undoCount - 1 - index
          return (
            <ThumbnailEntry
              key={`undo-${stepIndex}`}
              grid={entryGrid}
              gridSize={gridSize}
              isActive={false}
              label={`Back ${index + 1}`}
              stepIndex={stepIndex}
              actionType="ClickedHistoryStep"
              dispatch={dispatch}
              theme={theme}
            />
          )
        })}
        {hiddenUndoCount > 0 && (
          <div className="text-[10px] text-gray-500 text-center py-1">
            {hiddenUndoCount} more{'\u2026'}
          </div>
        )}
      </div>
    </div>
  )
})
