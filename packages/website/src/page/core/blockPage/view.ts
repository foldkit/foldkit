import { clsx } from 'clsx'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { type CodeBlock } from '../../../component'
import { Icon } from '../../../icon'
import { type RenderHeadingLink, inlineCode } from '../../../prose'
import { BlockPageContent } from './content'
import { Message } from './message'
import { type Model } from './model'

const MESSAGE_ROUTING_DISCLOSURE_ID = 'block-message-routing-disclosure'

type BlockPageViewBuilder = HtmlBuilder<Message>

export type ViewInput = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

const messageRoutingUnderHoodDemo = (
  model: Model,
  h: BlockPageViewBuilder,
): Html =>
  Disclosure.view(
    {
      id: MESSAGE_ROUTING_DISCLOSURE_ID,
      isOpen: model.isMessageRoutingUnderHoodOpen,
      onToggle: isOpen => Message.ToggledMessageRoutingUnderHood({ isOpen }),
      toView: attributes =>
        h.div(
          [h.Class('mb-8')],
          [
            h.button(
              [...attributes.button, h.Class('docs-disclosure-button')],
              [
                h.span(
                  [],
                  ['Under the hood: how a child Message finds its instance'],
                ),
                h.span(
                  [
                    h.Class(
                      clsx(
                        'text-gray-700 dark:text-gray-300 transition-transform',
                        { 'rotate-180': model.isMessageRoutingUnderHoodOpen },
                      ),
                    ),
                  ],
                  [Icon.chevronDown('w-4 h-4')],
                ),
              ],
            ),
            model.isMessageRoutingUnderHoodOpen
              ? h.div(
                  [...attributes.panel, h.Class('docs-disclosure-panel')],
                  [
                    h.p(
                      [h.Class('leading-relaxed')],
                      [
                        'Every instance has a path from the root: its parent’s path plus its own id, such as ',
                        inlineCode("['profile', 'settings']"),
                        '. A handler built in the instance’s view dispatches a ',
                        inlineCode('BlockMessage'),
                        ' carrying the path and the child Message. The Runtime walks the Model from the root, following the path through each instance, and applies the Message to the instance at the end with that instance’s own update.',
                      ],
                    ),
                    h.p(
                      [h.Class('leading-relaxed')],
                      [
                        'On the way back up, each parent receives the next Model of the child it passed through. When the child returns an OutMessage, the parent’s ',
                        inlineCode('Child.on'),
                        ' handler runs with the parent’s Model and the reporting instance. Commands returned at any level keep the path of the instance that returned them, so their result Messages travel back down the same way. ',
                        inlineCode('Block.deliver'),
                        ' builds the same ',
                        inlineCode('BlockMessage'),
                        ' by hand, which is how a test addresses a child.',
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

const { tableOfContents, view: renderPage } = BlockPageContent

export { tableOfContents }

export const view = (
  model: Model,
  h: BlockPageViewBuilder,
  viewInput: ViewInput,
): Html =>
  renderPage({
    demos: {
      'message-routing-under-hood': messageRoutingUnderHoodDemo(model, h),
    },
    renderCopyButton: viewInput.renderCopyButton,
    renderSnippet: viewInput.renderSnippet,
    renderHeadingLink: viewInput.renderHeadingLink,
  })
