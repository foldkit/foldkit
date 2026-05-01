import { Effect, Function } from 'effect'
import { Mount } from 'foldkit'
import type { Html, MountResult } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Class, OnMount, Type, input } from '../html'

const CompletedFocusInput = m('CompletedFocusInput')

// Setup-only actions pass Function.constVoid as the cleanup. The
// runtime still tracks the lifecycle, but there is nothing to undo
// when the input unmounts. The Completed* Message marks the dispatch
// without forcing a meaningful response in update.

const FocusInput = Mount.define('FocusInput', CompletedFocusInput)

const focusInput = FocusInput(
  (element): Effect.Effect<MountResult<typeof CompletedFocusInput.Type>> =>
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) {
        element.focus()
      }
      return {
        message: CompletedFocusInput(),
        cleanup: Function.constVoid,
      }
    }),
)

const searchInputView = (): Html =>
  input([
    Type('search'),
    Class('w-full px-3 py-2 rounded-md border'),
    OnMount(focusInput),
  ])
