import { clsx } from 'clsx'
import { HashSet } from 'effect'
import { Submodel } from 'foldkit'

import { Icon } from '../icon'
import { Message } from './message'
import { type Model } from './model'

export type ViewInputs = Readonly<{
  snippetId: string
  text: string
  ariaLabel: string
  positionClass: string
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) => {
    const isCopied = HashSet.has(model.copiedSnippetIds, viewInputs.snippetId)

    const copiedIndicator = isCopied
      ? h.div(
          [
            h.Class(
              'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-sm rounded py-1 px-2 font-normal bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 whitespace-nowrap',
            ),
          ],
          ['Copied'],
        )
      : h.empty

    const liveAnnouncement = h.span(
      [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
      [isCopied ? 'Copied to clipboard' : ''],
    )

    const copyButton = h.button(
      [
        h.Class(
          'p-2 rounded transition cursor-pointer border border-gray-300 dark:border-gray-700/50 bg-[var(--code-background)] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/30',
        ),
        h.AriaLabel(viewInputs.ariaLabel),
        h.OnClick(
          Message.ClickedCopySnippet({
            snippetId: viewInputs.snippetId,
            text: viewInputs.text,
          }),
        ),
      ],
      [Icon.copy()],
    )

    return h.div(
      [h.Class(clsx('code-embed-copy absolute', viewInputs.positionClass))],
      [copiedIndicator, liveAnnouncement, copyButton],
    )
  },
)
