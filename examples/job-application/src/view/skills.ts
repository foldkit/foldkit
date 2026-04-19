import { type Html } from 'foldkit/html'

import { Class, OnClick, Type, button, div, p } from '../html'
import { GotSkillsMessage } from '../message'
import { Skills } from '../step'
import { skillEntryView } from './skillEntry'

export const skillsView = (model: Skills.Model): Html =>
  div(
    [Class('space-y-6')],
    [
      p(
        [Class('text-sm text-gray-500')],
        ['Add your technical and professional skills.'],
      ),
      div(
        [Class('divide-y divide-gray-200')],
        model.entries.map(skillEntryView),
      ),
      button(
        [
          Type('button'),
          OnClick(GotSkillsMessage({ message: Skills.ClickedAddEntry() })),
          Class(
            'w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer',
          ),
        ],
        ['+ Add Skill'],
      ),
    ],
  )
