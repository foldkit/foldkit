import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Slider from './demo/slider'
import raw from './sliderPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'horizontal' | 'vertical'
>(raw, 'ui/slider')

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
        horizontal: demoContainer(
          ...Slider.horizontalDemo(
            model.sliderRatingDemo,
            model.sliderRatingValue,
            h,
          ),
        ),
        vertical: demoContainer(
          ...Slider.verticalDemo(
            model.sliderVolumeDemo,
            model.sliderVolumeValue,
            h,
          ),
        ),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
