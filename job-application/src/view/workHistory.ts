import { type Html } from 'foldkit/html'

import { Class, OnClick, Type, button, div, p } from '../html'
import { GotWorkHistoryMessage } from '../message'
import { WorkHistory } from '../step'
import { workEntryView } from './workEntry'

export const workHistoryView = (model: WorkHistory.Model): Html =>
  div(
    [Class('space-y-6')],
    [
      p(
        [Class('text-sm text-gray-500')],
        ['Add your relevant work experience, starting with the most recent.'],
      ),
      div(
        [Class('divide-y divide-gray-200')],
        model.entries.map(workEntryView),
      ),
      button(
        [
          Type('button'),
          OnClick(
            GotWorkHistoryMessage({
              message: WorkHistory.ClickedAddEntry(),
            }),
          ),
          Class(
            'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
          ),
        ],
        ['+ Add Position'],
      ),
    ],
  )
