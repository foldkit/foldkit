import clsx from 'clsx'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  Field,
  NotValidated,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, RadioGroup } from '@foldkit/ui'

import * as FieldView from '../../domain/field'
import * as ProficiencyLevel from '../../domain/proficiencyLevel'
import { revealFieldErrors } from '../../domain/validation'

const ProficiencyRadioGroup =
  RadioGroup.makeBlock<ProficiencyLevel.ProficiencyLevel>()

const Model = Schema.Struct({
  id: Schema.String,
  name: Field(Schema.String),
  proficiency: ProficiencyLevel.ProficiencyLevel,
  proficiencyRadioGroup: ProficiencyRadioGroup,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  RequestedRevealErrors: {},
  ClickedRemoveSelf: {},
})

const OutMessage = defineMessageUnion({
  Removed: {},
})

export class SkillsEntry extends Block<SkillsEntry>()('SkillsEntry', {
  Model,
  Message,
  OutMessage,
}) {}

const nameRules = makeRules({
  required: 'Skill name is required',
})

const validateName = validate(nameRules)

export const skillsEntryHasErrors = (entry: Model): boolean =>
  anyInvalid([entry.name])

export const isSkillsEntryComplete = (entry: Model): boolean =>
  allValid([[entry.name, nameRules]])

export const SkillsEntryLive = SkillsEntry.make(
  Effect.fn(function* (entryId) {
    const proficiencyRadioGroup = yield* new ProficiencyRadioGroup(
      'proficiencyRadioGroup',
      { id: `${entryId}-proficiency` },
    )

    return {
      model: {
        id: entryId,
        name: NotValidated({ value: '' }),
        proficiency: 'Intermediate',
        proficiencyRadioGroup,
      },

      update: {
        UpdatedName: (model, { value }) => ({
          model: modifyFields(model, { name: () => validateName(value) }),
        }),

        RequestedRevealErrors: model => ({
          model: modifyFields(model, { name: revealFieldErrors(nameRules) }),
        }),

        ClickedRemoveSelf: model => ({
          model,
          outMessage: OutMessage.Removed(),
        }),

        ...proficiencyRadioGroup.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { proficiency: () => value }),
          }),
        }),
      },

      view: (model, h) => {
        const nameView = FieldView.input(
          {
            id: `${model.id}-name`,
            label: 'Skill',
            field: model.name,
            onInput: value => Message.UpdatedName({ value }),
            placeholder: 'e.g. TypeScript, React, Effect-TS',
          },
          h,
        )

        const proficiencyView = model.proficiencyRadioGroup.view({
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
                    onClick: Message.ClickedRemoveSelf(),
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
      },
    }
  }),
).pipe(Layer.provide(ProficiencyRadioGroup.Live))
