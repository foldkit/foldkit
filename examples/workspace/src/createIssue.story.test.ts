import { Effect, Option } from 'effect'
import { Block } from 'foldkit'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  message,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import {
  CreateIssueLive,
  CreateNewIssue,
  CreateState,
  Message,
  OutMessage,
  editDraftStep,
} from './createIssue'
import {
  Issue,
  IssueDraft,
  type IssuePriority,
  type IssueStatus,
} from './domain/domain'
import { PriorityListbox, StatusListbox, WorkspaceListbox } from './listbox'
import { WorkspaceRepositoryLayer } from './services'

const showDialog = Command.resolve(
  Dialog.test.ShowDialog,
  Dialog.Dialog.Message.SucceededShowDialog(),
)
const closeDialog = Command.resolve(
  Dialog.test.CloseDialog,
  Dialog.Dialog.Message.CompletedCloseDialog(),
)

const projectSelection = (item: string) =>
  message(
    Block.deliver(
      WorkspaceListbox,
      'projectListbox',
      WorkspaceListbox.Message.RequestedSelectItem({ item }),
    ),
  )

const statusSelection = (item: string) =>
  message(
    Block.deliver(
      WorkspaceListbox,
      'statusListbox',
      WorkspaceListbox.Message.RequestedSelectItem({ item }),
    ),
  )

const typedStatusSelection = (item: IssueStatus) =>
  message(
    Block.deliver(
      StatusListbox,
      'statusListbox',
      StatusListbox.Message.RequestedSelectItem({ item }),
    ),
  )

const prioritySelection = (item: IssuePriority) =>
  message(
    Block.deliver(
      PriorityListbox,
      'priorityListbox',
      PriorityListbox.Message.RequestedSelectItem({ item }),
    ),
  )

describe('CreateIssue update', () => {
  it.effect(
    'opens a fresh Todo draft or applies an explicit status preset',
    () =>
      story(
        CreateIssueLive,
        message(Message.RequestedOpen({ projectId: 'launch' })),
        showDialog,
        model(model => {
          expect(model.dialog.isOpen).toBe(true)
          expect(model.projectId).toBe('launch')
          expect(model.status).toBe('Todo')
          expect(model.priority).toBe('Medium')
        }),
        expectNoOutMessage(),
        Command.expectNone(),
      ).pipe(
        Effect.andThen(
          story(
            CreateIssueLive,
            message(
              Message.RequestedOpen({
                projectId: 'experience',
                status: 'InProgress',
              }),
            ),
            showDialog,
            model(model => {
              expect(model.projectId).toBe('experience')
              expect(model.status).toBe('InProgress')
            }),
            Command.expectNone(),
          ),
        ),
        Effect.provide(WorkspaceRepositoryLayer),
      ),
  )

  it.effect(
    'folds Listbox selections and rejects a status outside its domain',
    () =>
      story(
        CreateIssueLive,
        projectSelection('launch'),
        statusSelection('Backlog'),
        prioritySelection('High'),
        statusSelection('Blocked'),
        model(model => {
          expect(model.projectId).toBe('launch')
          expect(model.status).toBe('Backlog')
          expect(model.priority).toBe('High')
        }),
        expectNoOutMessage(),
        Command.expectNone(),
      ).pipe(Effect.provide(WorkspaceRepositoryLayer)),
  )

  it.effect('rejects a whitespace title without scheduling creation', () =>
    story(
      CreateIssueLive,
      message(Message.RequestedOpen({ projectId: 'experience' })),
      showDialog,
      message(Message.UpdatedTitle({ value: '   ' })),
      message(Message.UpdatedDescription({ value: 'Keep this description.' })),
      message(Message.SubmittedIssueForm()),
      model(model => {
        expect(model.description).toBe('Keep this description.')
        expect(model.createState).toEqual(
          CreateState.Failed({
            error: 'Enter an issue title before creating it.',
          }),
        )
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer)),
  )

  it.effect('retains a failed draft and emits the issue after retry', () => {
    const title = '  Prepare the welcome tour  '
    const description = 'Help new teams find their first project.'
    const draft = IssueDraft.make({
      title: 'Prepare the welcome tour',
      description,
      projectId: 'platform',
      status: 'Backlog',
      priority: 'High',
      maybeAssigneeId: Option.none(),
      labelIds: [],
    })
    const issue = Issue.make({
      ...draft,
      id: 'issue-117',
      identifier: 'WSP-117',
      version: 1,
      comments: [],
    })
    const error = 'The workspace is temporarily unavailable.'

    return story(
      CreateIssueLive,
      message(Message.RequestedOpen({ projectId: 'experience' })),
      showDialog,
      message(Message.UpdatedTitle({ value: title })),
      message(Message.UpdatedDescription({ value: description })),
      projectSelection('platform'),
      typedStatusSelection('Backlog'),
      prioritySelection('High'),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateNewIssue({ draft })),
      Command.resolve(CreateNewIssue, Message.FailedCreateNewIssue({ error })),
      model(model => {
        expect(model.title).toBe(title)
        expect(model.description).toBe(description)
        expect(model.projectId).toBe('platform')
        expect(model.status).toBe('Backlog')
        expect(model.priority).toBe('High')
        expect(model.createState).toEqual(CreateState.Failed({ error }))
        expect(model.dialog.isOpen).toBe(true)
      }),
      expectNoOutMessage(),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateNewIssue({ draft })),
      Command.resolve(
        CreateNewIssue,
        Message.SucceededCreateNewIssue({ issue }),
      ),
      expectOutMessage(OutMessage.Created({ issue })),
      closeDialog,
      model(model => {
        expect(model.dialog.isOpen).toBe(false)
        expect(model.createState).toEqual(CreateState.Idle())
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer))
  })

  it.effect('preserves a pending form across close and reopen requests', () => {
    const draft = IssueDraft.make({
      title: 'A pending issue',
      description: '',
      projectId: 'launch',
      status: 'Backlog',
      priority: 'Medium',
      maybeAssigneeId: Option.none(),
      labelIds: [],
    })

    return story(
      CreateIssueLive,
      message(
        Message.RequestedOpen({ projectId: 'launch', status: 'Backlog' }),
      ),
      showDialog,
      message(Message.UpdatedTitle({ value: 'A pending issue' })),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateNewIssue({ draft })),
      message(Message.RequestedClose()),
      closeDialog,
      message(Message.RequestedOpen({ projectId: 'platform', status: 'Done' })),
      showDialog,
      model(model => {
        expect(model.dialog.isOpen).toBe(true)
        expect(model.title).toBe('A pending issue')
        expect(model.projectId).toBe('launch')
        expect(model.status).toBe('Backlog')
      }),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateNewIssue({ draft })),
      Command.resolve(
        CreateNewIssue,
        Message.FailedCreateNewIssue({ error: 'Creation failed.' }),
      ),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer))
  })

  it.effect('ignores every draft edit while creation is pending', () => {
    const draft = IssueDraft.make({
      title: 'A pending issue',
      description: 'Keep the submitted description.',
      projectId: 'platform',
      status: 'Todo',
      priority: 'Medium',
      maybeAssigneeId: Option.none(),
      labelIds: [],
    })

    return story(
      CreateIssueLive,
      message(Message.UpdatedTitle({ value: draft.title })),
      message(Message.UpdatedDescription({ value: draft.description })),
      message(Message.SubmittedIssueForm()),
      model(model => {
        expect(
          editDraftStep((draftModel: typeof model) =>
            modifyFields(draftModel, { title: () => 'A rejected title' }),
          )(model).model,
        ).toBe(model)
      }),
      message(Message.UpdatedTitle({ value: 'A different title' })),
      message(Message.UpdatedDescription({ value: 'A different description' })),
      projectSelection('launch'),
      typedStatusSelection('Done'),
      prioritySelection('High'),
      model(model => {
        expect(model).toMatchObject({
          title: draft.title,
          description: draft.description,
          projectId: draft.projectId,
          status: draft.status,
          priority: draft.priority,
          createState: CreateState.Creating(),
        })
      }),
      expectNoOutMessage(),
      Command.expectExact(CreateNewIssue({ draft })),
      Command.resolve(
        CreateNewIssue,
        Message.FailedCreateNewIssue({ error: 'Creation failed.' }),
      ),
      showDialog,
    ).pipe(Effect.provide(WorkspaceRepositoryLayer))
  })
})
