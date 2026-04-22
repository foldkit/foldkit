import { Match as M, Option } from 'effect'
import type { Html } from 'foldkit/html'
import type { EntryHandlers, Variant } from 'foldkit/ui/toast'

import { Class, OnClick, button, div, h2, h3, p, span } from '../html'
import * as Icon from '../icon'
import type { Message as ParentMessage } from '../main'
import {
  ClickedDismissAllToasts,
  ClickedShowErrorToast,
  ClickedShowInfoToast,
  ClickedShowStickyToast,
  ClickedShowSuccessToast,
  ClickedShowWarningToast,
  GotToastDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'
import { Toast } from '../toast'

type Entry = typeof Toast.Entry.Type

const variantClassName = (variant: Variant): string =>
  M.value(variant).pipe(
    M.when('Info', () => 'border-gray-300 bg-white text-gray-900'),
    M.when(
      'Success',
      () => 'border-emerald-300 bg-emerald-50 text-emerald-900',
    ),
    M.when('Warning', () => 'border-amber-300 bg-amber-50 text-amber-900'),
    M.when('Error', () => 'border-red-300 bg-red-50 text-red-900'),
    M.exhaustive,
  )

const entryClassName = 'w-80'

const renderToastEntry = (
  entry: Entry,
  handlers: EntryHandlers<ParentMessage>,
): Html =>
  div(
    [
      Class(
        `relative rounded-lg border shadow-sm p-3 pr-9 ${variantClassName(entry.variant)}`,
      ),
    ],
    [
      p([Class('font-semibold text-sm')], [entry.payload.title]),
      ...Option.match(entry.payload.maybeDescription, {
        onNone: () => [],
        onSome: description => [
          p([Class('text-sm text-gray-700 mt-0.5')], [description]),
        ],
      }),
      button(
        [
          Class(
            'absolute top-2 right-2 text-gray-500 hover:text-gray-900 cursor-pointer rounded-md p-1 transition-colors',
          ),
          OnClick(handlers.dismiss),
        ],
        [Icon.xMark('w-4 h-4')],
      ),
    ],
  )

const demoButtonClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-2')], ['Toast']),
      p(
        [Class('text-gray-600 mb-6 max-w-prose')],
        [
          'A stack of transient notifications that auto-dismiss. Hover over a toast to pause its timer.',
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Variants'],
      ),
      div(
        [Class('flex flex-wrap gap-2')],
        [
          button(
            [
              Class(demoButtonClassName),
              OnClick(toParentMessage(ClickedShowInfoToast())),
            ],
            ['Info'],
          ),
          button(
            [
              Class(demoButtonClassName),
              OnClick(toParentMessage(ClickedShowSuccessToast())),
            ],
            ['Success'],
          ),
          button(
            [
              Class(demoButtonClassName),
              OnClick(toParentMessage(ClickedShowWarningToast())),
            ],
            ['Warning'],
          ),
          button(
            [
              Class(demoButtonClassName),
              OnClick(toParentMessage(ClickedShowErrorToast())),
            ],
            ['Error'],
          ),
        ],
      ),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Sticky']),
      p(
        [Class('text-gray-600 mb-4 max-w-prose')],
        [
          'Pass ',
          span(
            [Class('font-mono text-sm bg-gray-100 px-1 rounded')],
            ['sticky: true'],
          ),
          ' to skip the auto-dismiss timer. The user must close it manually.',
        ],
      ),
      div(
        [Class('flex flex-wrap gap-2')],
        [
          button(
            [
              Class(demoButtonClassName),
              OnClick(toParentMessage(ClickedShowStickyToast())),
            ],
            ['Show sticky toast'],
          ),
          button(
            [
              Class(demoButtonClassName),
              OnClick(toParentMessage(ClickedDismissAllToasts())),
            ],
            ['Dismiss all'],
          ),
        ],
      ),

      Toast.view({
        model: model.toastDemo,
        position: 'BottomRight',
        toParentMessage: message =>
          toParentMessage(GotToastDemoMessage({ message })),
        renderEntry: renderToastEntry,
        entryClassName,
      }),
    ],
  )
