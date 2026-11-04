import { Array, Option } from 'effect'
import {
  Command,
  Mount,
  click,
  expect,
  expectNoOutMessage,
  expectOutMessage,
  given,
  inMessage,
  init,
  label,
  role,
  scene,
  type,
} from 'foldkit/scene'
import { type TestBlock, withBlock } from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect as expectValue } from 'vitest'

import { it } from '@effect/vitest'
import {
  DialogBlock,
  test as DialogTest,
  initialFocusMarkerSelector as dialogInitialFocusMarkerSelector,
} from '@foldkit/ui/dialog'
import { test as ListboxTest } from '@foldkit/ui/listbox'

import { Issue, IssueDraft, initialWorkspace } from '../../domain'
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
import { InMessage } from './inMessage'
import { Message } from './message'
import { CreateState } from './model'
import { OutMessage } from './outMessage'

const createIssueSubject = { block: CreateIssueBlock, layer }

const viewInputs = {
  projects: initialWorkspace.projects,
}
const createIssueRequestOpen = (
  executable: TestBlock<typeof createIssueSubject>,
) => {
  return executable.operations.requestOpen(executable.init().model, {
    projectId: 'experience',
  })
}
const acquireDialog = Mount.resolve(
  DialogTest.AcquireResources,
  DialogBlock.Message.SucceededAcquireResources(),
)
const closeDialog = Command.resolve(
  DialogTest.CloseDialog,
  DialogBlock.Message.CompletedCloseDialog(),
)
const selectField = (fieldLabel: string, optionLabel: string) => [
  click(label(fieldLabel)),
  Command.resolve(
    ListboxTest.FocusListboxItems,
    WorkspaceListboxBlock.Message.CompletedFocusListboxItems(),
  ),
  Mount.resolve(
    ListboxTest.AnchorListbox,
    WorkspaceListboxBlock.Message.CompletedAnchorListbox(),
  ),
  Mount.resolve(
    ListboxTest.PortalListboxBackdrop,
    WorkspaceListboxBlock.Message.CompletedPortalListboxBackdrop(),
  ),
  click(role('option', { name: optionLabel })),
  Command.resolve(
    ListboxTest.FocusListboxButton,
    WorkspaceListboxBlock.Message.CompletedFocusListboxButton(),
  ),
  Mount.expectEnded(
    ListboxTest.AnchorListbox,
    ListboxTest.PortalListboxBackdrop,
  ),
]

describe('Create Issue view', () => {
  it.effect('validates a whitespace title without submitting the draft', () => {
    return scene(
      { ...createIssueSubject, viewInputs },
      init(),
      inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      type(label('Title'), '   '),
      type(label('Description'), 'Keep this draft available.'),
      click(role('button', { name: 'Create issue' })),
      expect(role('alert')).toContainText(
        'Enter an issue title before creating it.',
      ),
      expect(label('Title')).toHaveAttr('aria-invalid', 'true'),
      expect(label('Description')).toHaveValue('Keep this draft available.'),
      expect(role('button', { name: 'Create issue' })).toBeEnabled(),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })

  it.effect(
    'disables the pending form, retains a failed draft, and emits its successful retry',
    () => {
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
        id: 'issue-17',
        identifier: 'WSP-117',
        version: 1,
        comments: [],
      })
      return scene(
        { ...createIssueSubject, viewInputs },
        init(),
        inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
        Command.resolve(
          DialogTest.ShowDialog,
          DialogBlock.Message.SucceededShowDialog(),
        ),
        type(label('Title'), `  ${draft.title}  `),
        type(label('Description'), draft.description),
        ...selectField('Project', 'Platform'),
        ...selectField('Status', 'Backlog'),
        ...selectField('Priority', 'High'),
        click(role('button', { name: 'Create issue' })),
        expect(role('status')).toContainText('Creating issue…'),
        expect(label('Title')).toBeDisabled(),
        expect(label('Description')).toBeDisabled(),
        expect(label('Project')).toBeDisabled(),
        expect(label('Status')).toBeDisabled(),
        expect(label('Priority')).toBeDisabled(),
        expect(role('button', { name: 'Creating…' })).toBeDisabled(),
        expect(role('button', { name: 'Close' })).toBeEnabled(),
        Command.expectExact(CreateIssue({ draft })),
        Command.resolve(
          CreateIssue,
          Message.FailedCreateIssue({
            error: 'The workspace is temporarily unavailable.',
          }),
        ),
        expect(role('alert')).toContainText(
          'The workspace is temporarily unavailable.',
        ),
        expect(label('Title')).toHaveValue(`  ${draft.title}  `),
        expect(label('Description')).toHaveValue(draft.description),
        expect(label('Project')).toHaveText('Platform'),
        expect(label('Status')).toHaveText('Backlog'),
        expect(label('Priority')).toHaveText('High'),
        expect(role('button', { name: 'Create issue' })).toBeEnabled(),
        expectNoOutMessage(),
        click(role('button', { name: 'Create issue' })),
        Command.expectExact(CreateIssue({ draft })),
        Command.resolve(CreateIssue, Message.SucceededCreateIssue({ issue })),
        expectOutMessage(OutMessage.Created({ issue })),
        closeDialog,
        expect(label('Title')).not.toExist(),
      )
    },
  )

  it.effect('reopens a dismissed pending form when creation fails', () => {
    return withBlock(createIssueSubject, executable => {
      const update = executable.update

      const draft = IssueDraft.make({
        title: 'Keep the failed draft',
        description: 'The form should return with every field intact.',
        projectId: 'platform',
        status: 'Backlog',
        priority: 'High',
        maybeAssigneeId: Option.none(),
        labelIds: [],
      })

      const error = 'The workspace is temporarily unavailable.'

      const titleUpdate = update(
        createIssueRequestOpen(executable).model,
        Message.UpdatedTitle({ value: draft.title }),
      )

      const descriptionUpdate = update(
        titleUpdate.model,
        Message.UpdatedDescription({ value: draft.description }),
      )

      const projectSelectionUpdate = update(
        descriptionUpdate.model,
        toParentMessageFor(executable)(
          ProjectListboxBinding,
          WorkspaceListboxBlock.Message.RequestedSelectItem({
            item: draft.projectId,
          }),
        ),
      )

      const statusSelectionUpdate = update(
        projectSelectionUpdate.model,
        toParentMessageFor(executable)(
          StatusListboxBinding,
          StatusListboxBlock.Message.RequestedSelectItem({
            item: draft.status,
          }),
        ),
      )

      const prioritySelectionUpdate = update(
        statusSelectionUpdate.model,
        toParentMessageFor(executable)(
          PriorityListboxBinding,
          PriorityListboxBlock.Message.RequestedSelectItem({
            item: draft.priority,
          }),
        ),
      )

      const issueSubmission = update(
        prioritySelectionUpdate.model,
        Message.SubmittedIssueForm(),
      )

      const issueClose = executable.inMessageUpdate(
        issueSubmission.model,
        InMessage.RequestedClose(),
      )

      const creationFailure = update(
        issueClose.model,
        Message.FailedCreateIssue({ error }),
      )

      const reopenDialog = Option.getOrThrow(
        Array.head(creationFailure.commands ?? []),
      )

      expectValue(issueClose.model.dialog.isOpen).toBe(false)

      expectValue(creationFailure.model.dialog.isOpen).toBe(true)

      expectValue(creationFailure.model.createState).toEqual(
        CreateState.Failed({ error }),
      )

      expectValue(creationFailure.commands).toHaveLength(1)

      expectValue(reopenDialog.args).toEqual({
        id: 'workspace-create-issue-dialog',
        focusSelector: dialogInitialFocusMarkerSelector,
      })
      return scene(
        { ...createIssueSubject, viewInputs },
        given(creationFailure.model),
        acquireDialog,
        expect(role('alert')).toContainText(error),
        expect(label('Title')).toHaveValue(draft.title),
        expect(label('Description')).toHaveValue(draft.description),
        expect(label('Project')).toHaveText('Platform'),
        expect(label('Status')).toHaveText('Backlog'),
        expect(label('Priority')).toHaveText('High'),
        click(role('button', { name: 'Create issue' })),
        Command.expectExact(CreateIssue({ draft })),
        Command.resolve(
          CreateIssue,
          Message.FailedCreateIssue({ error: 'Retry also failed.' }),
        ),
        expect(role('alert')).toContainText('Retry also failed.'),
        Command.expectNone(),
      )
    })
  })

  it.effect('cancels through its Dialog without creating an issue', () => {
    return scene(
      { ...createIssueSubject, viewInputs },
      init(),
      inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      type(label('Title'), 'An unsent issue'),
      click(role('button', { name: 'Cancel' })),
      closeDialog,
      expect(label('Title')).not.toExist(),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })
})
