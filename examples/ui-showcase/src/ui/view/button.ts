import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { ClickedButtonDemo, type UiMessage } from '../message'
import type { UiModel } from '../model'

const buttonClassName =
  'inline-flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:not-data-[disabled]:bg-accent-600/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Button']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('flex flex-col items-start gap-2')],
        [
          Ui.Button.view<UiMessage>({
            onClick: ClickedButtonDemo(),
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(buttonClassName)],
                ['Click me'],
              ),
          }),
          h.span(
            [h.Class('text-sm text-gray-600')],
            [
              `Clicked ${model.buttonClickCount} time${model.buttonClickCount === 1 ? '' : 's'}`,
            ],
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Ui.Button.view<UiMessage>({
        isDisabled: true,
        toView: attributes =>
          h.button(
            [...attributes.button, h.Class(buttonClassName)],
            ['Disabled'],
          ),
      }),
    ],
  )
})
