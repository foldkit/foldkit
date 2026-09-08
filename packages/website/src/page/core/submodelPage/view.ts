import { clsx } from 'clsx'
import { Submodel } from 'foldkit'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { CodeBlock } from '../../../component'
import { Icon } from '../../../icon'
import { slotDocPage } from '../../../markdown'
import { type RenderHeadingLink, inlineCode } from '../../../prose'
import * as Snippet from '../../../snippet'
import raw from '../submodel.md'
import { Message } from './message'
import { type Model } from './model'

const MAP_MESSAGES_DISCLOSURE_ID = 'submodel-map-messages-disclosure'

export type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

const mapMessagesUnderHoodDemo = (
  model: Model,
  renderCopyButton: CodeBlock.RenderCopyButton,
  h: HtmlBuilder<Message>,
): Html =>
  Disclosure.view(
    {
      id: MAP_MESSAGES_DISCLOSURE_ID,
      isOpen: model.isMapMessagesUnderHoodOpen,
      onToggle: isOpen => Message.ToggledMapMessagesUnderHood({ isOpen }),
      toView: attributes =>
        h.div(
          [h.Class('mb-8')],
          [
            h.button(
              [...attributes.button, h.Class('docs-disclosure-button')],
              [
                h.span([], ['Under the hood: the Command.mapMessages chain']),
                h.span(
                  [
                    h.Class(
                      clsx(
                        'text-gray-600 dark:text-gray-300 transition-transform',
                        { 'rotate-180': model.isMapMessagesUnderHoodOpen },
                      ),
                    ),
                  ],
                  [Icon.chevronDown('w-4 h-4')],
                ),
              ],
            ),
            model.isMapMessagesUnderHoodOpen
              ? h.div(
                  [...attributes.panel, h.Class('docs-disclosure-panel')],
                  [
                    h.div(
                      [h.Class('-mt-6')],
                      [
                        CodeBlock.highlightedView(
                          'core-submodel-map-messages-under-hood',
                          h.div([
                            h.Class('text-sm'),
                            h.InnerHTML(
                              Snippet.commandMapMessagesUnderHoodHighlighted,
                            ),
                          ]),
                          Snippet.commandMapMessagesUnderHoodRaw,
                          'Copy snippet to clipboard',
                          renderCopyButton,
                          'mb-4',
                        ),
                      ],
                    ),
                    h.p(
                      [h.Class('leading-relaxed')],
                      [
                        'Two small layers compose into ',
                        inlineCode('mapMessages'),
                        '. ',
                        inlineCode('commands ?? []'),
                        ' turns an omitted Commands field into a concrete empty array, then ',
                        inlineCode('Array.map'),
                        ' iterates; ',
                        inlineCode('mapMessage'),
                        ' maps each Command’s Effect result through the wrapper (what dispatches in production) and also records the wrapper on the Command. The Command’s ',
                        inlineCode('name'),
                        ' and ',
                        inlineCode('args'),
                        ' ride through untouched, which is why DevTools traces still attribute each Command to its original Submodel. The recorded wrapper keeps the mapping recoverable, so a Story or Scene test resolves a mapped Command with the child’s raw result and never restates the wrapper by hand.',
                      ],
                    ),
                  ],
                )
              : h.empty,
          ],
        ),
    },
    h,
  )

const { tableOfContents, view: renderPage } =
  slotDocPage<'map-messages-under-hood'>(raw, 'core/submodel')

export { tableOfContents }

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) =>
    renderPage({
      demos: {
        'map-messages-under-hood': mapMessagesUnderHoodDemo(
          model,
          viewInputs.renderCopyButton,
          h,
        ),
      },
      renderCopyButton: viewInputs.renderCopyButton,
      renderHeadingLink: viewInputs.renderHeadingLink,
    }),
)
