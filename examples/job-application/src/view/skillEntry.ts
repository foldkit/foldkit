import clsx from 'clsx'
import { Option } from 'effect'
import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { ProficiencyLevel } from '../domain'
import { Skills } from '../step'
import { inputField } from './field'

export const skillEntryView = Submodel.defineView<
  Skills.Entry.Model,
  Skills.Entry.Message
>((model, h): Html => {
  const nameView = inputField(
    {
      id: `${model.id}-name`,
      label: 'Skill',
      field: model.name,
      onInput: value => Skills.Entry.UpdatedName({ value }),
      placeholder: 'e.g. TypeScript, React, Effect-TS',
    },
    h,
  )

  const proficiencyView = h.submodel({
    slotId: model.proficiencyRadioGroup.id,
    model: model.proficiencyRadioGroup,
    view: Skills.Entry.ProficiencyRadioGroup.view,
    viewInputs: {
      selectedValue: Option.some(model.proficiency),
      options: ProficiencyLevel.all,
      orientation: 'Horizontal',
      ariaLabel: 'Proficiency level',
      toView: attributes =>
        h.div(
          [...attributes.group, h.Class('inline-flex flex-wrap gap-2')],
          attributes.options.map(option =>
            h.div(
              [
                ...option.option,
                h.Class(
                  clsx(
                    'cursor-pointer rounded-full border px-3 py-1 text-sm transition select-none',
                    option.isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400',
                  ),
                ),
              ],
              [
                h.input([...option.label, h.Class('sr-only')]),
                h.span([], [option.value]),
              ],
            ),
          ),
        ),
    },
    toParentMessage: message =>
      Skills.Entry.GotProficiencyRadioGroupMessage({ message }),
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
          Button.view(
            {
              onClick: Skills.Entry.ClickedRemoveSelf(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
                    ),
                  ],
                  ['Remove skill'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
})
