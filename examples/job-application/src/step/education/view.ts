import { Submodel } from 'foldkit'
import type { CalendarDate } from 'foldkit/calendar'
import { type Html, type HtmlBuilder, createKeyedLazy } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Message, type Model } from './education'
import * as Entry from './entry'

const lazyEntry = createKeyedLazy()

const entryView = (
  entry: Entry.Model,
  today: CalendarDate,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: entry.id,
    model: entry,
    view: Entry.view,
    viewInputs: { today },
    toParentMessage: message =>
      Message.GotEntryMessage({ entryId: entry.id, message }),
  })

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.p(
        [h.Class('text-sm text-gray-500')],
        ['Add your educational background.'],
      ),
      h.div(
        [h.Class('divide-y divide-gray-200')],
        model.entries.map(entry =>
          lazyEntry(entry.id, entryView, [entry, model.today, h]),
        ),
      ),
      Button.view(
        {
          onClick: Message.ClickedAddEntry(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
                ),
              ],
              ['+ Add Education'],
            ),
        },
        h,
      ),
    ],
  ),
)
