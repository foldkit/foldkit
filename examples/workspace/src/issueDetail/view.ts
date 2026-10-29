import { Array, Option, Schema, String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Fieldset, Input, Textarea } from '@foldkit/ui'
import { buttonId } from '@foldkit/ui/listbox'

import { Issue, Member, Project } from '../domain'
import {
  PriorityListboxOption,
  StatusListboxOption,
  listboxViewInputs,
} from '../listbox'
import {
  AssigneeListboxBinding,
  CommentComposerBinding,
  IssueDetailComposition,
  type IssueDetailViewBuilder,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { CONFLICT_MESSAGE, isDirty } from './draft'
import { encodeAssigneeSelection } from './field'
import { Message } from './message'
import { type Model, SaveState } from './model'

const ViewInputs = Schema.Struct({
  issue: Issue,
  members: Schema.Array(Member),
  projects: Schema.Array(Project),
  authorId: Schema.String,
})
type ViewInputs = typeof ViewInputs.Type
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

const secondaryButton = (
  label: string,
  onClick: Message,
  h: IssueDetailViewBuilder,
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
  h: IssueDetailViewBuilder,
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

const saveFeedback = (model: Model, h: IssueDetailViewBuilder): Html => {
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
  viewInputs: ViewInputs,
  h: IssueDetailViewBuilder,
): Html => {
  const isSaving = SaveState.guards.Saving(model.saveState)

  const projectOptions = Array.map(viewInputs.projects, project => ({
    value: project.id,
    label: project.name,
  }))

  const assigneeOptions = [
    { value: encodeAssigneeSelection(Option.none()), label: 'Unassigned' },
    ...Array.map(viewInputs.members, member => ({
      value: encodeAssigneeSelection(Option.some(member.id)),
      label: member.name,
    })),
  ]

  return h.div(
    [h.Class('grid grid-cols-2 gap-x-4 gap-y-5')],
    [
      propertyField(
        buttonId(model.statusListbox.id),
        'Status',
        h.block(
          StatusListboxBinding.embedView({
            slotId: model.statusListbox.id,
            model: model.statusListbox,
            viewInputs: listboxViewInputs({
              value: model.draft.status,
              options: STATUS_OPTIONS,
              isDisabled: isSaving,
            }),
          }),
        ),
        h,
      ),
      propertyField(
        buttonId(model.priorityListbox.id),
        'Priority',
        h.block(
          PriorityListboxBinding.embedView({
            slotId: model.priorityListbox.id,
            model: model.priorityListbox,
            viewInputs: listboxViewInputs({
              value: model.draft.priority,
              options: PRIORITY_OPTIONS,
              isDisabled: isSaving,
            }),
          }),
        ),
        h,
      ),
      propertyField(
        buttonId(model.projectListbox.id),
        'Project',
        h.block(
          ProjectListboxBinding.embedView({
            slotId: model.projectListbox.id,
            model: model.projectListbox,
            viewInputs: listboxViewInputs({
              value: model.draft.projectId,
              options: projectOptions,
              isDisabled: isSaving,
            }),
          }),
        ),
        h,
      ),
      propertyField(
        buttonId(model.assigneeListbox.id),
        'Assignee',
        h.block(
          AssigneeListboxBinding.embedView({
            slotId: model.assigneeListbox.id,
            model: model.assigneeListbox,
            viewInputs: listboxViewInputs({
              value: encodeAssigneeSelection(model.draft.maybeAssigneeId),
              options: assigneeOptions,
              isDisabled: isSaving,
            }),
          }),
        ),
        h,
      ),
    ],
  )
}

const titleField = (model: Model, h: IssueDetailViewBuilder): Html =>
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

const descriptionField = (model: Model, h: IssueDetailViewBuilder): Html =>
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
  viewInputs: ViewInputs,
  h: IssueDetailViewBuilder,
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
            properties(model, viewInputs, h),
          ],
        ),
    },
    h,
  )

const submitButton = (model: Model, h: IssueDetailViewBuilder): Html => {
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

export const view = IssueDetailComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) =>
    h.section(
      [
        h.Class('w-full min-w-0 bg-slate-50/70 text-slate-700'),
        h.AriaLabel(`${viewInputs.issue.identifier} details`),
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
              [h.Class('text-xs font-medium whitespace-nowrap text-slate-500')],
              [viewInputs.issue.identifier],
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
                fields(model, viewInputs, h),
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
                          ? [
                              Button.view(
                                {
                                  type: 'button',
                                  onClick: Message.ClickedDiscardChanges(),
                                  isDisabled: SaveState.guards.Saving(
                                    model.saveState,
                                  ),
                                  toView: attributes =>
                                    h.button(
                                      [
                                        ...attributes.button,
                                        h.Disabled(
                                          SaveState.guards.Saving(
                                            model.saveState,
                                          ),
                                        ),
                                        h.Class('button'),
                                      ],
                                      ['Discard changes'],
                                    ),
                                },
                                h,
                              ),
                            ]
                          : []),
                        submitButton(model, h),
                      ],
                    ),
                    saveFeedback(model, h),
                  ],
                ),
              ],
            ),
            h.block(
              CommentComposerBinding.embedView({
                slotId: 'comment-composer',
                model: model.commentComposer,
                viewInputs: {
                  members: viewInputs.members,
                  comments: viewInputs.issue.comments,
                  authorId: viewInputs.authorId,
                },
              }),
            ),
          ],
        ),
      ],
    ),
)
