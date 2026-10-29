import { String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Fieldset, Input, Textarea } from '@foldkit/ui'

import {
  ProjectSettingsComposition,
  type ProjectSettingsViewBuilder,
} from './composition'
import { isDirty } from './draft'
import { Message } from './message'
import { type Model, SaveState } from './model'

const saveFeedback = (model: Model, h: ProjectSettingsViewBuilder): Html =>
  SaveState.match(model.saveState, {
    Idle: () => h.empty,
    Saving: () =>
      h.p([h.Role('status'), h.Class('sr-only')], ['Saving project…']),
    Saved: () =>
      h.p(
        [h.Role('status'), h.Class('mb-5 text-sm text-emerald-700')],
        ['Project saved'],
      ),
    Failed: ({ error }) =>
      h.div(
        [
          h.Role('alert'),
          h.Class(
            'mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700',
          ),
        ],
        [
          h.p([], [error]),
          Button.view(
            {
              type: 'button',
              onClick: Message.ClickedRetrySave(),
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class('button')],
                  ['Retry changes'],
                ),
            },
            h,
          ),
        ],
      ),
  })

const projectNameField = (model: Model, h: ProjectSettingsViewBuilder): Html =>
  Input.view(
    {
      id: 'workspace-project-name',
      value: model.draft.name,
      isDisabled: SaveState.guards.Saving(model.saveState),
      onInput: value => Message.UpdatedProjectName({ value }),
      toView: attributes =>
        h.div(
          [h.Class('space-y-2')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('block text-[13px] font-medium text-slate-600'),
              ],
              ['Project name'],
            ),
            h.input([
              ...attributes.input,
              h.Required(true),
              h.AriaRequired(true),
              h.Pattern('.*\\S.*'),
              h.Class('input-control'),
            ]),
          ],
        ),
    },
    h,
  )

const projectDescriptionField = (
  model: Model,
  h: ProjectSettingsViewBuilder,
): Html =>
  Textarea.view(
    {
      id: 'workspace-project-description',
      value: model.draft.description,
      isDisabled: SaveState.guards.Saving(model.saveState),
      rows: 4,
      onInput: value => Message.UpdatedProjectDescription({ value }),
      toView: attributes =>
        h.div(
          [h.Class('space-y-2')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('block text-[13px] font-medium text-slate-600'),
              ],
              ['Project description'],
            ),
            h.textarea([
              ...attributes.textarea,
              h.Class(
                'text-control min-h-11 resize-y px-3 py-2 text-sm leading-6',
              ),
            ]),
          ],
        ),
    },
    h,
  )

const formActions = (model: Model, h: ProjectSettingsViewBuilder): Html => {
  const isSaving = SaveState.guards.Saving(model.saveState)
  const isChanged = isDirty(model)
  const isValid = String.isNonEmpty(String.trim(model.draft.name))

  return h.div(
    [
      h.Class(
        'flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5',
      ),
    ],
    [
      Button.view(
        {
          type: 'button',
          isDisabled: isSaving || !isChanged,
          onClick: Message.ClickedDiscardChanges(),
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class('button')],
              ['Discard changes'],
            ),
        },
        h,
      ),
      Button.view(
        {
          type: 'submit',
          isDisabled: isSaving || !isValid || !isChanged,
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class('button-primary')],
              [isSaving ? 'Saving…' : 'Save changes'],
            ),
        },
        h,
      ),
    ],
  )
}

export const view = ProjectSettingsComposition.makeView((model, h) =>
  h.section(
    [h.Class('max-w-2xl p-5 lg:p-8')],
    [
      h.form(
        [
          h.OnSubmit(Message.SubmittedProjectSettings()),
          h.Class('rounded-xl border border-slate-200 bg-white p-6'),
        ],
        [
          h.h2(
            [h.Class('mb-5 text-base font-semibold text-slate-800')],
            ['Project details'],
          ),
          saveFeedback(model, h),
          Fieldset.view(
            {
              id: 'workspace-project-fields',
              isDisabled: SaveState.guards.Saving(model.saveState),
              toView: attributes =>
                h.fieldset(
                  [...attributes.fieldset, h.Class('space-y-5')],
                  [
                    h.legend(
                      [...attributes.legend, h.Class('sr-only')],
                      ['Project settings'],
                    ),
                    projectNameField(model, h),
                    projectDescriptionField(model, h),
                    formActions(model, h),
                  ],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  ),
)
