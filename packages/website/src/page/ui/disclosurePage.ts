import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { DisclosurePageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Disclosure from './demo/disclosure'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = DisclosurePageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = (
  model: Model,
  { renderCopyButton, renderSnippet, renderHeadingLink }: ViewInputs,
  h: UiViewBuilder,
): Html =>
  renderPage({
    demos: {
      basic: demoContainer(
        ...Disclosure.basicDemo(model.isDisclosureDemoOpen, h),
      ),
      collapsedPreview: demoContainer(
        ...Disclosure.collapsedPreviewDemo(
          model.isDisclosureCollapsedPreviewDemoOpen,
          h,
        ),
      ),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
