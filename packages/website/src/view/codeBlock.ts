import classNames from 'classnames'
import { HashSet } from 'effect'
import { Html } from 'foldkit/html'

import {
  AriaLabel,
  AriaLive,
  Class,
  OnClick,
  Role,
  button,
  div,
  empty,
  pre,
  span,
} from '../html'
import { Icon } from '../icon'
import { ClickedCopySnippet } from '../main'

export type CopiedSnippets = HashSet.HashSet<string>

const copyButtonWithIndicator = (
  textToCopy: string,
  ariaLabel: string,
  copiedSnippets: CopiedSnippets,
) => {
  const isCopied = HashSet.has(copiedSnippets, textToCopy)

  const copiedIndicator = isCopied
    ? div(
        [
          Class(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-sm rounded py-1 px-2 font-normal bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 whitespace-nowrap',
          ),
        ],
        ['Copied'],
      )
    : empty

  const liveAnnouncement = span(
    [Role('status'), AriaLive('polite'), Class('sr-only')],
    [isCopied ? 'Copied to clipboard' : ''],
  )

  const copyButton = button(
    [
      Class(
        'p-2 rounded transition cursor-pointer border border-gray-300 dark:border-gray-700/50 bg-gray-100 dark:bg-[#1c1a20] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/30',
      ),
      AriaLabel(ariaLabel),
      OnClick(ClickedCopySnippet({ text: textToCopy })),
    ],
    [Icon.copy()],
  )

  return div(
    [Class('absolute top-2 right-2')],
    [copiedIndicator, liveAnnouncement, copyButton],
  )
}

export const codeBlock = (
  code: string,
  ariaLabel: string,
  copiedSnippets: CopiedSnippets,
  className?: string,
) => {
  const content = pre(
    [
      Class(
        'text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 pr-14 overflow-x-auto !rounded-none !border-none',
      ),
    ],
    [code],
  )

  return div(
    [
      Class(
        classNames(
          'relative min-w-0 rounded-lg bg-gray-100 dark:bg-[#1c1a20] overflow-hidden border border-gray-200 dark:border-gray-700/50',
          className,
        ),
      ),
    ],
    [
      content,
      copyButtonWithIndicator(code, ariaLabel, copiedSnippets),
    ],
  )
}

export const highlightedCodeBlock = (
  content: Html,
  rawCode: string,
  ariaLabel: string,
  copiedSnippets: CopiedSnippets,
  className?: string,
) =>
  div(
    [Class(classNames('relative min-w-0', className))],
    [
      content,
      copyButtonWithIndicator(rawCode, ariaLabel, copiedSnippets),
    ],
  )
