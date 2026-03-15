import { Array } from 'effect'
import { Html } from 'foldkit/html'
import { twMerge } from 'tailwind-merge'

import {
  AriaLabel,
  Class,
  Href,
  Id,
  OnClick,
  a,
  code,
  div,
  h1,
  h2,
  h3,
  h4,
  li,
  p,
  span,
  strong,
  ul,
} from './html'
import { Icon } from './icon'
import { type TableOfContentsEntry } from './main'
import { ClickedCopyLink } from './message'

export const headingLinkButton = (id: string, text: string): Html =>
  a(
    [
      Href(`#${id}`),
      Class(
        'px-0.5 py-1 rounded transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 focus-visible:text-gray-800 dark:focus-visible:text-gray-200 focus-visible:opacity-100 cursor-pointer hover-capable:opacity-0 hover-capable:group-hover:opacity-100',
      ),
      AriaLabel(`Copy link to ${text}`),
      OnClick(ClickedCopyLink({ hash: id })),
    ],
    [Icon.link('w-5 h-5')],
  )

export const link = (href: string, text: string): Html =>
  a(
    [
      Href(href),
      Class(
        'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
      ),
    ],
    [text],
  )

export const pageTitle = (id: string, text: string): Html =>
  h1(
    [
      Class(
        'text-3xl md:text-[2.5rem] leading-normal font-normal text-gray-900 dark:text-white mb-4',
      ),
      Id(id),
    ],
    [text],
  )

const sectionHeadingConfig = {
  h2: {
    textClassName:
      'text-2xl md:text-3xl font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-8 mb-4 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h3: {
    textClassName:
      'text-lg font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-6 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h4: {
    textClassName:
      'text-base font-mono font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
}

export const heading = (
  level: 'h2' | 'h3' | 'h4',
  id: string,
  text: string,
): Html => {
  const tag = { h2, h3, h4 }
  const config = sectionHeadingConfig[level]

  return div(
    [Class(config.wrapperClassName)],
    [
      tag[level]([Class(config.textClassName), Id(id)], [text]),
      headingLinkButton(id, text),
    ],
  )
}

export const para = (...content: ReadonlyArray<string | Html>): Html =>
  p([Class('mb-4 leading-relaxed')], content)

export const subPara = (...content: ReadonlyArray<string | Html>): Html =>
  p([Class('mb-4 text-sm leading-6 text-gray-800 dark:text-gray-400')], content)

export const paragraphs = (
  ...contents: ReadonlyArray<string>
): ReadonlyArray<Html> =>
  Array.map(contents, text => p([Class('mb-4')], [text]))

export const tableOfContentsEntryToHeader = (
  entry: TableOfContentsEntry,
): Html => heading(entry.level, entry.id, entry.text)

export const bullets = (...items: ReadonlyArray<string | Html>): Html =>
  ul(
    [Class('list-disc mb-8 space-y-2')],
    Array.map(items, item => li([], [item])),
  )

export const bulletPoint = (label: string, description: string): Html =>
  li([], [strong([], [`${label}:`]), ` ${description}`])

const inlineCodeClassName =
  'bg-gray-200/70 dark:bg-gray-800 px-1 py-px rounded text-sm border border-gray-300/50 dark:border-gray-700/50'

export const inlineCode = (text: string, className?: string): Html =>
  code([Class(twMerge(inlineCodeClassName, className))], [text])

export const infoCallout = (
  label: string,
  ...content: ReadonlyArray<string | Html>
): Html =>
  div(
    [
      Class(
        'border border-gray-300 dark:border-gray-700 bg-gray-200/40 dark:bg-gray-800/40 py-3.5 px-5 mb-6 rounded-lg',
      ),
    ],
    [
      p(
        [
          Class(
            'flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200 mb-1',
          ),
        ],
        [Icon.informationCircle('w-5 h-5 shrink-0'), span([], [label])],
      ),
      p([Class('text-gray-700 dark:text-gray-300 leading-7')], content),
    ],
  )

export const warningCallout = (
  label: string,
  ...content: ReadonlyArray<string | Html>
): Html =>
  div(
    [
      Class(
        'border border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 py-3.5 px-5 mb-6 rounded-lg',
      ),
    ],
    [
      p(
        [
          Class(
            'flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200 mb-1',
          ),
        ],
        [Icon.exclamationTriangle('w-5 h-5 shrink-0'), span([], [label])],
      ),
      p([Class('text-amber-800 dark:text-amber-300/90 leading-7')], content),
    ],
  )
