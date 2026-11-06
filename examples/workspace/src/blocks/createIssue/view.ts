import { Array, String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Dialog, Fieldset, Input, Listbox, Textarea } from '@foldkit/ui'

import { Issue } from '../../domain'
import {
  PriorityListboxOption,
  StatusListboxOption,
  toListboxViewInputs,
} from '../../listbox'
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
import type { ViewInputs } from './viewInputs'

const FIELD_CLASS = 'grid gap-2'
const LABEL_CLASS = 'text-[13px] font-medium text-slate-600'

const STATUS_OPTIONS: ReadonlyArray<StatusListboxOption> = Array.map(
  Issue.Status.literals,
  status => ({ value: status, label: Issue.statusLabel(status) }),
)
const PRIORITY_OPTIONS: ReadonlyArray<PriorityListboxOption> = [
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
      h.label([h.For(Listbox.buttonId(id)), h.Class(LABEL_CLASS)], [label]),
      h.div([], [control]),
    ],
  )

const titleField = (
  title: string,
  createState: CreateState,
  initialFocus: Dialog.RenderInfo['initialFocus'],
  h: CreateIssueViewBuilder,
): Html =>
  Input.view(
    {
      id: 'create-issue-title',
      value: title,
      isDisabled: CreateState.guards.Creating(createState),
      isInvalid:
        CreateState.guards.Failed(createState) &&
        String.isEmpty(String.trim(title)),
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
  description: string,
  isCreating: boolean,
  h: CreateIssueViewBuilder,
): Html =>
  Textarea.view(
    {
      id: 'create-issue-description',
      value: description,
      rows: 4,
      isDisabled: isCreating,
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
  model: Model,
  viewInputs: ViewInputs,
  initialFocus: Dialog.RenderInfo['initialFocus'],
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
            titleField(model.title, model.createState, initialFocus, h),
            descriptionField(model.description, isCreating, h),
            listboxField(
              model.projectListbox.id,
              'Project',
              h.block(
                ProjectListboxBinding.embedView({
                  slotId: model.projectListbox.id,
                  model: model.projectListbox,
                  viewInputs: toListboxViewInputs({
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
                      viewInputs: toListboxViewInputs({
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
                      viewInputs: toListboxViewInputs({
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
  createState: CreateState,
  h: CreateIssueViewBuilder,
): ReadonlyArray<Html> =>
  CreateState.match(createState, {
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
  createState: CreateState,
  h: CreateIssueViewBuilder,
): Html => {
  const isCreating = CreateState.guards.Creating(createState)

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

export const view = CreateIssueComposition.makeView.withInputs(
  (model, viewInputs, h) =>
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
                            ...feedback(model.createState, h),
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
                                    CreateState.guards.Creating(
                                      model.createState,
                                    )
                                      ? 'Close'
                                      : 'Cancel',
                                  ],
                                ),
                                submitButton(model.createState, h),
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
