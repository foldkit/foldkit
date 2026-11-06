import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog, Listbox } from '@foldkit/ui'

import { Issue, initialWorkspace } from '../../domain'
import { StringListboxBlock } from '../../listbox'
import { CreateIssueBlock } from './block'
import { CreateIssue } from './command'
import { InMessage } from './inMessage'
import { layer } from './layer'
import { Message } from './message'
import { OutMessage } from './outMessage'

const createIssueSubject = { block: CreateIssueBlock, layer }

const viewInputs = {
  projects: initialWorkspace.projects,
}
const closeDialog = Scene.Command.resolve(
  Dialog.test.CloseDialog,
  Dialog.DialogBlock.Message.CompletedCloseDialog(),
)
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

describe('Create Issue view', () => {
  it.effect('validates a whitespace title without submitting the draft', () => {
    return Scene.scene(
      { ...createIssueSubject, viewInputs },
      Scene.init(),
      Scene.inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.type(Scene.label('Title'), '   '),
      Scene.type(Scene.label('Description'), 'Keep this draft available.'),
      Scene.click(Scene.role('button', { name: 'Create issue' })),
      Scene.expect(Scene.role('alert')).toContainText(
        'Enter an issue title before creating it.',
      ),
      Scene.expect(Scene.label('Title')).toHaveAttr('aria-invalid', 'true'),
      Scene.expect(Scene.label('Description')).toHaveValue(
        'Keep this draft available.',
      ),
      Scene.expect(
        Scene.role('button', { name: 'Create issue' }),
      ).toBeEnabled(),
      Scene.expectNoOutMessage(),
      Scene.Command.expectNone(),
    )
  })

  it.effect(
    'disables the pending form, retains a failed draft, and emits its successful retry',
    () => {
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
        id: 'issue-17',
        identifier: 'WSP-117',
        version: 1,
        comments: [],
      })
      return Scene.scene(
        { ...createIssueSubject, viewInputs },
        Scene.init(),
        Scene.inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
        Scene.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Scene.type(Scene.label('Title'), `  ${draft.title}  `),
        Scene.type(Scene.label('Description'), draft.description),
        ...selectField('Project', 'Platform'),
        ...selectField('Status', 'Backlog'),
        ...selectField('Priority', 'High'),
        Scene.click(Scene.role('button', { name: 'Create issue' })),
        Scene.expect(Scene.role('status')).toContainText('Creating issue…'),
        Scene.expect(Scene.label('Title')).toBeDisabled(),
        Scene.expect(Scene.label('Description')).toBeDisabled(),
        Scene.expect(Scene.label('Project')).toBeDisabled(),
        Scene.expect(Scene.label('Status')).toBeDisabled(),
        Scene.expect(Scene.label('Priority')).toBeDisabled(),
        Scene.expect(
          Scene.role('button', { name: 'Creating…' }),
        ).toBeDisabled(),
        Scene.expect(Scene.role('button', { name: 'Close' })).toBeEnabled(),
        Scene.Command.expectExact(CreateIssue({ draft })),
        Scene.Command.resolve(
          CreateIssue,
          Message.FailedCreateIssue({
            error: 'The workspace is temporarily unavailable.',
          }),
        ),
        Scene.expect(Scene.role('alert')).toContainText(
          'The workspace is temporarily unavailable.',
        ),
        Scene.expect(Scene.label('Title')).toHaveValue(`  ${draft.title}  `),
        Scene.expect(Scene.label('Description')).toHaveValue(draft.description),
        Scene.expect(Scene.label('Project')).toHaveText('Platform'),
        Scene.expect(Scene.label('Status')).toHaveText('Backlog'),
        Scene.expect(Scene.label('Priority')).toHaveText('High'),
        Scene.expect(
          Scene.role('button', { name: 'Create issue' }),
        ).toBeEnabled(),
        Scene.expectNoOutMessage(),
        Scene.click(Scene.role('button', { name: 'Create issue' })),
        Scene.Command.expectExact(CreateIssue({ draft })),
        Scene.Command.resolve(
          CreateIssue,
          Message.SucceededCreateIssue({ issue }),
        ),
        Scene.expectOutMessage(OutMessage.Created({ issue })),
        closeDialog,
        Scene.expect(Scene.label('Title')).not.toExist(),
      )
    },
  )

  it.effect('reopens a dismissed pending form when creation fails', () => {
    const draft = Issue.Draft.make({
      title: 'Keep the failed draft',
      description: 'The form should return with every field intact.',
      projectId: 'platform',
      status: 'Backlog',
      priority: 'High',
      maybeAssigneeId: Option.none(),
      labelIds: [],
    })
    const error = 'The workspace is temporarily unavailable.'
    return Scene.scene(
      { ...createIssueSubject, viewInputs },
      Scene.init(),
      Scene.inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.type(Scene.label('Title'), draft.title),
      Scene.type(Scene.label('Description'), draft.description),
      ...selectField('Project', 'Platform'),
      ...selectField('Status', 'Backlog'),
      ...selectField('Priority', 'High'),
      Scene.click(Scene.role('button', { name: 'Create issue' })),
      Scene.Command.expectExact(CreateIssue({ draft })),
      Scene.Command.keepPending(CreateIssue({ draft })),
      Scene.inMessage(InMessage.RequestedClose()),
      closeDialog,
      Scene.expect(Scene.label('Title')).not.toExist(),
      Scene.Command.resolve(CreateIssue, Message.FailedCreateIssue({ error })),
      Scene.Command.expectExact(
        Dialog.test.ShowDialog({
          id: 'workspace-create-issue-dialog',
          focusSelector: Dialog.initialFocusMarkerSelector,
        }),
      ),
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.expect(Scene.role('alert')).toContainText(error),
      Scene.expect(Scene.label('Title')).toHaveValue(draft.title),
      Scene.expect(Scene.label('Description')).toHaveValue(draft.description),
      Scene.expect(Scene.label('Project')).toHaveText('Platform'),
      Scene.expect(Scene.label('Status')).toHaveText('Backlog'),
      Scene.expect(Scene.label('Priority')).toHaveText('High'),
      Scene.click(Scene.role('button', { name: 'Create issue' })),
      Scene.Command.expectExact(CreateIssue({ draft })),
      Scene.Command.resolve(
        CreateIssue,
        Message.FailedCreateIssue({ error: 'Retry also failed.' }),
      ),
      Scene.expect(Scene.role('alert')).toContainText('Retry also failed.'),
      Scene.Command.expectNone(),
    )
  })

  it.effect('cancels through its Dialog without creating an issue', () => {
    return Scene.scene(
      { ...createIssueSubject, viewInputs },
      Scene.init(),
      Scene.inMessage(InMessage.RequestedOpen({ projectId: 'experience' })),
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.type(Scene.label('Title'), 'An unsent issue'),
      Scene.click(Scene.role('button', { name: 'Cancel' })),
      closeDialog,
      Scene.expect(Scene.label('Title')).not.toExist(),
      Scene.expectNoOutMessage(),
      Scene.Command.expectNone(),
    )
  })
})
