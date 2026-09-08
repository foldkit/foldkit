import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import * as Entry from './entry'
import { Message, type Model } from './skills'

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.p(
        [h.Class('text-sm text-gray-500')],
        ['Add your technical and professional skills.'],
      ),
      h.div(
        [h.Class('divide-y divide-gray-200')],
        model.entries.map(entry =>
          h.submodel({
            slotId: entry.id,
            model: entry,
            view: Entry.view,
            toParentMessage: message =>
              Message.GotEntryMessage({ entryId: entry.id, message }),
          }),
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
              ['+ Add Skill'],
            ),
        },
        h,
      ),
    ],
  ),
)
