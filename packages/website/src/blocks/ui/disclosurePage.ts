import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { DisclosurePageContent } from './content'
import * as Disclosure from './demo/disclosure'

const { tableOfContents, view: renderPage } = DisclosurePageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = UiComposition.makeView.withInputs<ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h) =>
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
    }),
)
