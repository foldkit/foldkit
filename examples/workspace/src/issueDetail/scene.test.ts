import { Array, Option } from 'effect'
import {
  Command,
  Mount,
  click,
  expect,
  expectOutMessage,
  given,
  label,
  role,
  scene,
  text,
  type,
  withViewInputs,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Listbox } from '@foldkit/ui'

import { CommentComposerBlock } from '../commentComposer'
import { AddComment } from '../commentComposer/command'
import { initialSnapshot } from '../domain'
import { WorkspaceListboxBlock } from '../listbox'
import { RepositoryError } from '../repository'
import { SaveIssue } from './command'
import { Message, OutMessage } from './definition'
import { draftFromIssue } from './draft'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const issue = Option.getOrThrow(Array.head(initialSnapshot.issues))
const sceneView = withViewInputs(view, {
  issue,
  members: initialSnapshot.members,
  projects: initialSnapshot.projects,
  authorId: 'maya',
})

const selectField = (field: string, option: string) => [
  click(label(field)),
  Command.resolve(
    Listbox.test.FocusListboxItems,
    WorkspaceListboxBlock.Message.CompletedFocusListboxItems(),
  ),
  Mount.resolve(
    Listbox.test.AnchorListbox,
    WorkspaceListboxBlock.Message.CompletedAnchorListbox(),
  ),
  Mount.resolve(
    Listbox.test.PortalListboxBackdrop,
    WorkspaceListboxBlock.Message.CompletedPortalListboxBackdrop(),
  ),
  click(role('option', { name: option })),
  Command.resolve(
    Listbox.test.FocusListboxButton,
    WorkspaceListboxBlock.Message.CompletedFocusListboxButton(),
  ),
  Mount.expectEnded(
    Listbox.test.AnchorListbox,
    Listbox.test.PortalListboxBackdrop,
  ),
]

describe('Issue Detail view', () => {
  test('retains an explicitly unassigned draft after a failed save', () => {
    const unassignedDraft = modifyFields(draftFromIssue(issue), {
      maybeAssigneeId: () => Option.none(),
    })

    scene(
      { update, view: sceneView() },
      given(init(issue).model),
      expect(label('Assignee')).toHaveText('Maya Chen'),
      ...selectField('Assignee', 'Unassigned'),
      expect(label('Assignee')).toHaveText('Unassigned'),
      click(role('button', { name: 'Save changes' })),
      Command.expectExact(
        SaveIssue({
          issueId: issue.id,
          expectedVersion: issue.version,
          draft: unassignedDraft,
        }),
      ),
      Command.resolve(
        SaveIssue,
        Message.FailedSaveIssue({
          issueId: issue.id,
          expectedVersion: issue.version,
          error: RepositoryError.Unavailable({
            message: 'The workspace is temporarily unavailable.',
            operation: 'Save',
          }),
        }),
      ),
      expect(label('Assignee')).toHaveText('Unassigned'),
      expect(role('button', { name: 'Retry save' })).toExist(),
    )
  })

  test('reports a new comment without copying it into the editable baseline', () => {
    const draftTitle = 'Keep this title draft local'
    const comment = {
      id: 'comment-5',
      authorId: 'maya',
      body: 'Ready for review.',
      createdAt: '2026-10-22T14:30:00.000Z',
    }
    const commentedIssue = modifyFields(issue, {
      comments: Array.append(comment),
    })

    scene(
      { update, view: sceneView() },
      given(init(issue).model),
      type(label('Issue title'), draftTitle),
      type(label('Write a comment'), comment.body),
      click(role('button', { name: 'Post comment' })),
      Command.resolve(
        AddComment,
        CommentComposerBlock.Message.SucceededAddComment({
          issue: commentedIssue,
        }),
      ),
      expect(label('Issue title')).toHaveValue(draftTitle),
      expect(label('Write a comment')).toHaveValue(''),
      expect(text(comment.body)).not.toExist(),
      expectOutMessage(OutMessage.ObservedIssue({ issue: commentedIssue })),
    )
  })

  test('leaves the baseline unchanged when a comment returns remote edits', () => {
    const draftTitle = 'Keep this local title'
    const comment = {
      id: 'comment-5',
      authorId: 'maya',
      body: 'This arrived with a remote edit.',
      createdAt: '2026-10-22T14:30:00.000Z',
    }
    const remotelyEditedIssue = modifyFields(issue, {
      title: () => 'A teammate changed this title',
      comments: Array.append(comment),
      version: version => version + 1,
    })

    scene(
      { update, view: sceneView() },
      given(init(issue).model),
      type(label('Issue title'), draftTitle),
      type(label('Write a comment'), comment.body),
      click(role('button', { name: 'Post comment' })),
      Command.resolve(
        AddComment,
        CommentComposerBlock.Message.SucceededAddComment({
          issue: remotelyEditedIssue,
        }),
      ),
      expect(label('Issue title')).toHaveValue(draftTitle),
      expect(text(comment.body)).not.toExist(),
      expectOutMessage(
        OutMessage.ObservedIssue({ issue: remotelyEditedIssue }),
      ),
    )
  })

  test('retains edits in labeled fields and recovers from a failed save', () => {
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

    scene(
      { update, view: sceneView() },
      given(init(issue).model),
      type(label('Issue title'), title),
      type(label('Description'), savedIssue.description),
      ...selectField('Status', 'Done'),
      ...selectField('Priority', 'Medium'),
      ...selectField('Project', 'Platform'),
      ...selectField('Assignee', 'Alex Rivera'),
      click(role('button', { name: 'Save changes' })),
      Command.expectExact(
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
      expect(role('button', { name: 'Save changes' })).toBeDisabled(),
      expect(label('Status')).toBeDisabled(),
      expect(label('Priority')).toBeDisabled(),
      expect(label('Project')).toBeDisabled(),
      expect(label('Assignee')).toBeDisabled(),
      Command.resolve(
        SaveIssue,
        Message.FailedSaveIssue({
          issueId: issue.id,
          expectedVersion: issue.version,
          error: RepositoryError.Unavailable({
            message: 'The workspace is temporarily unavailable.',
            operation: 'Save',
          }),
        }),
      ),
      expect(role('alert')).toContainText(
        'The workspace is temporarily unavailable.',
      ),
      expect(label('Issue title')).toHaveValue(title),
      expect(label('Description')).toHaveValue(savedIssue.description),
      expect(label('Status')).toHaveText('Done'),
      expect(label('Priority')).toHaveText('Medium'),
      expect(label('Project')).toHaveText('Platform'),
      expect(label('Assignee')).toHaveText('Alex Rivera'),
      click(role('button', { name: 'Retry save' })),
      Command.resolve(
        SaveIssue,
        Message.SucceededSaveIssue({
          issue: savedIssue,
          expectedVersion: issue.version,
        }),
      ),
      expectOutMessage(OutMessage.Saved({ issue: savedIssue })),
      expect(role('status')).toContainText('All changes saved'),
      expect(role('button', { name: 'Save changes' })).toBeDisabled(),
    )
  })
})
