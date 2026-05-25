import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { WorkHistory } from '../step'
import { workEntryView } from './workEntry'

export const workHistoryView = Submodel.defineView<
  WorkHistory.Model,
  WorkHistory.Message
>((model): Html => {
  const h = html<WorkHistory.Message>()

  return h.div(
    [h.Class('space-y-6')],
    [
      h.p(
        [h.Class('text-sm text-gray-500')],
        ['Add your relevant work experience, starting with the most recent.'],
      ),
      h.div(
        [h.Class('divide-y divide-gray-200')],
        model.entries.map(entry =>
          h.submodel({
            slotId: entry.id,
            model: entry,
            view: workEntryView,
            toParentMessage: message =>
              WorkHistory.GotEntryMessage({ entryId: entry.id, message }),
          }),
        ),
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(WorkHistory.ClickedAddEntry()),
          h.Class(
            'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
          ),
        ],
        ['+ Add Position'],
      ),
    ],
  )
})
