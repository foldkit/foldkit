import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { ToastPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Toast from './demo/toast'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = ToastPageContent

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
      demo: demoContainer(
        ...Toast.demo(model.toastDemo, model.maybeLastDismissedToastTitle, h),
      ),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
