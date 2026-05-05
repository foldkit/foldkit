import { type Html } from 'foldkit/html'

import { Class, OnClick, Type, button, div, p } from '../html'
import type { Message } from '../message'
import { Education } from '../step'
import { educationEntryView } from './educationEntry'

export const educationView = (
  model: Education.Model,
  toParentMessage: (message: Education.Message) => Message,
): Html =>
  div(
    [Class('space-y-6')],
    [
      p([Class('text-sm text-gray-500')], ['Add your educational background.']),
      div(
        [Class('divide-y divide-gray-200')],
        model.entries.map(entry =>
          educationEntryView(
            entry,
            model.today,
            message =>
              toParentMessage(
                Education.GotEntryMessage({ entryId: entry.id, message }),
              ),
            toParentMessage(Education.RemovedEntry({ entryId: entry.id })),
          ),
        ),
      ),
      button(
        [
          Type('button'),
          OnClick(toParentMessage(Education.ClickedAddEntry())),
          Class(
            'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
          ),
        ],
        ['+ Add Education'],
      ),
    ],
  )
