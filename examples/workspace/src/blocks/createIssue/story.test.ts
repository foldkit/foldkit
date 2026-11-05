import { Effect, Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  inMessage,
  init,
  message,
  messageFrom,
  model,
  story,
} from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import { Issue, IssueDraft } from '../../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../../listbox'
import { CreateIssueBlock } from './block'
import { CreateIssue } from './command'
import {
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { InMessage } from './inMessage'
import { layer } from './layer'
import { Message } from './message'
import { CreateState, type Model } from './model'
import { OutMessage } from './outMessage'

const createIssueSubject = { block: CreateIssueBlock, layer }

describe('CreateIssueBlock update', () => {
  it.effect(
    'opens a fresh Todo draft or applies an explicit status preset',
    () => {
      return Effect.gen(function* () {
        yield* story(
          createIssueSubject,
          init(),
          inMessage(InMessage.RequestedOpen({ projectId: 'launch' })),
          Command.resolve(
            DialogTest.ShowDialog,
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

        yield* story(
          createIssueSubject,
          init(),
          inMessage(
            InMessage.RequestedOpen({
              projectId: 'experience',
              status: 'InProgress',
            }),
          ),
          Command.resolve(
            DialogTest.ShowDialog,
            DialogBlock.Message.SucceededShowDialog(),
          ),
          model(model => {
            expect(model.projectId).toBe('experience')
            expect(model.status).toBe('InProgress')
          }),
          Command.expectNone(),
        )
      })
    },
  )

  it.effect(
    'folds Listbox selections and rejects a status outside its domain',
    () => {
      return story(
        createIssueSubject,
        init(),
        messageFrom(
          ProjectListboxBinding,
          WorkspaceListboxBlock.Message.RequestedSelectItem({
            item: 'launch',
          }),
        ),
        messageFrom(
          StatusListboxBinding,
          WorkspaceListboxBlock.Message.RequestedSelectItem({
            item: 'Backlog',
          }),
        ),
        messageFrom(
          PriorityListboxBinding,
          PriorityListboxBlock.Message.RequestedSelectItem({ item: 'High' }),
        ),
        messageFrom(
          StatusListboxBinding,
          WorkspaceListboxBlock.Message.RequestedSelectItem({
            item: 'Blocked',
          }),
        ),
        model(model => {
          expect(model.projectId).toBe('launch')
          expect(model.status).toBe('Backlog')
          expect(model.priority).toBe('High')
        }),
        expectNoOutMessage(),
        Command.expectNone(),
      )
    },
  )

  it.effect('rejects a whitespace title without scheduling creation', () => {
    return story(
      createIssueSubject,
      init(),
      inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
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
    )
  })

  it.effect('retains a failed draft and emits the issue after retry', () => {
    const draft = IssueDraft.make({
      title: 'Prepare the welcome tour',
      description: 'Help new teams find their first project.',
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
      createIssueSubject,
      init(),
      inMessage(
        InMessage.RequestedOpen({
          projectId: draft.projectId,
          status: draft.status,
        }),
      ),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      message(Message.UpdatedTitle({ value: `  ${draft.title}  ` })),
      message(Message.UpdatedDescription({ value: draft.description })),
      messageFrom(
        PriorityListboxBinding,
        PriorityListboxBlock.Message.RequestedSelectItem({
          item: draft.priority,
        }),
      ),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateIssue({ draft })),
      Command.resolve(CreateIssue, Message.FailedCreateIssue({ error })),
      model(model => {
        expect(model.title).toBe(`  ${draft.title}  `)
        expect(model.description).toBe(draft.description)
        expect(model.projectId).toBe(draft.projectId)
        expect(model.status).toBe(draft.status)
        expect(model.priority).toBe(draft.priority)
        expect(model.createState).toEqual(CreateState.Failed({ error }))
        expect(model.dialog.isOpen).toBe(true)
      }),
      expectNoOutMessage(),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateIssue({ draft })),
      Command.resolve(CreateIssue, Message.SucceededCreateIssue({ issue })),
      expectOutMessage(OutMessage.Created({ issue })),
      Command.resolve(
        DialogTest.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      model(model => {
        expect(model.dialog.isOpen).toBe(false)
        expect(model.createState).toEqual(CreateState.Idle())
      }),
      Command.expectNone(),
    )
  })

  it.effect('preserves a pending form across close and reopen requests', () =>
    story(
      createIssueSubject,
      init(),
      inMessage(
        InMessage.RequestedOpen({ projectId: 'launch', status: 'Backlog' }),
      ),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      message(Message.UpdatedTitle({ value: 'A pending issue' })),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateIssue),
      inMessage(InMessage.RequestedClose()),
      Command.resolve(
        DialogTest.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      inMessage(
        InMessage.RequestedOpen({ projectId: 'platform', status: 'Done' }),
      ),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => {
        expect(model.dialog.isOpen).toBe(true)
        expect(model.title).toBe('A pending issue')
        expect(model.projectId).toBe('launch')
        expect(model.status).toBe('Backlog')
      }),
      message(Message.SubmittedIssueForm()),
      Command.expectExact(CreateIssue),
      Command.resolve(
        CreateIssue,
        Message.FailedCreateIssue({ error: 'Offline' }),
      ),
      expectNoOutMessage(),
    ),
  )

  it.effect('ignores every draft edit while creation is pending', () => {
    let pendingModel: Model | undefined

    return story(
      createIssueSubject,
      init(),
      inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      message(Message.UpdatedTitle({ value: 'A pending issue' })),
      message(
        Message.UpdatedDescription({
          value: 'Keep the submitted description.',
        }),
      ),
      message(Message.SubmittedIssueForm()),
      model(model => {
        pendingModel = model
      }),
      message(Message.UpdatedTitle({ value: 'A different title' })),
      model(model => expect(model).toBe(pendingModel)),
      message(Message.UpdatedDescription({ value: 'A different description' })),
      messageFrom(
        ProjectListboxBinding,
        WorkspaceListboxBlock.Message.RequestedSelectItem({ item: 'launch' }),
      ),
      messageFrom(
        StatusListboxBinding,
        StatusListboxBlock.Message.RequestedSelectItem({ item: 'Done' }),
      ),
      messageFrom(
        PriorityListboxBinding,
        PriorityListboxBlock.Message.RequestedSelectItem({ item: 'High' }),
      ),
      model(model => {
        expect(model).toMatchObject({
          title: 'A pending issue',
          description: 'Keep the submitted description.',
          projectId: 'experience',
          status: 'Todo',
          priority: 'Medium',
          createState: CreateState.Creating(),
        })
      }),
      expectNoOutMessage(),
      Command.expectExact(CreateIssue),
      Command.resolve(
        CreateIssue,
        Message.FailedCreateIssue({ error: 'Offline' }),
      ),
    )
  })
})
