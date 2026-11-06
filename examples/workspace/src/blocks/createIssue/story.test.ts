import { Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { Issue } from '../../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  StringListboxBlock,
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
import { CreateState } from './model'
import { OutMessage } from './outMessage'

const createIssueSubject = { block: CreateIssueBlock, layer }

describe('CreateIssueBlock update', () => {
  it.effect(
    'opens a fresh Todo draft or applies an explicit status preset',
    () => {
      return Effect.gen(function* () {
        yield* Story.story(
          createIssueSubject,
          Story.init(),
          Story.inMessage(InMessage.RequestedOpen({ projectId: 'launch' })),
          Story.Command.resolve(
            Dialog.test.ShowDialog,
            Dialog.DialogBlock.Message.SucceededShowDialog(),
          ),
          Story.model(model => {
            expect(model.dialog.isOpen).toBe(true)
            expect(model.projectId).toBe('launch')
            expect(model.status).toBe('Todo')
            expect(model.priority).toBe('Medium')
          }),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        )

        yield* Story.story(
          createIssueSubject,
          Story.init(),
          Story.inMessage(
            InMessage.RequestedOpen({
              projectId: 'experience',
              status: 'InProgress',
            }),
          ),
          Story.Command.resolve(
            Dialog.test.ShowDialog,
            Dialog.DialogBlock.Message.SucceededShowDialog(),
          ),
          Story.model(model => {
            expect(model.projectId).toBe('experience')
            expect(model.status).toBe('InProgress')
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )

  it.effect(
    'selects the project, status and priority through their Listboxes',
    () => {
      return Story.story(
        createIssueSubject,
        Story.init(),
        Story.messageIn(
          ProjectListboxBinding,
          StringListboxBlock.Message.RequestedSelectItem({ item: 'launch' }),
        ),
        Story.messageIn(
          StatusListboxBinding,
          StatusListboxBlock.Message.RequestedSelectItem({ item: 'Backlog' }),
        ),
        Story.messageIn(
          PriorityListboxBinding,
          PriorityListboxBlock.Message.RequestedSelectItem({ item: 'High' }),
        ),
        Story.model(model => {
          expect(model.projectId).toBe('launch')
          expect(model.status).toBe('Backlog')
          expect(model.priority).toBe('High')
        }),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect('rejects a whitespace title without scheduling creation', () => {
    return Story.story(
      createIssueSubject,
      Story.init(),
      Story.inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.message(Message.UpdatedTitle({ value: '   ' })),
      Story.message(
        Message.UpdatedDescription({ value: 'Keep this description.' }),
      ),
      Story.message(Message.SubmittedIssueForm()),
      Story.model(model => {
        expect(model.description).toBe('Keep this description.')
        expect(model.createState).toEqual(
          CreateState.Failed({
            error: 'Enter an issue title before creating it.',
          }),
        )
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    )
  })

  it.effect('retains a failed draft and emits the issue after retry', () => {
    const draft = Issue.Draft.make({
      title: 'Prepare the welcome tour',
      description: 'Help new teams find their first project.',
      projectId: 'platform',
      status: 'Backlog',
      priority: 'High',
      maybeAssigneeId: Option.none(),
      labelIds: [],
    })

    const issue = Issue.Issue.make({
      ...draft,
      id: 'issue-117',
      identifier: 'WSP-117',
      version: 1,
      comments: [],
    })

    const error = 'The workspace is temporarily unavailable.'
    return Story.story(
      createIssueSubject,
      Story.init(),
      Story.inMessage(
        InMessage.RequestedOpen({
          projectId: draft.projectId,
          status: draft.status,
        }),
      ),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.message(Message.UpdatedTitle({ value: `  ${draft.title}  ` })),
      Story.message(Message.UpdatedDescription({ value: draft.description })),
      Story.messageIn(
        PriorityListboxBinding,
        PriorityListboxBlock.Message.RequestedSelectItem({
          item: draft.priority,
        }),
      ),
      Story.message(Message.SubmittedIssueForm()),
      Story.Command.expectExact(CreateIssue({ draft })),
      Story.Command.resolve(CreateIssue, Message.FailedCreateIssue({ error })),
      Story.model(model => {
        expect(model.title).toBe(`  ${draft.title}  `)
        expect(model.description).toBe(draft.description)
        expect(model.projectId).toBe(draft.projectId)
        expect(model.status).toBe(draft.status)
        expect(model.priority).toBe(draft.priority)
        expect(model.createState).toEqual(CreateState.Failed({ error }))
        expect(model.dialog.isOpen).toBe(true)
      }),
      Story.expectNoOutMessage(),
      Story.message(Message.SubmittedIssueForm()),
      Story.Command.expectExact(CreateIssue({ draft })),
      Story.Command.resolve(
        CreateIssue,
        Message.SucceededCreateIssue({ issue }),
      ),
      Story.expectOutMessage(OutMessage.Created({ issue })),
      Story.Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Story.model(model => {
        expect(model.dialog.isOpen).toBe(false)
        expect(model.createState).toEqual(CreateState.Idle())
      }),
      Story.Command.expectNone(),
    )
  })

  it.effect('preserves a pending form across close and reopen requests', () =>
    Story.story(
      createIssueSubject,
      Story.init(),
      Story.inMessage(
        InMessage.RequestedOpen({ projectId: 'launch', status: 'Backlog' }),
      ),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.message(Message.UpdatedTitle({ value: 'A pending issue' })),
      Story.message(Message.SubmittedIssueForm()),
      Story.Command.expectExact(CreateIssue),
      Story.inMessage(InMessage.RequestedClose()),
      Story.Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Story.inMessage(
        InMessage.RequestedOpen({ projectId: 'platform', status: 'Done' }),
      ),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.model(model => {
        expect(model.dialog.isOpen).toBe(true)
        expect(model.title).toBe('A pending issue')
        expect(model.projectId).toBe('launch')
        expect(model.status).toBe('Backlog')
      }),
      Story.message(Message.SubmittedIssueForm()),
      Story.Command.expectExact(CreateIssue),
      Story.Command.resolve(
        CreateIssue,
        Message.FailedCreateIssue({ error: 'Offline' }),
      ),
      Story.expectNoOutMessage(),
    ),
  )

  it.effect('ignores every draft edit while creation is pending', () => {
    return Story.story(
      createIssueSubject,
      Story.init(),
      Story.inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.message(Message.UpdatedTitle({ value: 'A pending issue' })),
      Story.message(
        Message.UpdatedDescription({
          value: 'Keep the submitted description.',
        }),
      ),
      Story.message(Message.SubmittedIssueForm()),
      Story.models(
        Story.steps(
          Story.message(Message.UpdatedTitle({ value: 'A different title' })),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.message(
        Message.UpdatedDescription({ value: 'A different description' }),
      ),
      Story.messageIn(
        ProjectListboxBinding,
        StringListboxBlock.Message.RequestedSelectItem({ item: 'launch' }),
      ),
      Story.messageIn(
        StatusListboxBinding,
        StatusListboxBlock.Message.RequestedSelectItem({ item: 'Done' }),
      ),
      Story.messageIn(
        PriorityListboxBinding,
        PriorityListboxBlock.Message.RequestedSelectItem({ item: 'High' }),
      ),
      Story.model(model => {
        expect(model).toMatchObject({
          title: 'A pending issue',
          description: 'Keep the submitted description.',
          projectId: 'experience',
          status: 'Todo',
          priority: 'Medium',
          createState: CreateState.Creating(),
        })
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectExact(CreateIssue),
      Story.Command.resolve(
        CreateIssue,
        Message.FailedCreateIssue({ error: 'Offline' }),
      ),
    )
  })
})
