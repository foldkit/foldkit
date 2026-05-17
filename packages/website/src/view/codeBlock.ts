import { clsx } from 'clsx'
import { HashSet } from 'effect'
import { Html, html } from 'foldkit/html'

import { Icon } from '../icon'
import { ClickedCopySnippet, type Message } from '../message'

const PagefindIgnore = html<Message>().DataAttribute('pagefind-ignore', '')

export type CopiedSnippets = HashSet.HashSet<string>

const copyButtonWithIndicator = (
  textToCopy: string,
  ariaLabel: string,
  copiedSnippets: CopiedSnippets,
  positionClass = 'top-2 right-2',
) => {
  const h = html<Message>()

  const isCopied = HashSet.has(copiedSnippets, textToCopy)

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
        'p-2 rounded transition cursor-pointer border border-gray-300 dark:border-gray-700/50 bg-gray-100 dark:bg-[#1c1a20] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/30',
      ),
      h.AriaLabel(ariaLabel),
      h.OnClick(ClickedCopySnippet({ text: textToCopy })),
    ],
    [Icon.copy()],
  )

  return h.div(
    [h.Class(clsx('code-embed-copy absolute', positionClass))],
    [copiedIndicator, liveAnnouncement, copyButton],
  )
}

export const codeBlock = (
  code: string,
  ariaLabel: string,
  copiedSnippets: CopiedSnippets,
  className?: string,
) => {
  const h = html<Message>()

  const content = h.pre(
    [
      h.Class(
        'text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 pr-14 overflow-x-auto !rounded-none !border-none',
      ),
    ],
    [code],
  )

  return h.div(
    [
      PagefindIgnore,
      h.Class(
        clsx(
          'relative min-w-0 rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
          className,
        ),
      ),
    ],
    [
      content,
      copyButtonWithIndicator(
        code,
        ariaLabel,
        copiedSnippets,
        'top-1/2 -translate-y-1/2 right-2',
      ),
    ],
  )
}

export const highlightedCodeBlock = (
  content: Html,
  rawCode: string,
  ariaLabel: string,
  copiedSnippets: CopiedSnippets,
  className?: string,
) => {
  const h = html<Message>()

  return h.div(
    [PagefindIgnore, h.Class(clsx('relative min-w-0 mt-8', className))],
    [content, copyButtonWithIndicator(rawCode, ariaLabel, copiedSnippets)],
  )
}
