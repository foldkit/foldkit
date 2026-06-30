import { html } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { Icon } from '../../icon'
import { GotDisclosureDemoMessage, type Message } from './message'

// DEMO CONTENT

const containerClassName =
  'border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden'

const buttonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none'

const panelClassName =
  'px-4 py-3 border-t border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200'

// VIEW

export const disclosureDemo = (disclosureModel: Disclosure.Model) => {
  const h = html<Message>()

  const chevron = (isOpen: boolean) =>
    h.span(
      [
        h.Class(
          `text-gray-600 dark:text-gray-300 ${isOpen ? 'rotate-180' : ''}`,
        ),
      ],
      [Icon.chevronDown('w-4 h-4')],
    )

  return [
    h.div(
      [h.Class('flex w-full max-w-lg flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Disclosure.buttonId('disclosure-demo')),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['Frequently asked'],
        ),
        h.submodel({
          slotId: 'disclosure-demo',
          model: disclosureModel,
          view: Disclosure.view,
          viewInputs: {
            toView: attributes =>
              h.div(
                [h.Class(containerClassName)],
                [
                  h.button(
                    [...attributes.button, h.Class(buttonClassName)],
                    [
                      h.div(
                        [h.Class('flex items-center justify-between w-full')],
                        [
                          h.span([], ['What is Foldkit?']),
                          chevron(disclosureModel.isOpen),
                        ],
                      ),
                    ],
                  ),
                  attributes.animatePanel(
                    h.div(
                      [...attributes.panel, h.Class(panelClassName)],
                      [
                        h.p(
                          [h.Class('text-gray-800 dark:text-gray-200')],
                          [
                            'Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.',
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
          },
          toParentMessage: message => GotDisclosureDemoMessage({ message }),
        }),
      ],
    ),
  ]
}
