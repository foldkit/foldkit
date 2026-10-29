import { Match, Option } from 'effect'
import type { Html } from 'foldkit/html'

import type { EntryHandlers, Variant } from '@foldkit/ui/toast'

import * as Icon from '../../icon'
import { ToastDemoBinding, UiComposition } from '../composition'
import type { UiViewBuilder } from '../composition'
import { Message } from '../message'
import { ToastBlock } from '../toast'

type ToastModel = typeof ToastBlock.Model.Type

type Entry = ToastModel['entries'][number]

const variantClassName = (variant: Variant): string =>
  Match.value(variant).pipe(
    Match.when('Info', () => 'border-gray-300 bg-white text-gray-900'),
    Match.when(
      'Success',
      () => 'border-emerald-300 bg-emerald-50 text-emerald-900',
    ),
    Match.when('Warning', () => 'border-amber-300 bg-amber-50 text-amber-900'),
    Match.when('Error', () => 'border-red-300 bg-red-50 text-red-900'),
    Match.exhaustive,
  )

const entryClassName =
  'w-80 motion-safe:data-[swipe=settling]:transition-[translate] motion-safe:data-[swipe=settling]:duration-150 motion-safe:data-[swipe=settling]:ease-out motion-safe:data-[swipe=end]:transition-[translate] motion-safe:data-[swipe=end]:duration-[240ms] motion-safe:data-[swipe=end]:ease-in'

const renderToastEntry = (
  entry: Entry,
  handlers: EntryHandlers,
  h: UiViewBuilder,
): Html => {
  return h.div(
    [
      h.Class(
        `relative rounded-lg border shadow-sm p-3 pr-9 ${variantClassName(entry.variant)}`,
      ),
    ],
    [
      h.p(
        [h.Class('font-semibold text-sm')],
        [
          h.span(
            [h.DataAttribute('toast-swipe-ignore', '')],
            [entry.payload.title],
          ),
        ],
      ),
      ...Option.match(entry.payload.maybeDescription, {
        onNone: () => [],
        onSome: description => [
          h.p(
            [h.Class('text-sm text-gray-700 mt-0.5')],
            [
              h.span(
                [h.DataAttribute('toast-swipe-ignore', '')],
                [description],
              ),
            ],
          ),
        ],
      }),
      h.button(
        [
          ...handlers.dismiss,
          h.Class(
            'absolute top-2 right-2 text-gray-500 hover:text-gray-900 cursor-pointer rounded-md p-1 transition-colors',
          ),
        ],
        [Icon.xMark('w-4 h-4')],
      ),
    ],
  )
}

const demoButtonClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

export const view = UiComposition.makeView((model, h) => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-2')], ['Toast']),
      h.p(
        [h.Class('text-gray-600 mb-6 max-w-prose')],
        [
          'A stack of transient notifications that auto-dismiss. Hover over a toast to pause its timer.',
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Variants'],
      ),
      h.div(
        [h.Class('flex flex-wrap gap-2')],
        [
          h.button(
            [
              h.Class(demoButtonClassName),
              h.OnClick(Message.ClickedShowInfoToast()),
            ],
            ['Info'],
          ),
          h.button(
            [
              h.Class(demoButtonClassName),
              h.OnClick(Message.ClickedShowSuccessToast()),
            ],
            ['Success'],
          ),
          h.button(
            [
              h.Class(demoButtonClassName),
              h.OnClick(Message.ClickedShowWarningToast()),
            ],
            ['Warning'],
          ),
          h.button(
            [
              h.Class(demoButtonClassName),
              h.OnClick(Message.ClickedShowErrorToast()),
            ],
            ['Error'],
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Sticky'],
      ),
      h.p(
        [h.Class('text-gray-600 mb-4 max-w-prose')],
        [
          'Pass ',
          h.span(
            [h.Class('font-mono text-sm bg-gray-100 px-1 rounded')],
            ['sticky: true'],
          ),
          ' to skip the auto-dismiss timer. The user must close it manually.',
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap gap-2')],
        [
          h.button(
            [
              h.Class(demoButtonClassName),
              h.OnClick(Message.ClickedShowStickyToast()),
            ],
            ['Show sticky toast'],
          ),
          h.button(
            [
              h.Class(demoButtonClassName),
              h.OnClick(Message.ClickedDismissAllToasts()),
            ],
            ['Dismiss all'],
          ),
        ],
      ),

      h.block(
        ToastDemoBinding.embedView({
          slotId: model.toastDemo.id,
          model: model.toastDemo,
          viewInputs: {
            position: 'BottomRight',
            entryToView: (entry, handlers) =>
              renderToastEntry(entry, handlers, h),
            entryClassName,
          },
        }),
      ),
    ],
  )
})
