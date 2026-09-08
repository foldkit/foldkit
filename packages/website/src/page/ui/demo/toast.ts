import { Match, Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { EntryHandlers, Variant } from '@foldkit/ui/toast'

import { Icon } from '../../../icon'
import { Message } from '../message'
import { Toast } from './toastModule'

type Entry = typeof Toast.Entry.Type
type Model = typeof Toast.Model.Type

// DEMO CONTENT

const variantClassName = (variant: Variant): string =>
  Match.value(variant).pipe(
    Match.when(
      'Info',
      () =>
        'border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white',
    ),
    Match.when(
      'Success',
      () =>
        'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
    ),
    Match.when(
      'Warning',
      () =>
        'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
    ),
    Match.when(
      'Error',
      () =>
        'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100',
    ),
    Match.exhaustive,
  )

const entryClassName = 'w-80'

const buttonClassName =
  'demo-neutral-button inline-flex items-center gap-1.5 text-sm'

// VIEW

export const demo = (
  toastModel: Model,
  maybeLastDismissedTitle: Option.Option<string>,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
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
          [h.Class(buttonClassName), h.OnClick(Message.ClickedShowInfoToast())],
          ['Info'],
        ),
        h.button(
          [
            h.Class(buttonClassName),
            h.OnClick(Message.ClickedShowSuccessToast()),
          ],
          ['Success'],
        ),
        h.button(
          [
            h.Class(buttonClassName),
            h.OnClick(Message.ClickedShowErrorToast()),
          ],
          ['Error'],
        ),
        h.button(
          [
            h.Class(buttonClassName),
            h.OnClick(Message.ClickedShowStickyToast()),
          ],
          ['Sticky'],
        ),
        h.button(
          [
            h.Class(buttonClassName),
            h.OnClick(Message.ClickedDismissAllToasts()),
          ],
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
      toParentMessage: message => Message.GotToastDemoMessage({ message }),
    }),
  ]
}
