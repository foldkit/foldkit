import { Array, Schema, String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Fieldset, Input, Textarea } from '@foldkit/ui'
import type { RenderInfo } from '@foldkit/ui/dialog'
import { buttonId } from '@foldkit/ui/listbox'

import { Project } from '../domain'
import {
  PriorityListboxOption,
  StatusListboxOption,
  listboxViewInputs,
} from '../listbox'
import {
  CreateIssueComposition,
  type CreateIssueViewBuilder,
  DialogBinding,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { isDraftEditable } from './draft'
import { Message } from './message'
import { CreateState, type Model } from './model'

const FIELD_CLASS = 'grid gap-2'
const LABEL_CLASS = 'text-[13px] font-medium text-slate-600'

const ViewInputs = Schema.Struct({ projects: Schema.Array(Project) })
const STATUS_OPTIONS: ReadonlyArray<typeof StatusListboxOption.Type> = [
  { value: 'Backlog', label: 'Backlog' },
  { value: 'Todo', label: 'Todo' },
  { value: 'InProgress', label: 'In progress' },
  { value: 'Done', label: 'Done' },
]
const PRIORITY_OPTIONS: ReadonlyArray<typeof PriorityListboxOption.Type> = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
]

const listboxField = (
  id: string,
  label: string,
  control: Html,
  h: CreateIssueViewBuilder,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label([h.For(buttonId(id)), h.Class(LABEL_CLASS)], [label]),
      h.div([], [control]),
    ],
  )

const titleField = (
  model: typeof Model.Type,
  initialFocus: RenderInfo['initialFocus'],
  h: CreateIssueViewBuilder,
): Html =>
  Input.view(
    {
      id: 'create-issue-title',
      value: model.title,
      isDisabled: !isDraftEditable(model),
      isInvalid:
        CreateState.guards.Failed(model.createState) &&
        String.isEmpty(String.trim(model.title)),
      onInput: value => Message.UpdatedTitle({ value }),
      toView: attributes =>
        h.div(
          [h.Class(FIELD_CLASS)],
          [
            h.label([...attributes.label, h.Class(LABEL_CLASS)], ['Title']),
            h.input([
              ...attributes.input,
              ...initialFocus,
              h.Class('input-control'),
              h.Required(true),
              h.AriaRequired(true),
            ]),
          ],
        ),
    },
    h,
  )

const descriptionField = (
  model: typeof Model.Type,
  h: CreateIssueViewBuilder,
): Html =>
  Textarea.view(
    {
      id: 'create-issue-description',
      value: model.description,
      rows: 4,
      isDisabled: !isDraftEditable(model),
      onInput: value => Message.UpdatedDescription({ value }),
      toView: attributes =>
        h.div(
          [h.Class(FIELD_CLASS)],
          [
            h.label(
              [...attributes.label, h.Class(LABEL_CLASS)],
              ['Description'],
            ),
            h.textarea([
              ...attributes.textarea,
              h.Class('text-control min-h-24 resize-y px-3 py-2 leading-6'),
            ]),
          ],
        ),
    },
    h,
  )

const fields = (
  model: typeof Model.Type,
  viewInputs: typeof ViewInputs.Type,
  initialFocus: RenderInfo['initialFocus'],
  h: CreateIssueViewBuilder,
): Html => {
  const isCreating = !isDraftEditable(model)

  return Fieldset.view(
    {
      id: 'create-issue-fields',
      isDisabled: isCreating,
      toView: attributes =>
        h.fieldset(
          [
            ...attributes.fieldset,
            h.Class('m-0 grid min-w-0 gap-5 border-0 p-0'),
          ],
          [
            titleField(model, initialFocus, h),
            descriptionField(model, h),
            listboxField(
              model.projectListbox.id,
              'Project',
              h.block(
                ProjectListboxBinding.embedView({
                  slotId: model.projectListbox.id,
                  model: model.projectListbox,
                  viewInputs: listboxViewInputs({
                    value: model.projectId,
                    options: Array.map(viewInputs.projects, project => ({
                      value: project.id,
                      label: project.name,
                    })),
                    isDisabled: isCreating,
                  }),
                }),
              ),
              h,
            ),
            h.div(
              [h.Class('grid gap-4 sm:grid-cols-2')],
              [
                listboxField(
                  model.statusListbox.id,
                  'Status',
                  h.block(
                    StatusListboxBinding.embedView({
                      slotId: model.statusListbox.id,
                      model: model.statusListbox,
                      viewInputs: listboxViewInputs({
                        value: model.status,
                        options: STATUS_OPTIONS,
                        isDisabled: isCreating,
                      }),
                    }),
                  ),
                  h,
                ),
                listboxField(
                  model.priorityListbox.id,
                  'Priority',
                  h.block(
                    PriorityListboxBinding.embedView({
                      slotId: model.priorityListbox.id,
                      model: model.priorityListbox,
                      viewInputs: listboxViewInputs({
                        value: model.priority,
                        options: PRIORITY_OPTIONS,
                        isDisabled: isCreating,
                      }),
                    }),
                  ),
                  h,
                ),
              ],
            ),
          ],
        ),
    },
    h,
  )
}

const feedback = (
  model: typeof Model.Type,
  h: CreateIssueViewBuilder,
): ReadonlyArray<Html> =>
  CreateState.match(model.createState, {
    Idle: () => [],
    Creating: () => [
      h.p([h.Role('status'), h.Class('sr-only')], ['Creating issue…']),
    ],
    Failed: ({ error }) => [
      h.p(
        [
          h.Role('alert'),
          h.Class(
            'mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700',
          ),
        ],
        [error],
      ),
    ],
  })

const submitButton = (
  model: typeof Model.Type,
  h: CreateIssueViewBuilder,
): Html => {
  const isCreating = CreateState.guards.Creating(model.createState)

  return Button.view(
    {
      type: 'submit',
      isDisabled: isCreating,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Disabled(isCreating),
            h.Class('button-primary'),
          ],
          [isCreating ? 'Creating…' : 'Create issue'],
        ),
    },
    h,
  )
}

export const view = CreateIssueComposition.makeView.withInputs<
  typeof ViewInputs.Type
>((model, viewInputs, h) =>
  h.block(
    DialogBinding.embedView({
      slotId: model.dialog.id,
      model: model.dialog,
      viewInputs: {
        toView: ({
          dialog,
          backdrop,
          panel,
          title,
          closeButton,
          initialFocus,
          isVisible,
        }) =>
          h.dialog(
            [
              ...dialog,
              h.Class(
                'overflow-y-auto open:flex open:items-start open:justify-center',
              ),
            ],
            isVisible
              ? [
                  h.div([
                    ...backdrop,
                    h.Class('fixed inset-0 bg-slate-950/35 backdrop-blur-xs'),
                  ]),
                  h.div(
                    [
                      ...panel,
                      h.Class(
                        'dialog-surface relative z-10 my-8 w-[calc(100vw-2rem)] max-w-lg p-6 text-sm font-medium sm:my-[10vh] sm:p-8',
                      ),
                    ],
                    [
                      h.h2(
                        [
                          ...title,
                          h.Class(
                            'mb-6 text-xl font-semibold tracking-tight text-slate-800',
                          ),
                        ],
                        ['Create issue'],
                      ),
                      h.form(
                        [h.OnSubmit(Message.SubmittedIssueForm())],
                        [
                          fields(model, viewInputs, initialFocus, h),
                          ...feedback(model, h),
                          h.div(
                            [
                              h.Class(
                                'mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5',
                              ),
                            ],
                            [
                              h.button(
                                [...closeButton, h.Class('button')],
                                [
                                  CreateState.guards.Creating(model.createState)
                                    ? 'Close'
                                    : 'Cancel',
                                ],
                              ),
                              submitButton(model, h),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ]
              : [],
          ),
      },
    }),
  ),
)
