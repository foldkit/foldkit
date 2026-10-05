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
  variant: 'Header' | 'Overlay'
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) => {
    const isCopied = HashSet.has(model.copiedSnippetIds, viewInputs.snippetId)

    const renderCopiedIndicator = () => {
      if (!isCopied) {
        return h.empty
      }

      if (viewInputs.variant === 'Header') {
        return h.span(
          [
            h.Class(
              'relative top-px whitespace-nowrap text-xs font-medium text-gray-700 dark:text-gray-300',
            ),
          ],
          ['Copied'],
        )
      }

      return h.div(
        [
          h.Class(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-sm rounded py-1 px-2 font-normal bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 whitespace-nowrap',
          ),
        ],
        ['Copied'],
      )
    }

    const liveAnnouncement = h.span(
      [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
      [isCopied ? 'Copied to clipboard' : ''],
    )
    const buttonClassName = clsx(
      'cursor-pointer text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
      viewInputs.variant === 'Header'
        ? 'flex size-10 items-center justify-center transition-colors focus-visible:rounded focus-visible:outline-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-400'
        : 'rounded border border-gray-300 bg-[var(--code-background)] p-2 transition hover:border-gray-400 hover:bg-gray-200 dark:border-gray-700/50 dark:hover:border-gray-500 dark:hover:bg-gray-700/30',
    )
    const wrapperClassName = clsx(
      'code-embed-copy',
      viewInputs.variant === 'Header'
        ? 'relative flex shrink-0 items-center'
        : 'absolute',
      viewInputs.variant === 'Overlay' && viewInputs.positionClass,
    )

    const copyButton = h.button(
      [
        h.Class(buttonClassName),
        h.Type('button'),
        h.AriaLabel(viewInputs.ariaLabel),
        h.OnClick(
          Message.ClickedCopySnippet({
            snippetId: viewInputs.snippetId,
            text: viewInputs.text,
          }),
        ),
      ],
      [Icon.copy('size-[1.125rem]')],
    )

    return h.div(
      [h.Class(wrapperClassName)],
      [renderCopiedIndicator(), liveAnnouncement, copyButton],
    )
  },
)
