import { Option, Record } from 'effect'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { type CodeBlock } from '../../component'
import { Icon } from '../../icon'
import { type RenderHeadingLink } from '../../prose'
import { ComingFromReactContent } from './content'
import { Message } from './message'
import type { Model } from './model'

type ComingFromReactViewBuilder = HtmlBuilder<Message>

// FAQ SHELL

const chevron = (isOpen: boolean): Html =>
  ih.span(
    [
      ih.Class(
        `text-gray-700 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const faqButtonClassName = 'docs-disclosure-button'

const faqPanelClassName =
  'docs-disclosure-panel [&_p]:mb-2 [&_p]:last:mb-0 [&_p]:leading-normal'

/**
 * The collapsible shell around one `:::Faq` island's answer. Supplied to the
 * markdown renderer rather than called directly, because the open state lives in
 * this page's Model and the toggle produces this page's Message.
 */
const faqItem = (
  id: string,
  question: string,
  answerContent: ReadonlyArray<Html>,
  model: Model,
  h: ComingFromReactViewBuilder,
): Html =>
  Option.match(Record.get(model, id), {
    onSome: isFaqOpen =>
      Disclosure.view(
        {
          id,
          isOpen: isFaqOpen,
          onToggle: isOpen => Message.ToggledFaq({ id, isOpen }),
          toView: attributes =>
            h.div(
              [h.Class('mb-2')],
              [
                h.button(
                  [...attributes.button, h.Class(faqButtonClassName)],
                  [
                    h.div(
                      [h.Class('flex items-center justify-between w-full')],
                      [h.span([], [question]), chevron(isFaqOpen)],
                    ),
                  ],
                ),
                isFaqOpen
                  ? h.div(
                      [...attributes.panel, h.Class(faqPanelClassName)],
                      [h.div([], answerContent)],
                    )
                  : h.empty,
              ],
            ),
        },
        h,
      ),
    onNone: () =>
      h.div([], [h.p([h.Class('font-bold')], [question]), ...answerContent]),
  })

// PAGE

const { tableOfContents, view: renderPage } = ComingFromReactContent

export { tableOfContents }

// NOTE: the code and heading-link renderers arrive in the view input rather
// than being built here. They render the parent's shared snippet controls and
// dispatch the parent's heading-link Message, so they run as the parent.
export type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = (
  model: Model,
  h: ComingFromReactViewBuilder,
  { renderCopyButton, renderSnippet, renderHeadingLink }: ViewInputs,
): Html =>
  renderPage({
    demos: {},
    renderFaq: (id, question, content) =>
      faqItem(id, question, content, model, h),
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
