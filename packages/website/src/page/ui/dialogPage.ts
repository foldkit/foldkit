import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { DialogPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Dialog from './demo/dialog'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = DialogPageContent

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
      dialog: demoContainer(...Dialog.view(model.dialogDemo, h)),
      animated: demoContainer(
        ...Dialog.dialogAnimatedDemo(model.dialogAnimatedDemo, h),
      ),
      overlay: demoContainer(
        ...Dialog.overlayDialogDemo(
          model.overlayDialogDemo,
          model.overlayComboboxDemo,
          model.maybeOverlayComboboxDemoSelectedCity,
          h,
        ),
      ),
      nested: demoContainer(
        ...Dialog.nestedDialogDemo(
          model.nestedDialogParentDemo,
          model.nestedDialogChildDemo,
          h,
        ),
      ),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
