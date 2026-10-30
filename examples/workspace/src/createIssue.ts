import { Array, Effect, Layer, Option, Schema, String } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Dialog, Fieldset, Input, Textarea } from '@foldkit/ui'
import type { RenderInfo } from '@foldkit/ui/dialog'
import { buttonId } from '@foldkit/ui/listbox'

import {
  Issue,
  IssueDraft,
  IssuePriority,
  IssueStatus,
  Project,
} from './domain/domain'
import {
  PriorityListbox,
  PriorityListboxOption,
  StatusListbox,
  StatusListboxOption,
  WorkspaceListbox,
  listboxViewInputs,
} from './listbox'
import { WorkspaceRepository } from './services'

const FIELD_CLASS = 'grid gap-2'
const LABEL_CLASS = 'text-[13px] font-medium text-slate-600'

const STATUS_OPTIONS: ReadonlyArray<StatusListboxOption> = [
  { value: 'Backlog', label: 'Backlog' },
  { value: 'Todo', label: 'Todo' },
  { value: 'InProgress', label: 'In progress' },
  { value: 'Done', label: 'Done' },
]
const PRIORITY_OPTIONS: ReadonlyArray<PriorityListboxOption> = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
]

export const CreateState = defineTaggedUnion({
  Idle: {},
  Creating: {},
  Failed: { error: Schema.String },
})
type CreateState = typeof CreateState.Type

const Model = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  projectId: Schema.String,
  status: IssueStatus,
  priority: IssuePriority,
  createState: CreateState,
  dialog: Dialog.Dialog,
  projectListbox: WorkspaceListbox,
  statusListbox: StatusListbox,
  priorityListbox: PriorityListbox,
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  RequestedOpen: {
    projectId: Schema.String,
    status: Schema.optionalKey(IssueStatus),
  },
  RequestedClose: {},
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  SucceededCreateNewIssue: { issue: Issue },
  FailedCreateNewIssue: { error: Schema.String },
})
type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Created: { issue: Issue },
})

export const CreateNewIssue = Command.define('CreateNewIssue', {
  args: { draft: IssueDraft },
  messages: [Message.SucceededCreateNewIssue, Message.FailedCreateNewIssue],
})

const ViewInput = Schema.Struct({ projects: Schema.Array(Project) })
type ViewInput = typeof ViewInput.Type

export class CreateIssue extends Block<CreateIssue, void, ViewInput>()(
  'CreateIssue',
  { Model, Message, OutMessage, Command: [CreateNewIssue] },
) {}

type DraftState = Readonly<{ createState: CreateState }>

const isDraftEditable = (model: DraftState) =>
  !CreateState.guards.Creating(model.createState)

export const editDraftStep =
  <Model extends DraftState>(transformModel: (model: Model) => Model) =>
  (model: Model): Readonly<{ model: Model }> => {
    if (!isDraftEditable(model)) {
      return { model }
    }

    return { model: transformModel(model) }
  }

const openDialog = (model: Model) =>
  model.dialog.send(Dialog.Dialog.Message.RequestedOpen())

const closeDialog = (model: Model) =>
  model.dialog.send(Dialog.Dialog.Message.RequestedClose())

const createIssue = (model: Model) => {
  if (CreateState.guards.Creating(model.createState)) {
    return { model }
  }

  const title = String.trim(model.title)

  if (String.isEmpty(title)) {
    return {
      model: modifyFields(model, {
        createState: () =>
          CreateState.Failed({
            error: 'Enter an issue title before creating it.',
          }),
      }),
    }
  }

  const draft = IssueDraft.make({
    title,
    description: model.description,
    projectId: model.projectId,
    status: model.status,
    priority: model.priority,
    maybeAssigneeId: Option.none(),
    labelIds: [],
  })

  return {
    model: modifyFields(model, {
      createState: () => CreateState.Creating(),
    }),
    commands: [CreateNewIssue({ draft })],
  }
}

const listboxField = (
  id: string,
  label: string,
  control: Html,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label([h.For(buttonId(id)), h.Class(LABEL_CLASS)], [label]),
      h.div([], [control]),
    ],
  )

const titleField = (
  model: Model,
  initialFocus: RenderInfo['initialFocus'],
  h: HtmlBuilder<Message, unknown>,
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
  model: Model,
  h: HtmlBuilder<Message, unknown>,
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
  model: Model,
  viewInput: ViewInput,
  initialFocus: RenderInfo['initialFocus'],
  h: HtmlBuilder<Message, unknown>,
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
              model.projectListbox.model.id,
              'Project',
              model.projectListbox.view(
                listboxViewInputs({
                  value: model.projectId,
                  options: Array.map(viewInput.projects, project => ({
                    value: project.id,
                    label: project.name,
                  })),
                  isDisabled: isCreating,
                }),
              ),
              h,
            ),
            h.div(
              [h.Class('grid gap-4 sm:grid-cols-2')],
              [
                listboxField(
                  model.statusListbox.model.id,
                  'Status',
                  model.statusListbox.view(
                    listboxViewInputs({
                      value: model.status,
                      options: STATUS_OPTIONS,
                      isDisabled: isCreating,
                    }),
                  ),
                  h,
                ),
                listboxField(
                  model.priorityListbox.model.id,
                  'Priority',
                  model.priorityListbox.view(
                    listboxViewInputs({
                      value: model.priority,
                      options: PRIORITY_OPTIONS,
                      isDisabled: isCreating,
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
  model: Model,
  h: HtmlBuilder<Message, unknown>,
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

const submitButton = (model: Model, h: HtmlBuilder<Message, unknown>): Html => {
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

export const CreateIssueLive = CreateIssue.make(
  Effect.fn(function* () {
    const repository = yield* WorkspaceRepository
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'workspace-create-issue-dialog',
    })
    const projectListbox = yield* new WorkspaceListbox('projectListbox', {
      id: 'create-issue-project',
    })
    const statusListbox = yield* new StatusListbox('statusListbox', {
      id: 'create-issue-status',
    })
    const priorityListbox = yield* new PriorityListbox('priorityListbox', {
      id: 'create-issue-priority',
    })

    return {
      model: {
        title: '',
        description: '',
        projectId: 'platform',
        status: 'Todo',
        priority: 'Medium',
        createState: CreateState.Idle(),
        dialog,
        projectListbox,
        statusListbox,
        priorityListbox,
      },

      update: {
        RequestedOpen: (model, { projectId, status = 'Todo' }) => {
          if (CreateState.guards.Creating(model.createState)) {
            return { model, messages: [openDialog(model)] }
          }

          return {
            model: modifyFields(model, {
              title: () => '',
              description: () => '',
              projectId: () => projectId,
              status: () => status,
              priority: () => 'Medium',
              createState: () => CreateState.Idle(),
            }),
            messages: [openDialog(model)],
          }
        },
        RequestedClose: model => ({ model, messages: [closeDialog(model)] }),
        UpdatedTitle: (model, { value }) =>
          editDraftStep((draft: Model) =>
            modifyFields(draft, { title: () => value }),
          )(model),
        UpdatedDescription: (model, { value }) =>
          editDraftStep((draft: Model) =>
            modifyFields(draft, { description: () => value }),
          )(model),
        SubmittedIssueForm: createIssue,
        SucceededCreateNewIssue: (model, { issue }) => ({
          model: modifyFields(model, { createState: () => CreateState.Idle() }),
          messages: [closeDialog(model)],
          outMessage: OutMessage.Created({ issue }),
        }),
        FailedCreateNewIssue: (model, { error }) => ({
          model: modifyFields(model, {
            createState: () => CreateState.Failed({ error }),
          }),
          messages: [openDialog(model)],
        }),
        ...projectListbox.on({
          Selected: (model, { value }) =>
            editDraftStep((draft: Model) =>
              modifyFields(draft, { projectId: () => value }),
            )(model),
        }),
        ...statusListbox.on({
          Selected: (model, { value }) =>
            Schema.is(IssueStatus)(value)
              ? editDraftStep((draft: Model) =>
                  modifyFields(draft, { status: () => value }),
                )(model)
              : { model },
        }),
        ...priorityListbox.on({
          Selected: (model, { value }) =>
            Schema.is(IssuePriority)(value)
              ? editDraftStep((draft: Model) =>
                  modifyFields(draft, { priority: () => value }),
                )(model)
              : { model },
        }),
      },

      commands: {
        CreateNewIssue: ({ draft }) =>
          repository.createIssue(draft).pipe(
            Effect.map(issue => Message.SucceededCreateNewIssue({ issue })),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedCreateNewIssue({ error: error.message }),
              ),
            ),
          ),
      },

      view: (model, h, viewInput) =>
        model.dialog.view({
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
                            fields(model, viewInput, initialFocus, h),
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
                                    CreateState.guards.Creating(
                                      model.createState,
                                    )
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
        }),
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      Dialog.DialogLive,
      WorkspaceListbox.Live,
      StatusListbox.Live,
      PriorityListbox.Live,
    ),
  ),
)
