import type * as CodeBlock from '../../../markdown/codeBlock'
import { type RenderHeadingLink, demoContainer } from '../../../prose'
import { UiComposition } from '../composition'
import { SliderPageContent } from '../content'
import * as Slider from './demo/slider'

const { tableOfContents, view: renderPage } = SliderPageContent

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
