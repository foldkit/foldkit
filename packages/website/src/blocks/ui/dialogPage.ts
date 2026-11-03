import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { DialogPageContent } from './content'
import * as Dialog from './demo/dialog'

const { tableOfContents, view: renderPage } = DialogPageContent

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
    }),
)
