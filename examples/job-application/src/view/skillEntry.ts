import clsx from 'clsx'
import { Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { ProficiencyLevel } from '../domain'
import { Skills } from '../step'
import { inputField } from './field'

export const skillEntryView = <ParentMessage>(
  model: Skills.Entry.Model,
  toParentMessage: (message: Skills.Entry.Message) => ParentMessage,
  onRemove: ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const nameView = inputField<ParentMessage>({
    id: `${model.id}-name`,
    label: 'Skill',
    field: model.name,
    onInput: value => toParentMessage(Skills.Entry.UpdatedName({ value })),
    placeholder: 'e.g. TypeScript, React, Effect-TS',
  })

  const proficiencyView = Ui.RadioGroup.view({
    model: model.proficiency,
    toParentMessage: message =>
      toParentMessage(Skills.Entry.GotProficiencyMessage({ message })),
    options: ProficiencyLevel.all,
    orientation: 'Horizontal',
    className: 'inline-flex flex-wrap gap-2',
    optionToConfig: (level, { isSelected }) => ({
      value: level,
      content: attributes =>
        h.div(
          [
            ...attributes.option,
            h.Class(
              clsx(
                'cursor-pointer rounded-full border px-3 py-1 text-sm transition select-none',
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400',
              ),
            ),
          ],
          [
            h.input([...attributes.label, h.Class('sr-only')]),
            h.span([], [level]),
          ],
        ),
    }),
    ariaLabel: 'Proficiency level',
  })

  return h.keyed('div')(
    model.id,
    [h.Class('py-6 space-y-4 first:pt-0')],
    [
      nameView,
      h.div(
        [h.Class('space-y-2')],
        [
          h.span(
            [h.Class('block text-sm font-medium text-gray-700')],
            ['Proficiency'],
          ),
          proficiencyView,
        ],
      ),
      h.div(
        [h.Class('flex justify-end')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(onRemove),
              h.Class(
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
