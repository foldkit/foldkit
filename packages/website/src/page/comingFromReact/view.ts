import { Option, Record } from 'effect'
import { Submodel } from 'foldkit'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { type CodeBlock } from '../../component'
import { Icon } from '../../icon'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink } from '../../prose'
import raw from './comingFromReact.md'
import { Message } from './message'
import type { Model } from './model'

// FAQ SHELL

const chevron = (isOpen: boolean): Html =>
  ih.span(
    [
      ih.Class(
        `text-gray-600 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`,
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
  h: HtmlBuilder<Message>,
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

const { tableOfContents, view: renderPage } = slotDocPage(
  raw,
  'coming-from-react',
)

export { tableOfContents }

// NOTE: `renderCopyButton` and `renderHeadingLink` arrive as slot callbacks
// rather than being built here. The first establishes a SnippetCopy child and
// the second dispatches the parent's heading-link Message. As top-level
// `viewInputs` functions they both run in the parent's boundary.
type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {},
      renderFaq: (id, question, content) =>
        faqItem(id, question, content, model, h),
      renderCopyButton,
      renderHeadingLink,
    }),
)
