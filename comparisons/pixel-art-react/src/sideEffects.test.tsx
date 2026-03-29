/**
 * @vitest-environment jsdom
 *
 * Side-effect tests for the React pixel art editor.
 *
 * These tests demonstrate the DX cost of testing side effects in React.
 * Compare with the Foldkit version, which tests the same behaviors purely:
 *
 *   // Foldkit — export side effect tested as data
 *   Test.message(ClickedExport())
 *   Test.tap(({ commands }) => expect(commands[0].name).toBe(ExportPng.name))
 *   Test.resolve(ExportPng, SucceededExportPng())
 *
 *   // Foldkit — localStorage save tested as data
 *   Test.message(ReleasedMouse())
 *   Test.tap(({ commands }) => expect(commands[0].name).toBe(SaveCanvas.name))
 *
 * In React, you must mount real components, mock browser APIs, and
 * assert on imperative mock calls instead of inspecting return values.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { App } from './App'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// Helper: find the crosshair grid container (the canvas area)
// Since cells are plain divs with no test IDs, we must query by CSS class.
// ---------------------------------------------------------------------------
const findCanvasCells = (): NodeListOf<Element> => {
  const crosshairContainer = document.querySelector('.cursor-crosshair')
  if (crosshairContainer === null) {
    throw new Error('Canvas crosshair container not found')
  }
  // Each cell is the innermost div (leaf) inside the grid rows.
  // Rows are direct children, cells are children of rows.
  const rows = crosshairContainer.children
  const firstRow = rows[0]
  if (firstRow === undefined) {
    throw new Error('No rows found in canvas')
  }
  return firstRow.querySelectorAll(':scope > div')
}

describe('export side effects', () => {
  test('successful export creates a canvas, renders pixels, and triggers a download link click', () => {
    // --- Mock setup: 7 lines of browser API mocking ---
    const mockClick = vi.fn()
    const mockFillRect = vi.fn()
    const mockGetContext = vi.fn(() => ({
      fillStyle: '',
      fillRect: mockFillRect,
    }))
    const mockToDataURL = vi.fn(() => 'data:image/png;base64,mock')

    // We have to intercept document.createElement while letting React's own
    // calls pass through — this requires saving the original and branching
    // on the tag name.
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tagName: string, options?: ElementCreationOptions): any => {
          if (tagName === 'canvas') {
            const fakeCanvas = originalCreateElement('canvas')
            fakeCanvas.getContext =
              mockGetContext as unknown as typeof fakeCanvas.getContext
            fakeCanvas.toDataURL =
              mockToDataURL as unknown as typeof fakeCanvas.toDataURL
            return fakeCanvas
          }
          if (tagName === 'a') {
            const link = originalCreateElement('a')
            Object.defineProperty(link, 'click', {
              value: mockClick,
              writable: true,
            })
            return link
          }
          return originalCreateElement(tagName, options)
        },
      )

    // --- Render the full component tree ---
    render(<App />)

    // Restore createElement before interacting so React's internal calls
    // during re-render don't hit our mock
    createElementSpy.mockRestore()

    // --- Find and click the export button ---
    const exportButton = screen.getByRole('button', { name: /export png/i })
    // Re-apply mocks just for the export call
    vi.spyOn(document, 'createElement').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tagName: string, options?: ElementCreationOptions): any => {
        if (tagName === 'canvas') {
          const fakeCanvas = originalCreateElement('canvas')
          fakeCanvas.getContext =
            mockGetContext as unknown as typeof fakeCanvas.getContext
          fakeCanvas.toDataURL =
            mockToDataURL as unknown as typeof fakeCanvas.toDataURL
          return fakeCanvas
        }
        if (tagName === 'a') {
          const link = originalCreateElement('a')
          Object.defineProperty(link, 'click', {
            value: mockClick,
            writable: true,
          })
          return link
        }
        return originalCreateElement(tagName, options)
      },
    )
    fireEvent.click(exportButton)

    // --- Assert the mocks were called ---
    expect(mockGetContext).toHaveBeenCalledWith('2d')
    expect(mockFillRect).toHaveBeenCalled()
    expect(mockToDataURL).toHaveBeenCalledWith('image/png')
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  test('failed export dispatches ExportFailed and shows error dialog', () => {
    // Mock getContext to return null so export fails
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tagName: string, options?: ElementCreationOptions): any => {
          if (tagName === 'canvas') {
            const fakeCanvas = originalCreateElement('canvas')
            fakeCanvas.getContext = (() => null) as typeof fakeCanvas.getContext
            return fakeCanvas
          }
          return originalCreateElement(tagName, options)
        },
      )

    render(<App />)
    createElementSpy.mockRestore()

    const exportButton = screen.getByRole('button', { name: /export png/i })

    // Re-apply canvas mock for the export call
    vi.spyOn(document, 'createElement').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tagName: string, options?: ElementCreationOptions): any => {
        if (tagName === 'canvas') {
          const fakeCanvas = originalCreateElement('canvas')
          fakeCanvas.getContext = (() => null) as typeof fakeCanvas.getContext
          return fakeCanvas
        }
        return originalCreateElement(tagName, options)
      },
    )
    fireEvent.click(exportButton)

    // The error dialog should now be visible with the error message
    expect(screen.getByText('Could not get canvas context')).toBeInTheDocument()
    expect(screen.getByText('Export Failed')).toBeInTheDocument()
  })
})

describe('localStorage side effects', () => {
  test('painting a cell and releasing the mouse persists canvas to localStorage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    render(<App />)

    const cells = findCanvasCells()
    const firstCell = cells[0]
    if (firstCell === undefined) {
      throw new Error('No canvas cells rendered')
    }

    // Simulate a paint stroke: mousedown on cell, then mouseup on document
    fireEvent.mouseDown(firstCell)
    fireEvent.mouseUp(document)

    // localStorage.setItem is called inside a useEffect, which runs
    // asynchronously after React finishes rendering. We have to poll for it.
    await vi.waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        'pixel-art-react-canvas',
        expect.any(String),
      )
    })

    const savedCall = setItemSpy.mock.calls.find(
      ([key]) => key === 'pixel-art-react-canvas',
    )
    expect(savedCall).toBeDefined()

    const savedData = JSON.parse(savedCall![1] as string) as {
      grid: unknown
      gridSize: number
    }
    expect(savedData.gridSize).toBe(16)
    expect(savedData.grid).toBeDefined()
  })
})
