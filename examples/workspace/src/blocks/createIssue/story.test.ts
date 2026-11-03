import { Effect, Option } from 'effect'
import { inMessage } from 'foldkit/story'
import * as Story from 'foldkit/story'
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
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import {
  Issue,
  IssueDraft,
  type IssuePriority,
  type IssueStatus,
} from '../../domain'
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

const initModel = (executable: Story.TestBlock<typeof CreateIssueBlock>) => {
  return executable.init().model
}
const openModel = (
  executable: Story.TestBlock<typeof CreateIssueBlock>,
  projectId = 'experience',
) => {
  return executable.operations.requestOpen(initModel(executable), { projectId })
    .model
}

const projectSelection = (
  executable: Story.TestBlock<typeof CreateIssueBlock>,
  item: string,
) => {
  const toParentMessage = toParentMessageFor(executable)
  return toParentMessage(
    ProjectListboxBinding,
    WorkspaceListboxBlock.Message.RequestedSelectItem({ item }),
  )
}

const statusSelection = (
  executable: Story.TestBlock<typeof CreateIssueBlock>,
  item: string,
) => {
  const toParentMessage = toParentMessageFor(executable)
  return toParentMessage(
    StatusListboxBinding,
    WorkspaceListboxBlock.Message.RequestedSelectItem({ item }),
  )
}

const typedStatusSelection = (
  executable: Story.TestBlock<typeof CreateIssueBlock>,
  item: IssueStatus,
) => {
  const toParentMessage = toParentMessageFor(executable)
  return toParentMessage(
    StatusListboxBinding,
    StatusListboxBlock.Message.RequestedSelectItem({ item }),
  )
}

const prioritySelection = (
  executable: Story.TestBlock<typeof CreateIssueBlock>,
  item: IssuePriority,
) => {
  const toParentMessage = toParentMessageFor(executable)
  return toParentMessage(
    PriorityListboxBinding,
    PriorityListboxBlock.Message.RequestedSelectItem({ item }),
  )
}

describe('CreateIssueBlock update', () => {
  test('opens a fresh Todo draft or applies an explicit status preset', () => {
    return Effect.runPromise(
      Story.withBlock(CreateIssueBlock, executable =>
        Effect.gen(function* () {
          yield* story(
            CreateIssueBlock,
            given(initModel(executable)),
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
            given(initModel(executable)),
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
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('folds Listbox selections and rejects a status outside its domain', () => {
    return Effect.runPromise(
      Story.withBlock(CreateIssueBlock, executable => {
        const update = executable.update

        story(
          update,
          given(initModel(executable)),
          message(projectSelection(executable, 'launch')),
          message(statusSelection(executable, 'Backlog')),
          message(prioritySelection(executable, 'High')),
          message(statusSelection(executable, 'Blocked')),
          model(model => {
            expect(model.projectId).toBe('launch')
            expect(model.status).toBe('Backlog')
            expect(model.priority).toBe('High')
          }),
          expectNoOutMessage(),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('rejects a whitespace title without scheduling creation', () => {
    return Effect.runPromise(
      Story.withBlock(CreateIssueBlock, executable => {
        const update = executable.update

        const initialModel = modifyFields(openModel(executable), {
          title: () => '   ',
          description: () => 'Keep this description.',
        })

        story(
          update,
          given(initialModel),
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
      }).pipe(Effect.provide(layer)),
    )
  })

  test('retains a failed draft and emits the issue after retry', () => {
    return Effect.runPromise(
      Story.withBlock(CreateIssueBlock, executable => {
        const update = executable.update

        const initialModel = modifyFields(openModel(executable), {
          title: () => '  Prepare the welcome tour  ',
          description: () => 'Help new teams find their first project.',
          projectId: () => 'platform',
          status: () => 'Backlog',
          priority: () => 'High',
        })
        const draft = IssueDraft.make({
          title: 'Prepare the welcome tour',
          description: initialModel.description,
          projectId: initialModel.projectId,
          status: initialModel.status,
          priority: initialModel.priority,
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
          given(initialModel),
          message(Message.SubmittedIssueForm()),
          Command.expectExact(CreateIssue({ draft })),
          Command.resolve(CreateIssue, Message.FailedCreateIssue({ error })),
          model(model => {
            expect(model.title).toBe(initialModel.title)
            expect(model.description).toBe(initialModel.description)
            expect(model.projectId).toBe(initialModel.projectId)
            expect(model.status).toBe(initialModel.status)
            expect(model.priority).toBe(initialModel.priority)
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
      }).pipe(Effect.provide(layer)),
    )
  })

  test('preserves a pending form across close and reopen requests', () => {
    return Effect.runPromise(
      Story.withBlock(CreateIssueBlock, executable =>
        Effect.gen(function* () {
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

          yield* story(
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
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('ignores every draft edit while creation is pending', () => {
    return Effect.runPromise(
      Story.withBlock(CreateIssueBlock, executable => {
        const update = executable.update

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

        story(
          update,
          given(initialModel),
          message(Message.UpdatedTitle({ value: 'A different title' })),
          message(
            Message.UpdatedDescription({ value: 'A different description' }),
          ),
          message(projectSelection(executable, 'launch')),
          message(typedStatusSelection(executable, 'Done')),
          message(prioritySelection(executable, 'High')),
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
      }).pipe(Effect.provide(layer)),
    )
  })
})
