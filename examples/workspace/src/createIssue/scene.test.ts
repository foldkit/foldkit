import { Array, Option } from 'effect'
import {
  Command,
  Mount,
  click,
  expect,
  expectNoOutMessage,
  expectOutMessage,
  given,
  label,
  role,
  scene,
  type,
  withViewInputs,
} from 'foldkit/scene'
import { describe, expect as expectValue, test } from 'vitest'

import { Dialog, DialogBlock, Listbox } from '@foldkit/ui'

import { Issue, IssueDraft, initialSnapshot } from '../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
  listboxViewInputs,
} from '../listbox'
import { CreateIssueBlock } from './block'
import { CreateIssue } from './command'
import {
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { CreateState, Message, OutMessage } from './definition'
import { update } from './update'
import { view } from './view'

const sceneView = withViewInputs(view, {
  projects: initialSnapshot.projects,
})
const createIssueOpen = CreateIssueBlock.operations.requestOpen(
  CreateIssueBlock.init().model,
  { projectId: 'experience' },
)
const acquireDialog = Mount.resolve(
  Dialog.test.AcquireResources,
  DialogBlock.Message.SucceededAcquireResources(),
)
const closeDialog = Command.resolve(
  Dialog.test.CloseDialog,
  DialogBlock.Message.CompletedCloseDialog(),
)
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

describe('Create Issue view', () => {
  test('validates a whitespace title without submitting the draft', () => {
    scene(
      { update, view: sceneView() },
      given(createIssueOpen.model),
      acquireDialog,
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

  test('disables the pending form, retains a failed draft, and emits its successful retry', () => {
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

    scene(
      { update, view: sceneView() },
      given(createIssueOpen.model),
      acquireDialog,
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
      Mount.expectEnded(Dialog.test.AcquireResources),
      expect(label('Title')).not.toExist(),
    )
  })

  test('reopens a dismissed pending form when creation fails', () => {
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
    const titled = update(
      createIssueOpen.model,
      Message.UpdatedTitle({ value: draft.title }),
    )
    const described = update(
      titled.model,
      Message.UpdatedDescription({ value: draft.description }),
    )
    const projectSelected = update(
      described.model,
      ProjectListboxBinding.embedView({
        slotId: described.model.projectListbox.id,
        model: described.model.projectListbox,
        viewInputs: listboxViewInputs({
          value: described.model.projectId,
          options: [],
        }),
      }).toParentMessage(
        WorkspaceListboxBlock.Message.RequestedSelectItem({
          item: draft.projectId,
        }),
      ),
    )
    const statusSelected = update(
      projectSelected.model,
      StatusListboxBinding.embedView({
        slotId: projectSelected.model.statusListbox.id,
        model: projectSelected.model.statusListbox,
        viewInputs: listboxViewInputs({
          value: projectSelected.model.status,
          options: [],
        }),
      }).toParentMessage(
        StatusListboxBlock.Message.RequestedSelectItem({
          item: draft.status,
        }),
      ),
    )
    const prioritySelected = update(
      statusSelected.model,
      PriorityListboxBinding.embedView({
        slotId: statusSelected.model.priorityListbox.id,
        model: statusSelected.model.priorityListbox,
        viewInputs: listboxViewInputs({
          value: statusSelected.model.priority,
          options: [],
        }),
      }).toParentMessage(
        PriorityListboxBlock.Message.RequestedSelectItem({
          item: draft.priority,
        }),
      ),
    )
    const submitted = update(
      prioritySelected.model,
      Message.SubmittedIssueForm(),
    )
    const dismissed = update(submitted.model, Message.RequestedClose())
    const failed = update(dismissed.model, Message.FailedCreateIssue({ error }))
    const reopenDialog = Option.getOrThrow(Array.head(failed.commands ?? []))

    expectValue(dismissed.model.dialog.isOpen).toBe(false)
    expectValue(failed.model.dialog.isOpen).toBe(true)
    expectValue(failed.model.createState).toEqual(CreateState.Failed({ error }))
    expectValue(failed.commands).toHaveLength(1)
    expectValue(reopenDialog.args).toEqual({
      id: 'workspace-create-issue-dialog',
      focusSelector: Dialog.initialFocusMarkerSelector,
    })

    scene(
      { update, view: sceneView() },
      given(failed.model),
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

  test('cancels through its Dialog without creating an issue', () => {
    scene(
      { update, view: sceneView() },
      given(createIssueOpen.model),
      acquireDialog,
      type(label('Title'), 'An unsent issue'),
      click(role('button', { name: 'Cancel' })),
      closeDialog,
      Mount.expectEnded(Dialog.test.AcquireResources),
      expect(label('Title')).not.toExist(),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })
})
