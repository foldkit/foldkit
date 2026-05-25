import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../../main'
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

export const basicDemo = (model: Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex flex-col items-center gap-2')],
      [
        Ui.Button.view<Message>({
          onClick: ClickedButtonDemo(),
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class(buttonClassName)],
              ['Click me'],
            ),
        }),
        h.span(
          [h.Class('text-sm text-gray-600 dark:text-gray-400')],
          [
            `Clicked ${model.buttonClickCount} time${model.buttonClickCount === 1 ? '' : 's'}`,
          ],
        ),
      ],
    ),
  ]
}

export const disabledDemo = (_model: Model) => {
  const h = html<Message>()

  return [
    Ui.Button.view<Message>({
      isDisabled: true,
      toView: attributes =>
        h.button(
          [...attributes.button, h.Class(buttonClassName)],
          ['Disabled'],
        ),
    }),
  ]
}
