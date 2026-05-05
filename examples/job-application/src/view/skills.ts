import { type Html } from 'foldkit/html'

import { Class, OnClick, Type, button, div, p } from '../html'
import type { Message } from '../message'
import { Skills } from '../step'
import { skillEntryView } from './skillEntry'

export const skillsView = (
  model: Skills.Model,
  toParentMessage: (message: Skills.Message) => Message,
): Html =>
  div(
    [Class('space-y-6')],
    [
      p(
        [Class('text-sm text-gray-500')],
        ['Add your technical and professional skills.'],
      ),
      div(
        [Class('divide-y divide-gray-200')],
        model.entries.map(entry =>
          skillEntryView(
            entry,
            message =>
              toParentMessage(
                Skills.GotEntryMessage({ entryId: entry.id, message }),
              ),
            toParentMessage(Skills.RemovedEntry({ entryId: entry.id })),
          ),
        ),
      ),
      button(
        [
          Type('button'),
          OnClick(toParentMessage(Skills.ClickedAddEntry())),
          Class(
            'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
          ),
        ],
        ['+ Add Skill'],
      ),
    ],
  )
