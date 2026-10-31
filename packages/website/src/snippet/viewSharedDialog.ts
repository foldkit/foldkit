import type { Mount } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'

import type * as Dialog from '@foldkit/ui/dialog'

type DialogMounts = Mount.RequirementsOf<(typeof Dialog.Dialog.Mount)[number]>

export const confirmDialogInput = <ParentMessage>(
  h: HtmlBuilder<ParentMessage, DialogMounts>,
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
    h.dialog(
      [...dialog],
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
