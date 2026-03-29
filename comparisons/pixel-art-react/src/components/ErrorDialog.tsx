import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { memo, useCallback } from 'react'

import type { Action } from '../reducer'

type ErrorDialogProps = Readonly<{
  isOpen: boolean
  exportError: string | null
  dispatch: React.Dispatch<Action>
}>

export const ErrorDialog = memo(function ErrorDialog({
  isOpen,
  exportError,
  dispatch,
}: ErrorDialogProps) {
  const handleClose = useCallback(
    () => dispatch({ type: 'DismissedErrorDialog' }),
    [dispatch],
  )

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl">
          <DialogTitle className="text-lg font-semibold text-red-400 mb-2">
            Export Failed
          </DialogTitle>
          <Description className="text-sm text-gray-400 mb-4">
            {exportError}
          </Description>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer"
          >
            Dismiss
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  )
})
