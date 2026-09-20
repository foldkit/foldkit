import { Array } from 'effect'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { extendTailwindMerge } from 'tailwind-merge'

import { Icon } from './icon'
import { type TableOfContentsEntry } from './tableOfContentsEntry'

/**
 * Builds the copy-link control beside a section heading.
 *
 * A page rendered through `h.submodel` receives one of these from the boundary
 * that owns the heading-link Message. An element dispatches through the frame
 * where it is built, so the renderer keeps that ownership explicit.
 */
export type RenderHeadingLink = (id: string, text: string) => Html

const mergeClassNames = extendTailwindMerge({
  extend: {
    theme: {
      'font-weight': ['book', 'code'],
      text: ['page-title', 'page-title-wide', 'inline-code'],
    },
  },
})

const headingLinkButton = <Message>(
  id: string,
  text: string,
  toMessage: (id: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(`#${id}`),
      h.Class(
        'px-0.5 py-1 rounded transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 focus-visible:text-gray-800 dark:focus-visible:text-gray-200 focus-visible:opacity-100 cursor-pointer hover-capable:opacity-0 hover-capable:group-hover:opacity-100',
      ),
      h.AriaLabel(`Copy link to ${text}`),
      h.OnClick(toMessage(id)),
    ],
    [Icon.link('w-5 h-5')],
  )

/**
 * Builds a copy-link renderer for the supplied Message boundary.
 */
export const renderHeadingLink =
  <Message>(
    toMessage: (id: string) => Message,
    h: HtmlBuilder<Message>,
  ): RenderHeadingLink =>
  (id, text) =>
    headingLinkButton(id, text, toMessage, h)

export const link = (href: string, text: string): Html =>
  ih.a([ih.Href(href), ih.Class('link-accent')], [text])

export const pageTitle = (id: string, text: string, className?: string): Html =>
  ih.h1(
    [
      ih.Class(
        mergeClassNames(
          'font-heading font-book text-page-title md:text-page-title-wide leading-tight tracking-tight text-gray-900 dark:text-white mb-6',
          className,
        ),
      ),
      ih.Id(id),
      ih.DataAttribute('pagefind-meta', 'section'),
    ],
    [text],
  )

const sectionHeadingConfig = {
  h2: {
    textClassName:
      'font-heading font-book text-2xl md:text-3xl leading-snug tracking-tight text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-16 mb-4 [h1+&]:mt-12 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h3: {
    textClassName:
      'font-heading font-book text-xl md:text-2xl leading-snug tracking-tight text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-12 mb-3 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h4: {
    textClassName:
      'text-base font-mono font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-10 mb-3 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h5: {
    textClassName:
      'text-sm font-mono font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-8 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h6: {
    textClassName:
      'text-sm font-mono font-normal text-gray-500 dark:text-gray-400 scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-8 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
}

/**
 * Renders a linkable section heading (`h2` through `h6`) with the hover anchor
 * button. `ariaText` labels the copy-link control; `content` is the heading's
 * rendered inline content, so a heading may carry inline code or emphasis.
 */
export const headingWithContent = (
  level: 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  id: string,
  ariaText: string,
  content: ReadonlyArray<string | Html>,
  renderHeadingLink: RenderHeadingLink,
): Html => {
  const tag = { h2: ih.h2, h3: ih.h3, h4: ih.h4, h5: ih.h5, h6: ih.h6 }
  const config = sectionHeadingConfig[level]

  return ih.div(
    [ih.Class(config.wrapperClassName)],
    [
      tag[level]([ih.Class(config.textClassName), ih.Id(id)], content),
      renderHeadingLink(id, ariaText),
    ],
  )
}

export const para = (...content: ReadonlyArray<string | Html>): Html =>
  ih.p([ih.Class('mb-5 leading-7')], content)

export const subPara = (...content: ReadonlyArray<string | Html>): Html =>
  ih.p(
    [ih.Class('mb-5 text-sm leading-6 text-gray-800 dark:text-gray-400')],
    content,
  )

/**
 * The heading helpers bound to a page-supplied copy-link renderer, for a page
 * rendered inside a Submodel. Bind once at the top of the view and the call
 * sites below it are unchanged.
 */
export const headingsFor = (renderHeadingLink: RenderHeadingLink) => ({
  heading: (level: 'h2' | 'h3' | 'h4', id: string, text: string): Html =>
    headingWithContent(level, id, text, [text], renderHeadingLink),
  tableOfContentsEntryToHeader: (entry: TableOfContentsEntry): Html =>
    headingWithContent(
      entry.level,
      entry.id,
      entry.text,
      [entry.text],
      renderHeadingLink,
    ),
})

export const bullets = (...items: ReadonlyArray<string | Html>): Html =>
  ih.ul(
    [ih.Class('list-disc mb-6 space-y-2')],
    Array.map(items, item => ih.li([], [item])),
  )

export const bulletPoint = (label: string, description: string): Html =>
  ih.span([], [ih.strong([], [`${label}:`]), ` ${description}`])

const inlineCodeClassName =
  'bg-gray-200/60 dark:bg-gray-800 text-[var(--code-foreground)] [a_&]:text-inherit [:is(h1,h2,h3,h4,h5,h6)_&]:text-inherit mx-[0.1em] px-[0.25em] py-[0.05em] rounded-xs text-inline-code font-code wrap-anywhere'

export const inlineCode = (text: string, className?: string): Html =>
  ih.code([ih.Class(mergeClassNames(inlineCodeClassName, className))], [text])

export const infoCallout = (
  label: string,
  ...content: ReadonlyArray<string | Html>
): Html =>
  ih.div(
    [
      ih.Class(
        'border border-gray-200 dark:border-gray-800 bg-gray-200/40 dark:bg-gray-800/40 py-3.5 px-5 mb-6 rounded-lg',
      ),
    ],
    [
      ih.p(
        [
          ih.Class(
            'flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200 mb-1',
          ),
        ],
        [Icon.informationCircle('w-5 h-5 shrink-0'), ih.span([], [label])],
      ),
      ih.p([ih.Class('text-gray-700 dark:text-gray-300 leading-7')], content),
    ],
  )

export const demoContainer = (...content: ReadonlyArray<Html>): Html =>
  ih.div(
    [
      ih.Class(
        'rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/20 p-8 mb-6 flex flex-col items-center',
      ),
    ],
    content,
  )

export const warningCallout = (
  label: string,
  ...content: ReadonlyArray<string | Html>
): Html =>
  ih.div(
    [
      ih.Class(
        'border border-amber-400 dark:border-amber-500/50 py-3.5 px-5 mb-6 rounded-lg',
      ),
    ],
    [
      ih.p(
        [
          ih.Class(
            'flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200 mb-1',
          ),
        ],
        [Icon.exclamationTriangle('w-5 h-5 shrink-0'), ih.span([], [label])],
      ),
      ih.p([ih.Class('text-gray-700 dark:text-gray-300 leading-7')], content),
    ],
  )

const calloutBlocks = (
  config: Readonly<{
    borderClassName: string
    labelClassName: string
    icon: Html
    label: string
    blocks: ReadonlyArray<Html>
  }>,
): Html =>
  ih.div(
    [
      ih.Class(
        `border ${config.borderClassName} py-3.5 px-5 mt-8 mb-6 rounded-lg`,
      ),
    ],
    [
      ih.p(
        [
          ih.Class(
            `flex items-center gap-1.5 font-semibold ${config.labelClassName} mb-1`,
          ),
        ],
        [config.icon, ih.span([], [config.label])],
      ),
      ih.div(
        [
          ih.Class(
            'text-gray-700 dark:text-gray-300 [&>p]:leading-7 [&>p:last-child]:mb-0',
          ),
        ],
        config.blocks,
      ),
    ],
  )

/**
 * An informational callout wrapping block content (paragraphs, lists, code
 * blocks). The `:::Info` markdown island renders through this.
 */
export const infoCalloutBlocks = (
  label: string,
  blocks: ReadonlyArray<Html>,
): Html =>
  calloutBlocks({
    borderClassName:
      'border-gray-200 dark:border-gray-800 bg-gray-200/40 dark:bg-gray-800/40',
    labelClassName: 'text-gray-800 dark:text-gray-200',
    icon: Icon.informationCircle('w-5 h-5 shrink-0'),
    label,
    blocks,
  })

/**
 * A cautionary callout wrapping block content. The `:::Warning` markdown island
 * renders through this.
 */
export const warningCalloutBlocks = (
  label: string,
  blocks: ReadonlyArray<Html>,
): Html =>
  calloutBlocks({
    borderClassName: 'border-amber-400 dark:border-amber-500/50',
    labelClassName: 'text-amber-900 dark:text-amber-200',
    icon: Icon.exclamationTriangle('w-5 h-5 shrink-0'),
    label,
    blocks,
  })

/**
 * A centered, monospaced figure for ASCII diagrams. The `diagram` fenced code
 * block in markdown renders through this. It carries no copy affordance because
 * the content is a picture, not code to lift.
 */
export const diagram = (content: string): Html =>
  ih.pre(
    [
      ih.Class(
        'code-surface mb-6 mx-auto w-fit max-w-full text-sm p-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700/50',
      ),
    ],
    [content],
  )

/**
 * A wrapping row of call-to-action links. The `:::Cta` markdown island renders
 * its link paragraphs through this, laying them out as a row and lifting the
 * links to medium weight.
 */
export const ctaLinks = (blocks: ReadonlyArray<Html>): Html =>
  ih.div(
    [
      ih.Class(
        'mb-6 flex flex-wrap gap-x-6 gap-y-2 [&>p]:m-0 [&_a]:font-medium',
      ),
    ],
    blocks,
  )
