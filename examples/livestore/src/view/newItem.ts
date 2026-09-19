import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

import { Message } from '../message'

export const newItemFormView = (
  newItemText: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.form(
    [h.Class('mb-6'), h.OnSubmit(Message.SubmittedNewItem())],
    [
      h.div(
        [h.Class('flex gap-3')],
        [
          Input.view(
            {
              id: 'new-item',
              value: newItemText,
              placeholder: 'Add a task...',
              onInput: text => Message.UpdatedNewItemText({ text }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.AriaLabel('New task'),
                  h.Class(
                    'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                  ),
                ]),
            },
            h,
          ),
          Button.view(
            {
              type: 'submit',
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
                    ),
                  ],
                  ['Add'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )

export const addItemErrorView = (
  error: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class('bg-red-50 border border-red-200 rounded-lg p-4 mb-4'),
      h.Role('alert'),
    ],
    [
      h.p([h.Class('text-red-800 font-semibold mb-1')], ['Could not add task']),
      h.p([h.Class('text-red-600 text-sm')], [error]),
    ],
  )
