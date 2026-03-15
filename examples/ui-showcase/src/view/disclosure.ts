import clsx from 'clsx'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, h2, p, span } from '../html'
import * as Icon from '../icon'
import type { Message as ParentMessage } from '../main'
import { GotDisclosureDemoMessage, type UiMessage } from '../message'
import type { UiModel } from '../model'

const buttonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 text-gray-900 hover:bg-gray-200/50 rounded-lg data-[open]:rounded-b-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none'

const panelClassName =
  'px-4 py-3 border-x border-b border-gray-300 rounded-b-lg text-gray-800'

const chevron = (isOpen: boolean) =>
  span(
    [Class(clsx('text-gray-600', isOpen && 'rotate-180'))],
    [Icon.chevronDown('w-4 h-4')],
  )

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Disclosure']),
      Ui.Disclosure.view({
        model: model.disclosureDemo,
        toMessage: message => toMessage(GotDisclosureDemoMessage({ message })),
        buttonAttributes: [Class(buttonClassName)],
        buttonContent: div(
          [Class('flex items-center justify-between w-full')],
          [
            span([], ['What is Foldkit?']),
            chevron(model.disclosureDemo.isOpen),
          ],
        ),
        panelAttributes: [Class(panelClassName)],
        panelContent: p(
          [Class('text-gray-800')],
          [
            'Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.',
          ],
        ),
      }),
    ],
  )
