import clsx from 'clsx'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, button, div, h2, label, p, span } from '../html'
import type { Message as ParentMessage } from '../main'
import { GotSwitchDemoMessage, type UiMessage } from '../message'
import type { UiModel } from '../model'

const wrapperClassName = 'flex items-center gap-3'

const buttonClassName =
  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-gray-300 data-[checked]:bg-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500'

const knob = (isChecked: boolean) =>
  span(
    [
      Class(
        clsx(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          isChecked ? 'translate-x-6' : 'translate-x-1',
        ),
      ),
    ],
    [],
  )

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Switch']),
      div(
        [Class('mt-4')],
        [
          Ui.Switch.view({
            model: model.switchDemo,
            toParentMessage: message =>
              toParentMessage(GotSwitchDemoMessage({ message })),
            toView: attributes =>
              div(
                [Class(wrapperClassName)],
                [
                  button(
                    [...attributes.button, Class(buttonClassName)],
                    [knob(model.switchDemo.isChecked)],
                  ),
                  div(
                    [],
                    [
                      label(
                        [...attributes.label, Class(labelClassName)],
                        ['Enable notifications'],
                      ),
                      p(
                        [
                          ...attributes.description,
                          Class(descriptionClassName),
                        ],
                        ['Get notified when something important happens.'],
                      ),
                    ],
                  ),
                ],
              ),
          }),
        ],
      ),
    ],
  )
