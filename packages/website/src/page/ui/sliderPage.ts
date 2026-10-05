import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Slider from './demo/slider'
import type { Message } from './message'
import type { Model } from './model'
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

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
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
