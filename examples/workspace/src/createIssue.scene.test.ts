import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  Command,
  Mount,
  click,
  expect,
  expectNoOutMessage,
  expectOutMessage,
  label,
  role,
  scene,
  type,
} from 'foldkit/scene'

import { describe, it } from '@effect/vitest'
import { Dialog, Listbox } from '@foldkit/ui'

import {
  CreateIssue,
  CreateIssueLive,
  CreateNewIssue,
  Message,
  OutMessage,
} from './createIssue'
import { Issue, IssueDraft } from './domain/domain'
import { initialWorkspace } from './domain/seed'
import { WorkspaceListbox } from './listbox'
import { WorkspaceRepositoryLayer } from './services'

const SceneMessage = defineMessageUnion({
  ClickedOpen: {},
  ClickedClose: {},
})

class CreateIssueScene extends Block<CreateIssueScene>()('CreateIssueScene', {
  Model: Schema.Struct({ createIssue: CreateIssue }),
  Message: SceneMessage,
  OutMessage,
}) {}

const CreateIssueSceneLive = CreateIssueScene.make(
  Effect.fn(function* () {
    const createIssue = yield* new CreateIssue('createIssue')

    return {
      model: { createIssue },
      update: {
        ClickedOpen: model => ({
          model,
          messages: [
            model.createIssue.send(
              Message.RequestedOpen({ projectId: 'experience' }),
            ),
          ],
        }),
        ClickedClose: model => ({
          model,
          messages: [model.createIssue.send(Message.RequestedClose())],
        }),
        ...createIssue.on({
          Created: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button([h.OnClick(SceneMessage.ClickedOpen())], ['Request open']),
            h.button(
              [h.OnClick(SceneMessage.ClickedClose())],
              ['Request close'],
            ),
            model.createIssue.view({ projects: initialWorkspace.projects }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(CreateIssueLive))

const requestOpen = click(role('button', { name: 'Request open' }))
const requestClose = click(role('button', { name: 'Request close' }))
const showDialog = Command.resolve(
  Dialog.test.ShowDialog,
  Dialog.Dialog.Message.SucceededShowDialog(),
)
const closeDialog = Command.resolve(
  Dialog.test.CloseDialog,
  Dialog.Dialog.Message.CompletedCloseDialog(),
)
const selectField = (fieldLabel: string, optionLabel: string) => [
  click(label(fieldLabel)),
  Command.resolve(
    Listbox.test.FocusListboxItems,
    WorkspaceListbox.Message.CompletedFocusListboxItems(),
  ),
  Mount.resolve(
    Listbox.test.AnchorListbox,
    WorkspaceListbox.Message.CompletedAnchorListbox(),
  ),
  Mount.resolve(
    Listbox.test.PortalListboxBackdrop,
    WorkspaceListbox.Message.CompletedPortalListboxBackdrop(),
  ),
  click(role('option', { name: optionLabel })),
  Command.resolve(
    Listbox.test.FocusListboxButton,
    WorkspaceListbox.Message.CompletedFocusListboxButton(),
  ),
  Mount.expectEnded(
    Listbox.test.AnchorListbox,
    Listbox.test.PortalListboxBackdrop,
  ),
]

describe('Create Issue view', () => {
  it.effect('validates a whitespace title without submitting the draft', () =>
    scene(
      CreateIssueSceneLive,
      requestOpen,
      showDialog,
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
    ).pipe(Effect.provide(WorkspaceRepositoryLayer)),
  )

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
        CreateIssueSceneLive,
        requestOpen,
        showDialog,
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
        Command.expectExact(CreateNewIssue({ draft })),
        Command.resolve(
          CreateNewIssue,
          Message.FailedCreateNewIssue({
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
        Command.expectExact(CreateNewIssue({ draft })),
        Command.resolve(
          CreateNewIssue,
          Message.SucceededCreateNewIssue({ issue }),
        ),
        expectOutMessage(OutMessage.Created({ issue })),
        closeDialog,
        expect(label('Title')).not.toExist(),
      ).pipe(Effect.provide(WorkspaceRepositoryLayer))
    },
  )

  it.effect('reopens a dismissed pending form when creation fails', () => {
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

    return scene(
      CreateIssueSceneLive,
      requestOpen,
      showDialog,
      type(label('Title'), draft.title),
      type(label('Description'), draft.description),
      ...selectField('Project', 'Platform'),
      ...selectField('Status', 'Backlog'),
      ...selectField('Priority', 'High'),
      click(role('button', { name: 'Create issue' })),
      Command.keepPending(CreateNewIssue({ draft })),
      requestClose,
      closeDialog,
      expect(label('Title')).not.toExist(),
      Command.resolve(CreateNewIssue, Message.FailedCreateNewIssue({ error })),
      Command.expectExact(
        Dialog.test.ShowDialog({
          id: 'workspace-create-issue-dialog',
          focusSelector: Dialog.initialFocusMarkerSelector,
        }),
      ),
      showDialog,
      expect(role('alert')).toContainText(error),
      expect(label('Title')).toHaveValue(draft.title),
      expect(label('Description')).toHaveValue(draft.description),
      expect(label('Project')).toHaveText('Platform'),
      expect(label('Status')).toHaveText('Backlog'),
      expect(label('Priority')).toHaveText('High'),
      click(role('button', { name: 'Create issue' })),
      Command.expectExact(CreateNewIssue({ draft })),
      Command.resolve(
        CreateNewIssue,
        Message.FailedCreateNewIssue({ error: 'Retry also failed.' }),
      ),
      expect(role('alert')).toContainText('Retry also failed.'),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer))
  })

  it.effect('cancels through its Dialog without creating an issue', () =>
    scene(
      CreateIssueSceneLive,
      requestOpen,
      showDialog,
      type(label('Title'), 'An unsent issue'),
      click(role('button', { name: 'Cancel' })),
      closeDialog,
      expect(label('Title')).not.toExist(),
      expectNoOutMessage(),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer)),
  )
})
