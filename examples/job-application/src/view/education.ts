import { Submodel } from 'foldkit'
import type { CalendarDate } from 'foldkit/calendar'
import { type Html, createKeyedLazy, html } from 'foldkit/html'

import { Education } from '../step'
import { educationEntryView } from './educationEntry'

const lazyEntry = createKeyedLazy()

const entryView = (entry: Education.Entry.Model, today: CalendarDate): Html => {
  const h = html<Education.Message>()
  return h.submodel({
    slotId: entry.id,
    model: entry,
    view: educationEntryView,
    viewInputs: { today },
    toParentMessage: message =>
      Education.GotEntryMessage({ entryId: entry.id, message }),
  })
}

export const educationView = Submodel.defineView<
  Education.Model,
  Education.Message
>((model): Html => {
  const h = html<Education.Message>()

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
          lazyEntry(entry.id, entryView, [entry, model.today]),
        ),
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(Education.ClickedAddEntry()),
          h.Class(
            'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
          ),
        ],
        ['+ Add Education'],
      ),
    ],
  )
})
