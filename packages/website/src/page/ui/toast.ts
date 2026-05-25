import { Match as M, Option } from 'effect'
import { Html, html } from 'foldkit/html'
import type { EntryHandlers, Variant } from 'foldkit/ui/toast'

import { Icon } from '../../icon'
import {
  ClickedDismissAllToasts,
  ClickedShowErrorToast,
  ClickedShowInfoToast,
  ClickedShowStickyToast,
  ClickedShowSuccessToast,
  GotToastDemoMessage,
  type Message,
} from './message'
import { Toast } from './toastModule'

type Entry = typeof Toast.Entry.Type
type Model = typeof Toast.Model.Type

// DEMO CONTENT

const variantClassName = (variant: Variant): string =>
  M.value(variant).pipe(
    M.when(
      'Info',
      () =>
        'border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white',
    ),
    M.when(
      'Success',
      () =>
        'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
    ),
    M.when(
      'Warning',
      () =>
        'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
    ),
    M.when(
      'Error',
      () =>
        'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100',
    ),
    M.exhaustive,
  )

const entryClassName = 'w-80'

const buttonClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

// VIEW

export const demo = (
  toastModel: Model,
  maybeLastDismissedTitle: Option.Option<string>,
): ReadonlyArray<Html> => {
  const h = html<Message>()

  const renderToastEntry = (entry: Entry, handlers: EntryHandlers): Html =>
    h.div(
      [
        h.Class(
          `relative rounded-lg border shadow-sm p-3 pr-9 ${variantClassName(entry.variant)}`,
        ),
      ],
      [
        h.p([h.Class('font-semibold text-sm')], [entry.payload.title]),
        ...Option.match(entry.payload.maybeDescription, {
          onNone: () => [],
          onSome: description => [
            h.p([h.Class('text-sm opacity-80 mt-0.5')], [description]),
          ],
        }),
        h.button(
          [
            ...handlers.dismiss,
            h.Class(
              'absolute top-2 right-2 opacity-60 hover:opacity-100 cursor-pointer rounded-md p-1 transition-opacity',
            ),
          ],
          [Icon.close('w-4 h-4')],
        ),
      ],
    )

  return [
    h.div(
      [h.Class('flex flex-wrap gap-2')],
      [
        h.button(
          [h.Class(buttonClassName), h.OnClick(ClickedShowInfoToast())],
          ['Info'],
        ),
        h.button(
          [h.Class(buttonClassName), h.OnClick(ClickedShowSuccessToast())],
          ['Success'],
        ),
        h.button(
          [h.Class(buttonClassName), h.OnClick(ClickedShowErrorToast())],
          ['Error'],
        ),
        h.button(
          [h.Class(buttonClassName), h.OnClick(ClickedShowStickyToast())],
          ['Sticky'],
        ),
        h.button(
          [h.Class(buttonClassName), h.OnClick(ClickedDismissAllToasts())],
          ['Dismiss all'],
        ),
      ],
    ),
    ...Option.match(maybeLastDismissedTitle, {
      onNone: () => [
        h.p(
          [h.Class('text-sm text-gray-500 dark:text-gray-500 mt-3')],
          ['No toasts dismissed yet'],
        ),
      ],
      onSome: title => [
        h.p(
          [h.Class('text-sm text-gray-600 dark:text-gray-400 mt-3')],
          [
            `Last dismissed: "${title}" (lifted from DismissedToast OutMessage)`,
          ],
        ),
      ],
    }),
    h.submodel({
      slotId: toastModel.id,
      model: toastModel,
      view: Toast.view,
      viewInputs: {
        position: 'BottomRight',
        entryToView: renderToastEntry,
        entryClassName,
      },
      toParentMessage: message => GotToastDemoMessage({ message }),
    }),
  ]
}
