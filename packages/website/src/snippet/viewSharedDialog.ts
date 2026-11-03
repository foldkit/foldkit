import type { Html, HtmlBuilder } from 'foldkit/html'

import type {
  RenderInfo as DialogRenderInfo,
  ViewInputs as DialogViewInputs,
} from '@foldkit/ui/dialog'

type RenderDialog = (
  attributes: DialogRenderInfo['dialog'],
  children: ReadonlyArray<Html | string>,
) => Html

export const confirmDialogInputs = <ParentMessage>(
  h: HtmlBuilder<ParentMessage>,
  renderDialog: RenderDialog,
  config: Readonly<{
    title: string
    description: string
    confirmMessage: ParentMessage
  }>,
): DialogViewInputs => ({
  hasDescription: true,
  toView: ({
    dialog,
    backdrop,
    panel,
    title,
    description,
    closeButton,
    isVisible,
  }) =>
    renderDialog(
      dialog,
      isVisible
        ? [
            h.div(
              [...backdrop],
              [
                h.section(
                  [...panel],
                  [
                    h.h2([...title], [config.title]),
                    h.p([...description], [config.description]),
                    h.button([...closeButton], ['Cancel']),
                    h.button([h.OnClick(config.confirmMessage)], ['Confirm']),
                  ],
                ),
              ],
            ),
          ]
        : [],
    ),
})
