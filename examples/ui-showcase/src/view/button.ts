import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, button, div, h2, h3, span } from '../html'
import type { Message as ParentMessage } from '../main'
import { ClickedButtonDemo, type UiMessage } from '../message'
import type { UiModel } from '../model'

const buttonClassName =
  'inline-flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:not-data-[disabled]:bg-accent-600/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Button']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      div(
        [Class('flex flex-col items-start gap-2')],
        [
          Ui.Button.view({
            onClick: toMessage(ClickedButtonDemo()),
            toView: attributes =>
              button(
                [...attributes.button, Class(buttonClassName)],
                ['Click me'],
              ),
          }),
          span(
            [Class('text-sm text-gray-600')],
            [
              `Clicked ${model.buttonClickCount} time${model.buttonClickCount === 1 ? '' : 's'}`,
            ],
          ),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Ui.Button.view<ParentMessage>({
        isDisabled: true,
        toView: attributes =>
          button([...attributes.button, Class(buttonClassName)], ['Disabled']),
      }),
    ],
  )
