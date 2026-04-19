import clsx from 'clsx'
import { Ui } from 'foldkit'
import { type Html } from 'foldkit/html'

import { ProficiencyLevel } from '../domain'
import { Class, OnClick, Type, button, div, input, keyed, span } from '../html'
import { GotSkillsMessage } from '../message'
import { Skills } from '../step'
import { inputField } from './field'

export const skillEntryView = (model: Skills.Entry.Model): Html => {
  const toEntryMessage = (message: Skills.Entry.Message) =>
    GotSkillsMessage({
      message: Skills.GotEntryMessage({ entryId: model.id, message }),
    })

  const nameView = inputField({
    id: `${model.id}-name`,
    label: 'Skill',
    field: model.name,
    onInput: value => toEntryMessage(Skills.Entry.UpdatedName({ value })),
    placeholder: 'e.g. TypeScript, React, Effect-TS',
  })

  const proficiencyView = Ui.RadioGroup.view({
    model: model.proficiency,
    toParentMessage: message =>
      toEntryMessage(Skills.Entry.GotProficiencyMessage({ message })),
    options: ProficiencyLevel.all,
    orientation: 'Horizontal',
    className: 'inline-flex flex-wrap gap-2',
    optionToConfig: (level, { isSelected }) => ({
      value: level,
      content: attributes =>
        div(
          [
            ...attributes.option,
            Class(
              clsx(
                'cursor-pointer rounded-full border px-3 py-1 text-sm transition select-none',
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400',
              ),
            ),
          ],
          [input([...attributes.label, Class('sr-only')]), span([], [level])],
        ),
    }),
    ariaLabel: 'Proficiency level',
  })

  return keyed('div')(
    model.id,
    [Class('py-6 space-y-4 first:pt-0')],
    [
      nameView,
      div(
        [Class('space-y-2')],
        [
          span(
            [Class('block text-sm font-medium text-gray-700')],
            ['Proficiency'],
          ),
          proficiencyView,
        ],
      ),
      div(
        [Class('flex justify-end')],
        [
          button(
            [
              Type('button'),
              OnClick(
                GotSkillsMessage({
                  message: Skills.RemovedEntry({ entryId: model.id }),
                }),
              ),
              Class(
                'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
              ),
            ],
            ['Remove skill'],
          ),
        ],
      ),
    ],
  )
}
