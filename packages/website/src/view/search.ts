import { clsx } from 'clsx'
import { Html } from 'foldkit/html'

import type { ApplicationViewBuilder } from '../composition'
import { SearchBinding } from '../composition'
import { Icon } from '../icon'
import { Message } from '../message'
import { type Model } from '../model'
import { KEYBOARD_WARMUP_INPUT_ID } from '../searchDom'

const keyboardWarmupSelector = `#${KEYBOARD_WARMUP_INPUT_ID}`

const onClickOpenSearch = (h: ApplicationViewBuilder) =>
  h.OnClick(Message.ClickedOpenSearch(), {
    focusSelector: keyboardWarmupSelector,
  })

export const dialogView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.block(SearchBinding.embedView({ slotId: 'search', model: model.search }))

export const triggerView = (
  className: string,
  h: ApplicationViewBuilder,
): Html =>
  h.button(
    [
      h.Class(
        clsx(
          'items-center gap-1 h-8 px-2 rounded-md text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-400',
          className,
        ),
      ),
      h.AriaLabel('Search documentation'),
      onClickOpenSearch(h),
    ],
    [
      Icon.magnifyingGlass('w-4 h-4'),
      h.span(
        [
          h.AriaHidden(true),
          h.Class(
            'text-xs text-gray-600 dark:text-gray-400 rounded font-mono space-x-0.5',
          ),
        ],
        [h.span([], ['⌘']), h.span([], ['K'])],
      ),
    ],
  )

export const compactTriggerView = (
  className: string,
  h: ApplicationViewBuilder,
): Html =>
  h.button(
    [
      h.Class(
        clsx(
          'size-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-400',
          className,
        ),
      ),
      h.AriaLabel('Search documentation'),
      onClickOpenSearch(h),
    ],
    [Icon.magnifyingGlass('w-5 h-5')],
  )
