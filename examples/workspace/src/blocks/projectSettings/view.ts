import { String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Fieldset, Input, Textarea } from '@foldkit/ui'

import {
  ProjectSettingsComposition,
  type ProjectSettingsViewBuilder,
} from './composition'
import { hasUnsavedChanges } from './draft'
import { Message } from './message'
import { SaveState } from './model'

const saveFeedback = (
  saveState: SaveState,
  h: ProjectSettingsViewBuilder,
): Html =>
  SaveState.match(saveState, {
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

const projectNameField = (
  name: string,
  isSaving: boolean,
  h: ProjectSettingsViewBuilder,
): Html =>
  Input.view(
    {
      id: 'workspace-project-name',
      value: name,
      isDisabled: isSaving,
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
  description: string,
  isSaving: boolean,
  h: ProjectSettingsViewBuilder,
): Html =>
  Textarea.view(
    {
      id: 'workspace-project-description',
      value: description,
      isDisabled: isSaving,
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

const formActions = (
  isSaving: boolean,
  isChanged: boolean,
  isValid: boolean,
  h: ProjectSettingsViewBuilder,
): Html => {
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

export const view = ProjectSettingsComposition.makeView((model, h) => {
  const isSaving = SaveState.guards.Saving(model.saveState)
  const isChanged = hasUnsavedChanges(model)
  const isValid = String.isNonEmpty(String.trim(model.draft.name))

  return h.section(
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
          saveFeedback(model.saveState, h),
          Fieldset.view(
            {
              id: 'workspace-project-fields',
              isDisabled: isSaving,
              toView: attributes =>
                h.fieldset(
                  [...attributes.fieldset, h.Class('space-y-5')],
                  [
                    h.legend(
                      [...attributes.legend, h.Class('sr-only')],
                      ['Project settings'],
                    ),
                    projectNameField(model.draft.name, isSaving, h),
                    projectDescriptionField(
                      model.draft.description,
                      isSaving,
                      h,
                    ),
                    formActions(isSaving, isChanged, isValid, h),
                  ],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
})
