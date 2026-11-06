import { Array, Option, String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Fieldset, Input, Listbox, Textarea } from '@foldkit/ui'

import { Issue } from '../../domain'
import {
  PriorityListboxOption,
  StatusListboxOption,
  toListboxViewInputs,
} from '../../listbox'
import { encodeAssigneeSelection } from './assigneeSelection'
import {
  AssigneeListboxBinding,
  CommentComposerBinding,
  IssueDetailComposition,
  type IssueDetailViewBuilder,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import {
  CONFLICT_MESSAGE,
  draftForDisplay,
  hasConflict,
  hasUnsavedIssueChanges,
} from './draft'
import { Message } from './message'
import { type Model, SaveState } from './model'
import type { ViewInputs } from './viewInputs'

const STATUS_OPTIONS: ReadonlyArray<StatusListboxOption> = Array.map(
  Issue.Status.literals,
  status => ({ value: status, label: Issue.statusLabel(status) }),
)
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

const saveFeedback = (
  model: Model,
  issue: Issue.Issue,
  h: IssueDetailViewBuilder,
): Html => {
  if (hasConflict(model, issue) && !SaveState.guards.Saving(model.saveState)) {
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
        hasUnsavedIssueChanges(model, issue)
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
  draft: Issue.Draft,
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
        Listbox.buttonId(model.statusListbox.id),
        'Status',
        h.block(
          StatusListboxBinding.embedView({
            slotId: model.statusListbox.id,
            model: model.statusListbox,
            viewInputs: toListboxViewInputs({
              value: draft.status,
              options: STATUS_OPTIONS,
              isDisabled: isSaving,
            }),
          }),
        ),
        h,
      ),
      propertyField(
        Listbox.buttonId(model.priorityListbox.id),
        'Priority',
        h.block(
          PriorityListboxBinding.embedView({
            slotId: model.priorityListbox.id,
            model: model.priorityListbox,
            viewInputs: toListboxViewInputs({
              value: draft.priority,
              options: PRIORITY_OPTIONS,
              isDisabled: isSaving,
            }),
          }),
        ),
        h,
      ),
      propertyField(
        Listbox.buttonId(model.projectListbox.id),
        'Project',
        h.block(
          ProjectListboxBinding.embedView({
            slotId: model.projectListbox.id,
            model: model.projectListbox,
            viewInputs: toListboxViewInputs({
              value: draft.projectId,
              options: projectOptions,
              isDisabled: isSaving,
            }),
          }),
        ),
        h,
      ),
      propertyField(
        Listbox.buttonId(model.assigneeListbox.id),
        'Assignee',
        h.block(
          AssigneeListboxBinding.embedView({
            slotId: model.assigneeListbox.id,
            model: model.assigneeListbox,
            viewInputs: toListboxViewInputs({
              value: encodeAssigneeSelection(draft.maybeAssigneeId),
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

const titleField = (
  issueId: string,
  saveState: SaveState,
  draft: Issue.Draft,
  h: IssueDetailViewBuilder,
): Html =>
  Input.view(
    {
      id: `issue-${issueId}-title`,
      value: draft.title,
      isDisabled: SaveState.guards.Saving(saveState),
      isInvalid:
        SaveState.guards.Failed(saveState) &&
        String.isEmpty(String.trim(draft.title)),
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
  issueId: string,
  isSaving: boolean,
  draft: Issue.Draft,
  h: IssueDetailViewBuilder,
): Html =>
  Textarea.view(
    {
      id: `issue-${issueId}-description`,
      value: draft.description,
      rows: 6,
      isDisabled: isSaving,
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
): Html => {
  const draft = draftForDisplay(model, viewInputs.issue)

  return Fieldset.view(
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
            titleField(model.issueId, model.saveState, draft, h),
            descriptionField(
              model.issueId,
              SaveState.guards.Saving(model.saveState),
              draft,
              h,
            ),
            properties(model, viewInputs, draft, h),
          ],
        ),
    },
    h,
  )
}

const submitButton = (isDisabled: boolean, h: IssueDetailViewBuilder): Html =>
  Button.view(
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

export const view = IssueDetailComposition.makeView.withInputs(
  (model, viewInputs, h) => {
    const isSaving = SaveState.guards.Saving(model.saveState)
    const hasUnsavedChanges = hasUnsavedIssueChanges(model, viewInputs.issue)
    const isSaveDisabled =
      isSaving || !hasUnsavedChanges || hasConflict(model, viewInputs.issue)

    return h.section(
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
                        ...(hasUnsavedChanges
                          ? [
                              Button.view(
                                {
                                  type: 'button',
                                  onClick: Message.ClickedDiscardChanges(),
                                  isDisabled: isSaving,
                                  toView: attributes =>
                                    h.button(
                                      [
                                        ...attributes.button,
                                        h.Disabled(isSaving),
                                        h.Class('button'),
                                      ],
                                      ['Discard changes'],
                                    ),
                                },
                                h,
                              ),
                            ]
                          : []),
                        submitButton(isSaveDisabled, h),
                      ],
                    ),
                    saveFeedback(model, viewInputs.issue, h),
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
                  authorId: viewInputs.commentAuthorId,
                },
              }),
            ),
          ],
        ),
      ],
    )
  },
)
