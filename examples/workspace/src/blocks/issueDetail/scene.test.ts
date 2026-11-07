import { Array, Option } from 'effect'
import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Listbox } from '@foldkit/ui'

import { Issue, initialWorkspace } from '../../domain'
import { StringListboxBlock } from '../../listbox'
import { RepositoryError } from '../../repository'
import { IssueDetailBlock } from './block'
import { CommentComposerBlock } from './blocks/commentComposer'
import { AddComment } from './blocks/commentComposer/command'
import { SaveIssue } from './command'
import { layer } from './layer'
import { Message } from './message'
import { OutMessage } from './outMessage'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const viewInputs = {
  issue,
  members: initialWorkspace.members,
  projects: initialWorkspace.projects,
  commentAuthorId: 'maya',
}
const issueDetailSubject = {
  block: IssueDetailBlock,
  layer,
  viewInputs,
}

const selectField = (fieldLabel: string, optionLabel: string) => [
  Scene.click(Scene.label(fieldLabel)),
  Scene.Command.resolve(
    Listbox.test.FocusListboxItems,
    StringListboxBlock.Message.CompletedFocusListboxItems(),
  ),
  Scene.Mount.resolve(
    Listbox.test.AnchorListbox,
    StringListboxBlock.Message.CompletedAnchorListbox(),
  ),
  Scene.Mount.resolve(
    Listbox.test.PortalListboxBackdrop,
    StringListboxBlock.Message.CompletedPortalListboxBackdrop(),
  ),
  Scene.click(Scene.role('option', { name: optionLabel })),
  Scene.Command.resolve(
    Listbox.test.FocusListboxButton,
    StringListboxBlock.Message.CompletedFocusListboxButton(),
  ),
  Scene.Mount.expectEnded(
    Listbox.test.AnchorListbox,
    Listbox.test.PortalListboxBackdrop,
  ),
]

describe('Issue Detail view', () => {
  it.effect(
    'retains an explicitly unassigned draft after a failed save',
    () => {
      const unassignedDraft = modifyFields(Issue.toDraft(issue), {
        maybeAssigneeId: () => Option.none(),
      })
      return Scene.scene(
        {
          ...issueDetailSubject,
          updateContext: [Option.some(issue)],
          inMessageContext: [Option.some(issue)],
        },
        Scene.init(issue),
        Scene.expect(Scene.label('Assignee')).toHaveText('Maya Chen'),
        ...selectField('Assignee', 'Unassigned'),
        Scene.expect(Scene.label('Assignee')).toHaveText('Unassigned'),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            draft: unassignedDraft,
          }),
        ),
        Scene.Command.resolve(
          SaveIssue,
          Message.FailedSaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            error: RepositoryError.Unavailable({
              message: 'The workspace is temporarily unavailable.',
              operation: 'SaveIssue',
            }),
          }),
        ),
        Scene.expect(Scene.label('Assignee')).toHaveText('Unassigned'),
        Scene.expect(Scene.role('button', { name: 'Retry save' })).toExist(),
      )
    },
  )

  it.effect(
    'reports a new comment without copying it into the editable baseline',
    () => {
      const draftTitle = 'Keep this title draft local'

      const comment = {
        id: 'comment-5',
        authorId: 'maya',
        body: 'Ready for review.',
        createdAt: '2026-10-22T14:30:00.000Z',
      }
      return Scene.scene(
        {
          ...issueDetailSubject,
          updateContext: [Option.some(issue)],
          inMessageContext: [Option.some(issue)],
        },
        Scene.init(issue),
        Scene.type(Scene.label('Issue title'), draftTitle),
        Scene.type(Scene.label('Write a comment'), comment.body),
        Scene.click(Scene.role('button', { name: 'Post comment' })),
        Scene.Command.resolve(
          AddComment,
          CommentComposerBlock.Message.SucceededAddComment({
            comment,
          }),
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(draftTitle),
        Scene.expect(Scene.label('Write a comment')).toHaveValue(''),
        Scene.expect(Scene.text(comment.body)).not.toExist(),
        Scene.expectOutMessage(
          OutMessage.AddedComment({ issueId: issue.id, comment }),
        ),
      )
    },
  )

  it.effect(
    'retains edits in labeled fields and recovers from a failed save',
    () => {
      const title = 'Search every project from the command menu'

      const savedIssue = modifyFields(issue, {
        title: () => title,
        description: () => 'Find the right project without leaving your flow.',
        status: () => 'Done',
        priority: () => 'Medium',
        projectId: () => 'platform',
        maybeAssigneeId: () => Option.some('alex'),
        version: version => version + 1,
      })
      return Scene.scene(
        {
          ...issueDetailSubject,
          updateContext: [Option.some(issue)],
          inMessageContext: [Option.some(issue)],
        },
        Scene.init(issue),
        Scene.type(Scene.label('Issue title'), title),
        Scene.type(Scene.label('Description'), savedIssue.description),
        ...selectField('Status', 'Done'),
        ...selectField('Priority', 'Medium'),
        ...selectField('Project', 'Platform'),
        ...selectField('Assignee', 'Alex Rivera'),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            draft: {
              title: savedIssue.title,
              description: savedIssue.description,
              status: savedIssue.status,
              priority: savedIssue.priority,
              projectId: savedIssue.projectId,
              maybeAssigneeId: savedIssue.maybeAssigneeId,
              labelIds: savedIssue.labelIds,
            },
          }),
        ),
        Scene.expect(
          Scene.role('button', { name: 'Save changes' }),
        ).toBeDisabled(),
        Scene.expect(Scene.label('Status')).toBeDisabled(),
        Scene.expect(Scene.label('Priority')).toBeDisabled(),
        Scene.expect(Scene.label('Project')).toBeDisabled(),
        Scene.expect(Scene.label('Assignee')).toBeDisabled(),
        Scene.Command.resolve(
          SaveIssue,
          Message.FailedSaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            error: RepositoryError.Unavailable({
              message: 'The workspace is temporarily unavailable.',
              operation: 'SaveIssue',
            }),
          }),
        ),
        Scene.expect(Scene.role('alert')).toContainText(
          'The workspace is temporarily unavailable.',
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(title),
        Scene.expect(Scene.label('Description')).toHaveValue(
          savedIssue.description,
        ),
        Scene.expect(Scene.label('Status')).toHaveText('Done'),
        Scene.expect(Scene.label('Priority')).toHaveText('Medium'),
        Scene.expect(Scene.label('Project')).toHaveText('Platform'),
        Scene.expect(Scene.label('Assignee')).toHaveText('Alex Rivera'),
        Scene.click(Scene.role('button', { name: 'Retry save' })),
        Scene.Command.resolve(
          SaveIssue,
          Message.SucceededSaveIssue({
            saveResult: Issue.toSaveResult(savedIssue),
            expectedVersion: issue.version,
          }),
        ),
        Scene.expectOutMessage(
          OutMessage.Saved({
            saveResult: Issue.toSaveResult(savedIssue),
          }),
        ),
        Scene.expect(Scene.role('status')).toContainText('All changes saved'),
        Scene.expect(
          Scene.role('button', { name: 'Save changes' }),
        ).toBeDisabled(),
      )
    },
  )
})
