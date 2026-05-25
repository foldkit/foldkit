import clsx from 'clsx'
import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { GotSwitchDemoMessage, type UiMessage } from '../message'
import type { UiModel } from '../model'

const wrapperClassName = 'flex items-center gap-3'

const buttonClassName =
  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-gray-300 data-[checked]:bg-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500'

const knob = (isChecked: boolean): Html => {
  const h = html()

  return h.span(
    [
      h.Class(
        clsx(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          isChecked ? 'translate-x-6' : 'translate-x-1',
        ),
      ),
    ],
    [],
  )
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Switch']),
      h.div(
        [h.Class('mt-4')],
        [
          h.submodel({
            slotId: 'switch-demo',
            model: model.switchDemo,
            view: Ui.Switch.view,
            viewInputs: {
              toView: attributes =>
                h.div(
                  [h.Class(wrapperClassName)],
                  [
                    h.button(
                      [...attributes.button, h.Class(buttonClassName)],
                      [knob(model.switchDemo.isChecked)],
                    ),
                    h.div(
                      [],
                      [
                        h.label(
                          [...attributes.label, h.Class(labelClassName)],
                          ['Enable notifications'],
                        ),
                        h.p(
                          [
                            ...attributes.description,
                            h.Class(descriptionClassName),
                          ],
                          ['Get notified when something important happens.'],
                        ),
                      ],
                    ),
                  ],
                ),
            },
            toParentMessage: message => GotSwitchDemoMessage({ message }),
          }),
        ],
      ),
    ],
  )
})
