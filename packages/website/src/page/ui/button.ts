import { Ui } from 'foldkit'

import { Class, button, div, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import { ClickedButtonDemo, type Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic',
  text: 'Basic',
}

export const disabledHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'disabled',
  text: 'Disabled',
}

// DEMO CONTENT

const buttonClassName =
  'inline-flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:not-data-[disabled]:bg-accent-600/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

// VIEW

export const basicDemo = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', basicHeader.id, basicHeader.text),
  div(
    [Class('flex flex-col items-start gap-2')],
    [
      Ui.Button.view({
        onClick: toMessage(ClickedButtonDemo()),
        toView: attributes =>
          button([...attributes.button, Class(buttonClassName)], ['Click me']),
      }),
      span(
        [Class('text-sm text-gray-600 dark:text-gray-400')],
        [
          `Clicked ${model.buttonClickCount} time${model.buttonClickCount === 1 ? '' : 's'}`,
        ],
      ),
    ],
  ),
]

export const disabledDemo = (
  _model: Model,
  _toMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', disabledHeader.id, disabledHeader.text),
  Ui.Button.view<ParentMessage>({
    isDisabled: true,
    toView: attributes =>
      button([...attributes.button, Class(buttonClassName)], ['Disabled']),
  }),
]
