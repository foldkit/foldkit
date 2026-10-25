import { Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { Dialog, DialogBlock } from '@foldkit/ui'

import {
  Issue,
  IssueDraft,
  type IssuePriority,
  type IssueStatus,
} from '../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../listbox'
import { CreateIssueBlock } from './block'
import { CreateIssue } from './command'
import {
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { CreateState, Message, OutMessage } from './definition'
import { editDraft } from './draft'
import { update } from './update'

const initModel = () => CreateIssueBlock.init().model
const openModel = (projectId = 'experience') =>
  CreateIssueBlock.operations.requestOpen(initModel(), { projectId }).model

const projectSelection = (item: string) =>
  toParentMessage(
    ProjectListboxBinding,
    WorkspaceListboxBlock.Message.RequestedSelectItem({ item }),
  )

const statusSelection = (item: string) =>
  toParentMessage(
    StatusListboxBinding,
    WorkspaceListboxBlock.Message.RequestedSelectItem({ item }),
  )

const typedStatusSelection = (item: typeof IssueStatus.Type) =>
  toParentMessage(
    StatusListboxBinding,
    StatusListboxBlock.Message.RequestedSelectItem({ item }),
  )

const prioritySelection = (item: typeof IssuePriority.Type) =>
  toParentMessage(
    PriorityListboxBinding,
    PriorityListboxBlock.Message.RequestedSelectItem({ item }),
  )

describe('CreateIssueBlock update', () => {
  test('opens a fresh Todo draft or applies an explicit status preset', () => {
    story(
      update,
      given(initModel()),
      message(Message.RequestedOpen({ projectId: 'launch' })),
      Command.resolve(
        Dialog.test.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => {
        expect(model.dialog.isOpen).toBe(true)
        expect(model.projectId).toBe('launch')
        expect(model.status).toBe('Todo')
        expect(model.priority).toBe('Medium')
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    )

    story(
      update,
      given(initModel()),
      message(
        Message.RequestedOpen({
          projectId: 'experience',
          status: 'InProgress',
        }),
      ),
      Command.resolve(
        Dialog.test.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => {
        expect(model.projectId).toBe('experience')
        expect(model.status).toBe('InProgress')
      }),
      Command.expectNone(),
    )
  })

  test('folds Listbox selections and rejects a status outside its domain', () => {
    story(
      update,
      given(initModel()),
      message(projectSelection('launch')),
      message(statusSelection('Backlog')),
      message(prioritySelection('High')),
      message(statusSelection('Blocked')),
      model(model => {
        expect(model.projectId).toBe('launch')
        expect(model.status).toBe('Backlog')
        expect(model.priority).toBe('High')
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })

  test('rejects a whitespace title without scheduling creation', () => {
    const initial = modifyFields(openModel(), {
      title: () => '   ',
      description: () => 'Keep this description.',
    })

    story(
      update,
      given(initial),
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
    )
  })

  test('retains a failed draft and emits the issue after retry', () => {
    const initial = modifyFields(openModel(), {
      title: () => '  Prepare the welcome tour  ',
      description: () => 'Help new teams find their first project.',
      projectId: () => 'platform',
      status: () => 'Backlog',
      priority: () => 'High',
    })
    const draft = IssueDraft.make({
      title: 'Prepare the welcome tour',
      description: initial.description,
      projectId: initial.projectId,
      status: initial.status,
      priority: initial.priority,
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

    story(
      update,
      given(initial),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateIssue({ draft })),
      Command.resolve(CreateIssue, Message.FailedCreateIssue({ error })),
      model(model => {
        expect(model.title).toBe(initial.title)
        expect(model.description).toBe(initial.description)
        expect(model.projectId).toBe(initial.projectId)
        expect(model.status).toBe(initial.status)
        expect(model.priority).toBe(initial.priority)
        expect(model.createState).toEqual(CreateState.Failed({ error }))
        expect(model.dialog.isOpen).toBe(true)
      }),
      expectNoOutMessage(),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateIssue({ draft })),
      Command.resolve(CreateIssue, Message.SucceededCreateIssue({ issue })),
      expectOutMessage(OutMessage.Created({ issue })),
      Command.resolve(
        Dialog.test.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      model(model => {
        expect(model.dialog.isOpen).toBe(false)
        expect(model.createState).toEqual(CreateState.Idle())
      }),
      Command.expectNone(),
    )
  })

  test('preserves a pending form across close and reopen requests', () => {
    const initial = modifyFields(
      CreateIssueBlock.operations.requestOpen(initModel(), {
        projectId: 'launch',
        status: 'Backlog',
      }).model,
      {
        title: () => 'A pending issue',
        createState: () => CreateState.Creating(),
      },
    )

    story(
      update,
      given(initial),
      message(Message.RequestedClose()),
      Command.resolve(
        Dialog.test.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      message(Message.RequestedOpen({ projectId: 'platform', status: 'Done' })),
      Command.resolve(
        Dialog.test.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => {
        expect(model.dialog.isOpen).toBe(true)
        expect(model.title).toBe('A pending issue')
        expect(model.projectId).toBe('launch')
        expect(model.status).toBe('Backlog')
      }),
      message(Message.SubmittedIssueForm()),
      Command.expectNone(),
    )
  })

  test('ignores every draft edit while creation is pending', () => {
    const initial = modifyFields(initModel(), {
      title: () => 'A pending issue',
      description: () => 'Keep the submitted description.',
      createState: () => CreateState.Creating(),
    })

    expect(
      editDraft(model =>
        modifyFields(model, { title: () => 'A rejected title' }),
      )(initial).model,
    ).toBe(initial)

    story(
      update,
      given(initial),
      message(Message.UpdatedTitle({ value: 'A different title' })),
      message(Message.UpdatedDescription({ value: 'A different description' })),
      message(projectSelection('launch')),
      message(typedStatusSelection('Done')),
      message(prioritySelection('High')),
      model(model => {
        expect(model).toMatchObject({
          title: initial.title,
          description: initial.description,
          projectId: initial.projectId,
          status: initial.status,
          priority: initial.priority,
          createState: CreateState.Creating(),
        })
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })
})
