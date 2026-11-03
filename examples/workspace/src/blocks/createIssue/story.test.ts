import { Effect, Option } from 'effect'
import {
  Command,
  type TestBlock,
  expectNoOutMessage,
  expectOutMessage,
  given,
  inMessage,
  init,
  message,
  messageFrom,
  model,
  story,
  withBlock,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import { Issue, IssueDraft } from '../../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../../listbox'
import { layer } from './block'
import { CreateIssue } from './command'
import {
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { CreateIssueBlock } from './definition'
import { editDraft } from './draft'
import { InMessage } from './inMessage'
import { Message } from './message'
import { CreateState } from './model'
import { OutMessage } from './outMessage'

const initModel = (executable: TestBlock<typeof CreateIssueBlock>) => {
  return executable.init().model
}

describe('CreateIssueBlock update', () => {
  it.effect(
    'opens a fresh Todo draft or applies an explicit status preset',
    () => {
      return Effect.gen(function* () {
        yield* story(
          CreateIssueBlock,
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
          CreateIssueBlock,
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
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'folds Listbox selections and rejects a status outside its domain',
    () => {
      return story(
        CreateIssueBlock,
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
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect('rejects a whitespace title without scheduling creation', () => {
    return story(
      CreateIssueBlock,
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
    ).pipe(Effect.provide(layer))
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
      CreateIssueBlock,
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
    ).pipe(Effect.provide(layer))
  })

  it.effect('preserves a pending form across close and reopen requests', () => {
    return withBlock(CreateIssueBlock, executable => {
      const initialModel = modifyFields(
        executable.operations.requestOpen(initModel(executable), {
          projectId: 'launch',
          status: 'Backlog',
        }).model,
        {
          title: () => 'A pending issue',
          createState: () => CreateState.Creating(),
        },
      )
      return story(
        CreateIssueBlock,
        given(initialModel),
        inMessage(InMessage.RequestedClose()),
        Command.resolve(
          DialogTest.CloseDialog,
          DialogBlock.Message.CompletedCloseDialog(),
        ),
        inMessage(
          InMessage.RequestedOpen({
            projectId: 'platform',
            status: 'Done',
          }),
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
        Command.expectNone(),
      )
    }).pipe(Effect.provide(layer))
  })

  it.effect('ignores every draft edit while creation is pending', () => {
    return withBlock(CreateIssueBlock, executable => {
      const initialModel = modifyFields(initModel(executable), {
        title: () => 'A pending issue',
        description: () => 'Keep the submitted description.',
        createState: () => CreateState.Creating(),
      })

      expect(
        editDraft(model =>
          modifyFields(model, { title: () => 'A rejected title' }),
        )(initialModel).model,
      ).toBe(initialModel)
      return story(
        CreateIssueBlock,
        given(initialModel),
        message(Message.UpdatedTitle({ value: 'A different title' })),
        message(
          Message.UpdatedDescription({ value: 'A different description' }),
        ),
        messageFrom(
          ProjectListboxBinding,
          WorkspaceListboxBlock.Message.RequestedSelectItem({
            item: 'launch',
          }),
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
            title: initialModel.title,
            description: initialModel.description,
            projectId: initialModel.projectId,
            status: initialModel.status,
            priority: initialModel.priority,
            createState: CreateState.Creating(),
          })
        }),
        expectNoOutMessage(),
        Command.expectNone(),
      )
    }).pipe(Effect.provide(layer))
  })
})
