import { Array, Effect, Layer, Option, Schema, String } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Fieldset, Input, Textarea } from '@foldkit/ui'
import { buttonId } from '@foldkit/ui/listbox'

import {
  Comment,
  Issue,
  IssueDraft,
  IssueRevision,
  Member,
  Project,
  SavedIssue,
} from '../domain/domain'
import { draftFromIssue, revisionFromIssue } from '../domain/issue'
import {
  PriorityListbox,
  type PriorityListboxOption,
  StatusListbox,
  type StatusListboxOption,
  WorkspaceListbox,
  listboxViewInputs,
} from '../listbox'
import { RepositoryError, WorkspaceRepository } from '../services'
import { CommentComposer, CommentComposerLive } from './commentComposer'

const CONFLICT_MESSAGE =
  'This issue changed while you were editing. Your draft is preserved. Reload the issue to use the latest version.'

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

// MODEL

export const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: { expectedVersion: Schema.Number },
  Failed: { error: Schema.String },
})
export type SaveState = typeof SaveState.Type

const Model = Schema.Struct({
  issueId: Schema.String,
  baseline: IssueRevision,
  draft: IssueDraft,
  maybeIncomingRevision: Schema.Option(IssueRevision),
  saveState: SaveState,
  commentComposer: CommentComposer,
  statusListbox: StatusListbox,
  priorityListbox: PriorityListbox,
  projectListbox: WorkspaceListbox,
  assigneeListbox: WorkspaceListbox,
})
type Model = typeof Model.Type

const AssigneeChoice = defineTaggedUnion({
  Unassigned: {},
  Assigned: { memberId: Schema.String },
})
type AssigneeChoice = typeof AssigneeChoice.Type
const AssigneeChoiceJson = Schema.fromJsonString(AssigneeChoice)
type AssigneeChoiceJson = typeof AssigneeChoiceJson.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  ClickedRetrySave: {},
  ClickedReloadIssue: {},
  ClickedClose: {},
  ClickedDiscardChanges: {},
  RequestedSave: {},
  InformedOfIssueChange: { issue: Issue },
  SucceededSaveIssue: {
    savedIssue: SavedIssue,
    expectedVersion: Schema.Number,
  },
  FailedSaveIssue: {
    issueId: Schema.String,
    expectedVersion: Schema.Number,
    error: RepositoryError,
  },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Saved: { savedIssue: SavedIssue },
  AddedComment: { issueId: Schema.String, comment: Comment },
  ReceivedIssue: { issue: Issue },
  Closed: {},
})
export type OutMessage = typeof OutMessage.Type

// COMMAND

export const SaveIssue = Command.define('SaveIssue', {
  args: {
    issueId: Schema.String,
    draft: IssueDraft,
    expectedVersion: Schema.Number,
  },
  messages: [Message.SucceededSaveIssue, Message.FailedSaveIssue],
})

const ViewInput = Schema.Struct({
  issue: Issue,
  members: Schema.Array(Member),
  projects: Schema.Array(Project),
  authorId: Schema.String,
})
type ViewInput = typeof ViewInput.Type

export class IssueDetail extends Block<
  IssueDetail,
  Readonly<{ issue: Issue }>,
  ViewInput
>()('IssueDetail', {
  Model,
  Message,
  OutMessage,
  Command: [SaveIssue],
}) {}

// LIVE

export const IssueDetailLive = IssueDetail.make(
  Effect.fn(function* (issueId, { issue }) {
    const repository = yield* WorkspaceRepository

    const commentComposer = yield* new CommentComposer('commentComposer', {
      issueId: issueId,
    })
    const statusListbox = yield* new StatusListbox('statusListbox', {
      id: `issue-${issueId}-status`,
    })
    const priorityListbox = yield* new PriorityListbox('priorityListbox', {
      id: `issue-${issueId}-priority`,
    })
    const projectListbox = yield* new WorkspaceListbox('projectListbox', {
      id: `issue-${issueId}-project`,
    })
    const assigneeListbox = yield* new WorkspaceListbox('assigneeListbox', {
      id: `issue-${issueId}-assignee`,
    })

    return {
      model: {
        issueId,
        baseline: revisionFromIssue(issue),
        draft: draftFromIssue(issue),
        maybeIncomingRevision: Option.none(),
        saveState: SaveState.Idle(),
        commentComposer,
        statusListbox,
        priorityListbox,
        projectListbox,
        assigneeListbox,
      },

      update: {
        UpdatedTitle: (model, { value }) =>
          editDraftStep(draft => modifyFields(draft, { title: () => value }))(
            model,
          ),
        UpdatedDescription: (model, { value }) =>
          editDraftStep(draft =>
            modifyFields(draft, { description: () => value }),
          )(model),
        SubmittedIssueForm: saveIssueStep,
        ClickedRetrySave: saveIssueStep,
        RequestedSave: saveIssueStep,
        InformedOfIssueChange: (model, { issue }) => ({
          model: reconcileIssue(model, issue),
        }),
        ClickedReloadIssue: resetDraftStep,
        ClickedDiscardChanges: resetDraftStep,
        ClickedClose: model => ({ model, outMessage: OutMessage.Closed() }),
        SucceededSaveIssue: (model, { savedIssue, expectedVersion }) => {
          if (!isCurrentSave(model, savedIssue.issueId, expectedVersion)) {
            return { model }
          }

          const savedRevision = savedIssue.revision
          const latestKnownRevision = latestRevision(model)

          const nextBaseline =
            latestKnownRevision.version > savedRevision.version
              ? latestKnownRevision
              : savedRevision

          return {
            model: modifyFields(model, {
              baseline: () => nextBaseline,
              draft: () => nextBaseline.fields,
              maybeIncomingRevision: () => Option.none(),
              saveState: () => SaveState.Idle(),
            }),
            outMessage: OutMessage.Saved({ savedIssue }),
          }
        },
        FailedSaveIssue: (model, { issueId, expectedVersion, error }) => {
          if (!isCurrentSave(model, issueId, expectedVersion)) {
            return { model }
          }

          return RepositoryError.matchOrElse(
            error,
            {
              Conflict: ({ latestIssue }) => {
                const reconciledModel = reconcileIssue(model, latestIssue)

                return {
                  model: modifyFields(reconciledModel, {
                    saveState: () => SaveState.Failed({ error: error.message }),
                  }),
                  outMessage: OutMessage.ReceivedIssue({ issue: latestIssue }),
                }
              },
            },
            () => ({
              model: modifyFields(model, {
                saveState: () =>
                  SaveState.Failed({
                    error: error.message,
                  }),
              }),
            }),
          )
        },
        ...commentComposer.on({
          AddedComment: (model, { comment }) => ({
            model,
            outMessage: OutMessage.AddedComment({
              issueId: model.issueId,
              comment,
            }),
          }),
        }),
        ...statusListbox.on({
          Selected: (model, { value }) =>
            editDraftStep(draft =>
              modifyFields(draft, { status: () => value }),
            )(model),
        }),
        ...priorityListbox.on({
          Selected: (model, { value }) =>
            editDraftStep(draft =>
              modifyFields(draft, { priority: () => value }),
            )(model),
        }),
        ...projectListbox.on({
          Selected: (model, { value }) =>
            editDraftStep(draft =>
              modifyFields(draft, { projectId: () => value }),
            )(model),
        }),
        ...assigneeListbox.on({
          Selected: (model, { value }) =>
            Option.match(decodeAssigneeSelection(value), {
              onNone: () => ({ model }),
              onSome: maybeAssigneeId =>
                editDraftStep(draft =>
                  modifyFields(draft, {
                    maybeAssigneeId: () => maybeAssigneeId,
                  }),
                )(model),
            }),
        }),
      },

      commands: {
        SaveIssue: args =>
          repository.saveIssue(args).pipe(
            Effect.map(savedIssue =>
              Message.SucceededSaveIssue({
                savedIssue,
                expectedVersion: args.expectedVersion,
              }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedSaveIssue({
                  issueId: args.issueId,
                  expectedVersion: args.expectedVersion,
                  error,
                }),
              ),
            ),
          ),
      },

      view: (model, h, viewInput) =>
        h.section(
          [
            h.Class('w-full min-w-0 bg-slate-50/70 text-slate-700'),
            h.AriaLabel(`${viewInput.issue.identifier} details`),
          ],
          [
            h.header(
              [
                h.Class(
                  'flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6',
                ),
              ],
              [
                h.span(
                  [
                    h.Class(
                      'text-xs font-medium whitespace-nowrap text-slate-500',
                    ),
                  ],
                  [viewInput.issue.identifier],
                ),
                secondaryButton('Close issue', Message.ClickedClose(), h),
              ],
            ),
            h.div(
              [h.Class('px-5 py-6 sm:px-6')],
              [
                h.form(
                  [h.OnSubmit(Message.SubmittedIssueForm())],
                  [
                    fields(model, viewInput, h),
                    h.div(
                      [h.Class('mt-5 flex flex-col items-end gap-3')],
                      [
                        h.div(
                          [
                            h.Class(
                              'flex flex-wrap items-center justify-end gap-2',
                            ),
                          ],
                          [
                            ...(isDirty(model)
                              ? [discardChangesButton(model, h)]
                              : []),
                            submitButton(model, h),
                          ],
                        ),
                        saveFeedback(model, h),
                      ],
                    ),
                  ],
                ),
                model.commentComposer.view({
                  members: viewInput.members,
                  comments: viewInput.issue.comments,
                  authorId: viewInput.authorId,
                }),
              ],
            ),
          ],
        ),
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      CommentComposerLive,
      StatusListbox.Live,
      PriorityListbox.Live,
      WorkspaceListbox.Live,
    ),
  ),
)

// UPDATE

const encodeAssigneeSelection = (maybeMemberId: Option.Option<string>) =>
  Schema.encodeSync(AssigneeChoiceJson)(
    Option.match(maybeMemberId, {
      onNone: AssigneeChoice.Unassigned,
      onSome: memberId => AssigneeChoice.Assigned({ memberId }),
    }),
  )

const decodeAssigneeSelection = (value: string) =>
  Option.map(
    Schema.decodeOption(AssigneeChoiceJson)(value),
    AssigneeChoice.match({
      Unassigned: Option.none,
      Assigned: ({ memberId }) => Option.some(memberId),
    }),
  )

const equivalentDraft = Schema.toEquivalence(IssueDraft)

type ReconciliationState = Pick<
  Model,
  'issueId' | 'baseline' | 'draft' | 'maybeIncomingRevision' | 'saveState'
>

const isDirty = (model: ReconciliationState) =>
  !equivalentDraft(model.draft, model.baseline.fields)

const latestRevision = (model: ReconciliationState) =>
  Option.getOrElse(model.maybeIncomingRevision, () => model.baseline)

const reconcileIssue = (model: Model, issue: Issue): Model => {
  if (
    issue.id !== model.issueId ||
    issue.version <= latestRevision(model).version
  ) {
    return model
  }

  const incomingRevision = revisionFromIssue(issue)

  const isDraftDirty = isDirty(model)
  const isDraftMatch = equivalentDraft(incomingRevision.fields, model.draft)
  const isCompatible =
    equivalentDraft(incomingRevision.fields, model.baseline.fields) ||
    isDraftMatch

  if (isDraftDirty && !isCompatible) {
    return modifyFields(model, {
      maybeIncomingRevision: () => Option.some(incomingRevision),
    })
  }

  return modifyFields(model, {
    baseline: () => incomingRevision,
    draft: draft => (isDraftDirty ? draft : incomingRevision.fields),
    maybeIncomingRevision: () => Option.none(),
    saveState: saveState =>
      SaveState.guards.Saving(saveState) || (isDraftDirty && !isDraftMatch)
        ? saveState
        : SaveState.Idle(),
  })
}

export const maybeDraftSummary = (
  model: ReconciliationState,
  commentComposerModel: typeof CommentComposer.Model.Type,
) => {
  if (!isDirty(model) && String.isEmpty(commentComposerModel.body)) {
    return Option.none()
  }

  const title = String.trim(model.draft.title)

  return Option.some({
    issueId: model.issueId,
    title: String.isEmpty(title) ? model.baseline.fields.title : title,
  })
}

const isCurrentSave = (
  model: Model,
  issueId: string,
  expectedVersion: number,
) =>
  model.issueId === issueId &&
  SaveState.guards.Saving(model.saveState) &&
  model.saveState.expectedVersion === expectedVersion

const editDraftStep =
  (transformDraft: (draft: IssueDraft) => IssueDraft) => (model: Model) => ({
    model: SaveState.guards.Saving(model.saveState)
      ? model
      : modifyFields(model, { draft: transformDraft }),
  })

const resetDraftStep = (model: Model) => {
  if (SaveState.guards.Saving(model.saveState)) {
    return { model }
  }

  const nextBaseline = latestRevision(model)

  return {
    model: modifyFields(model, {
      baseline: () => nextBaseline,
      draft: () => nextBaseline.fields,
      maybeIncomingRevision: () => Option.none(),
      saveState: () => SaveState.Idle(),
    }),
  }
}

const saveIssueStep = (model: Model) => {
  if (
    SaveState.guards.Saving(model.saveState) ||
    Option.isSome(model.maybeIncomingRevision) ||
    !isDirty(model)
  ) {
    return { model }
  }

  if (String.isEmpty(String.trim(model.draft.title))) {
    return {
      model: modifyFields(model, {
        saveState: () =>
          SaveState.Failed({ error: 'Enter an issue title before saving.' }),
      }),
    }
  }

  return {
    model: modifyFields(model, {
      saveState: () =>
        SaveState.Saving({ expectedVersion: model.baseline.version }),
    }),
    commands: [
      SaveIssue({
        issueId: model.issueId,
        draft: model.draft,
        expectedVersion: model.baseline.version,
      }),
    ],
  }
}

// VIEW

const secondaryButton = (
  label: string,
  onClick: Message,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  Button.view(
    {
      onClick,
      toView: attributes =>
        h.button([...attributes.button, h.Class('button')], [label]),
    },
    h,
  )

const propertyField = (
  id: string,
  label: string,
  control: Html,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [h.Class('grid min-w-0 gap-2')],
    [
      h.label(
        [h.For(id), h.Class('text-[13px] font-medium text-slate-600')],
        [label],
      ),
      control,
    ],
  )

const saveFeedback = (model: Model, h: HtmlBuilder<Message, unknown>): Html => {
  if (
    Option.isSome(model.maybeIncomingRevision) &&
    !SaveState.guards.Saving(model.saveState)
  ) {
    return h.div(
      [
        h.Role('alert'),
        h.Class(
          'w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900',
        ),
      ],
      [
        h.p([h.Class('mb-3')], [CONFLICT_MESSAGE]),
        secondaryButton('Reload issue', Message.ClickedReloadIssue(), h),
      ],
    )
  }

  return SaveState.match(model.saveState, {
    Idle: () =>
      h.p(
        [
          h.Role('status'),
          h.Class(
            'flex items-center gap-1.5 text-xs font-medium text-slate-500',
          ),
        ],
        isDirty(model)
          ? ['Draft kept for this session']
          : [
              h.svg(
                [
                  h.AriaHidden(true),
                  h.Class('size-3.5 shrink-0 text-slate-400'),
                  h.ViewBox('0 0 24 24'),
                  h.Fill('none'),
                  h.Stroke('currentColor'),
                  h.StrokeWidth('1.75'),
                ],
                [
                  h.path([
                    h.D('m5 12 4 4L19 6'),
                    h.StrokeLinecap('round'),
                    h.StrokeLinejoin('round'),
                  ]),
                ],
              ),
              'All changes saved',
            ],
      ),
    Saving: () =>
      h.p(
        [h.Role('status'), h.Class('text-xs font-medium text-slate-500')],
        ['Saving changes…'],
      ),
    Failed: ({ error }) =>
      h.div(
        [
          h.Role('alert'),
          h.Class(
            'w-full rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700',
          ),
        ],
        [
          h.p([h.Class('mb-3')], [error]),
          secondaryButton('Retry save', Message.ClickedRetrySave(), h),
        ],
      ),
  })
}

const properties = (
  model: Model,
  viewInput: ViewInput,
  h: HtmlBuilder<Message, unknown>,
): Html => {
  const isSaving = SaveState.guards.Saving(model.saveState)

  const projectOptions = Array.map(viewInput.projects, project => ({
    value: project.id,
    label: project.name,
  }))

  const assigneeOptions = [
    { value: encodeAssigneeSelection(Option.none()), label: 'Unassigned' },
    ...Array.map(viewInput.members, member => ({
      value: encodeAssigneeSelection(Option.some(member.id)),
      label: member.name,
    })),
  ]

  return h.div(
    [h.Class('grid grid-cols-2 gap-x-4 gap-y-5')],
    [
      propertyField(
        buttonId(model.statusListbox.model.id),
        'Status',
        model.statusListbox.view(
          listboxViewInputs({
            value: model.draft.status,
            options: STATUS_OPTIONS,
            isDisabled: isSaving,
          }),
        ),
        h,
      ),
      propertyField(
        buttonId(model.priorityListbox.model.id),
        'Priority',
        model.priorityListbox.view(
          listboxViewInputs({
            value: model.draft.priority,
            options: PRIORITY_OPTIONS,
            isDisabled: isSaving,
          }),
        ),
        h,
      ),
      propertyField(
        buttonId(model.projectListbox.model.id),
        'Project',
        model.projectListbox.view(
          listboxViewInputs({
            value: model.draft.projectId,
            options: projectOptions,
            isDisabled: isSaving,
          }),
        ),
        h,
      ),
      propertyField(
        buttonId(model.assigneeListbox.model.id),
        'Assignee',
        model.assigneeListbox.view(
          listboxViewInputs({
            value: encodeAssigneeSelection(model.draft.maybeAssigneeId),
            options: assigneeOptions,
            isDisabled: isSaving,
          }),
        ),
        h,
      ),
    ],
  )
}

const titleField = (model: Model, h: HtmlBuilder<Message, unknown>): Html =>
  Input.view(
    {
      id: `issue-${model.issueId}-title`,
      value: model.draft.title,
      isDisabled: SaveState.guards.Saving(model.saveState),
      isInvalid:
        SaveState.guards.Failed(model.saveState) &&
        String.isEmpty(String.trim(model.draft.title)),
      onInput: value => Message.UpdatedTitle({ value }),
      toView: attributes =>
        h.div(
          [h.Class('grid gap-2')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('text-[13px] font-medium text-slate-600'),
              ],
              ['Issue title'],
            ),
            h.input([
              ...attributes.input,
              h.Class('text-control h-11 px-3 py-2.5 text-lg font-semibold'),
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
      id: `issue-${model.issueId}-description`,
      value: model.draft.description,
      rows: 6,
      isDisabled: SaveState.guards.Saving(model.saveState),
      onInput: value => Message.UpdatedDescription({ value }),
      toView: attributes =>
        h.div(
          [h.Class('grid gap-2')],
          [
            h.label(
              [
                ...attributes.label,
                h.Class('text-[13px] font-medium text-slate-600'),
              ],
              ['Description'],
            ),
            h.textarea([
              ...attributes.textarea,
              h.Class(
                'text-control min-h-32 resize-y px-3 py-2.5 text-sm font-normal leading-7',
              ),
            ]),
          ],
        ),
    },
    h,
  )

const fields = (
  model: Model,
  viewInput: ViewInput,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  Fieldset.view(
    {
      id: `issue-${model.issueId}-fields`,
      isDisabled: SaveState.guards.Saving(model.saveState),
      toView: attributes =>
        h.fieldset(
          [
            ...attributes.fieldset,
            h.Class('m-0 grid min-w-0 gap-5 border-0 p-0'),
          ],
          [
            titleField(model, h),
            descriptionField(model, h),
            properties(model, viewInput, h),
          ],
        ),
    },
    h,
  )

const submitButton = (model: Model, h: HtmlBuilder<Message, unknown>): Html => {
  const isDisabled =
    SaveState.guards.Saving(model.saveState) ||
    !isDirty(model) ||
    Option.isSome(model.maybeIncomingRevision)

  return Button.view(
    {
      type: 'submit',
      isDisabled,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Disabled(isDisabled),
            h.Class('button-primary'),
          ],
          ['Save changes'],
        ),
    },
    h,
  )
}

const discardChangesButton = (
  model: Model,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  Button.view(
    {
      type: 'button',
      onClick: Message.ClickedDiscardChanges(),
      isDisabled: SaveState.guards.Saving(model.saveState),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Disabled(SaveState.guards.Saving(model.saveState)),
            h.Class('button'),
          ],
          ['Discard changes'],
        ),
    },
    h,
  )
