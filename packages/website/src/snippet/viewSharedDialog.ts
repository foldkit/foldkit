import type { Html, HtmlBuilder } from 'foldkit/html'

import type * as Dialog from '@foldkit/ui/dialog'

type RenderDialog = (
  attributes: Dialog.RenderInfo['dialog'],
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
): Dialog.ViewInputs => ({
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
