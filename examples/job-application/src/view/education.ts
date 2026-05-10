import { type Html, html } from 'foldkit/html'

import { Education } from '../step'
import { educationEntryView } from './educationEntry'

export const educationView = <ParentMessage>(
  model: Education.Model,
  toParentMessage: (message: Education.Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('space-y-6')],
    [
      h.p(
        [h.Class('text-sm text-gray-500')],
        ['Add your educational background.'],
      ),
      h.div(
        [h.Class('divide-y divide-gray-200')],
        model.entries.map(entry =>
          educationEntryView<ParentMessage>(
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
      h.button(
        [
          h.Type('button'),
          h.OnClick(toParentMessage(Education.ClickedAddEntry())),
          h.Class(
            'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
          ),
        ],
        ['+ Add Education'],
      ),
    ],
  )
}
