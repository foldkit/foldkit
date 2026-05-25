import clsx from 'clsx'
import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import * as Icon from '../../icon'
import { GotDisclosureDemoMessage, type UiMessage } from '../message'
import type { UiModel } from '../model'

const buttonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 text-gray-900 hover:bg-gray-200/50 rounded-lg data-[open]:rounded-b-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none'

const panelClassName =
  'px-4 py-3 border-x border-b border-gray-300 rounded-b-lg text-gray-800'

const chevron = (isOpen: boolean): Html => {
  const h = html()

  return h.span(
    [h.Class(clsx('text-gray-600', { 'rotate-180': isOpen }))],
    [Icon.chevronDown('w-4 h-4')],
  )
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Disclosure']),
      h.submodel({
        slotId: 'disclosure-demo',
        model: model.disclosureDemo,
        view: Ui.Disclosure.view,
        viewInputs: {
          toView: attributes =>
            h.div(
              [],
              [
                h.button(
                  [...attributes.button, h.Class(buttonClassName)],
                  [
                    h.div(
                      [h.Class('flex items-center justify-between w-full')],
                      [
                        h.span([], ['What is Foldkit?']),
                        chevron(model.disclosureDemo.isOpen),
                      ],
                    ),
                  ],
                ),
                model.disclosureDemo.isOpen
                  ? h.div(
                      [...attributes.panel, h.Class(panelClassName)],
                      [
                        h.p(
                          [h.Class('text-gray-800')],
                          [
                            'Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.',
                          ],
                        ),
                      ],
                    )
                  : h.empty,
              ],
            ),
        },
        toParentMessage: message => GotDisclosureDemoMessage({ message }),
      }),
    ],
  )
})
