import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Disclosure from './demo/disclosure'
import raw from './disclosurePage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'collapsedPreview'
>(raw, 'ui/disclosure')

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
