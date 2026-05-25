import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import { Icon } from '../../icon'
import type { TableOfContentsEntry } from '../../main'
import { GotDisclosureDemoMessage, type Message } from './message'

// TABLE OF CONTENTS

export const disclosureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'disclosure',
  text: 'Disclosure',
}

// DEMO CONTENT

const buttonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none'

const panelClassName =
  'px-4 py-3 border-x border-b border-gray-300 dark:border-gray-700 rounded-b-lg text-gray-800 dark:text-gray-200'

// VIEW

export const disclosureDemo = (disclosureModel: Ui.Disclosure.Model) => {
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
      [h.Class('w-full max-w-lg')],
      [
        h.submodel({
          slotId: 'disclosure-demo',
          model: disclosureModel,
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
                          chevron(disclosureModel.isOpen),
                        ],
                      ),
                    ],
                  ),
                  disclosureModel.isOpen
                    ? h.div(
                        [...attributes.panel, h.Class(panelClassName)],
                        [
                          h.p(
                            [h.Class('text-gray-800 dark:text-gray-200')],
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
    ),
  ]
}
