import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { memo, useCallback } from 'react'

import type { Action } from '../reducer'

type ConfirmDialogProps = Readonly<{
  isOpen: boolean
  pendingGridSize: number | null
  dispatch: React.Dispatch<Action>
}>

export const ConfirmDialog = memo(function ConfirmDialog({
  isOpen,
  pendingGridSize,
  dispatch,
}: ConfirmDialogProps) {
  const handleClose = useCallback(
    () => dispatch({ type: 'DismissedGridSizeDialog' }),
    [dispatch],
  )
  const handleConfirm = useCallback(
    () => dispatch({ type: 'ConfirmedGridSizeChange' }),
    [dispatch],
  )

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl">
          <DialogTitle className="text-lg font-semibold text-gray-100 mb-2">
            Change to {pendingGridSize}&times;{pendingGridSize}?
          </DialogTitle>
          <Description className="text-sm text-gray-400 mb-5">
            This will clear your canvas and reset undo history.
          </Description>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition motion-reduce:transition-none cursor-pointer"
            >
              Clear and Resize
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
})
