import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { Skills } from '../step'
import { skillEntryView } from './skillEntry'

export const skillsView = Submodel.defineView<Skills.Model, Skills.Message>(
  (model): Html => {
    const h = html<Skills.Message>()

    return h.div(
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
              view: skillEntryView,
              toParentMessage: message =>
                Skills.GotEntryMessage({ entryId: entry.id, message }),
            }),
          ),
        ),
        h.button(
          [
            h.Type('button'),
            h.OnClick(Skills.ClickedAddEntry()),
            h.Class(
              'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
            ),
          ],
          ['+ Add Skill'],
        ),
      ],
    )
  },
)
