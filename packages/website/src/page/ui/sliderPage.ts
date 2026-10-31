import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { SliderPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Slider from './demo/slider'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = SliderPageContent

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
  })
