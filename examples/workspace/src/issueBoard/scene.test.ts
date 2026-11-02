import { Effect } from 'effect'
import {
  Command,
  click,
  expect,
  expectNoOutMessage,
  expectOutMessage,
  given,
  role,
  scene,
  text,
  withViewInputs,
} from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { describe, test } from 'vitest'

import { initialWorkspace } from '../domain'
import { layer } from './block'
import { IssueBoardBlock } from './definition'
import { OutMessage } from './outMessage'

const sceneView = (executable: Story.TestBlock<typeof IssueBoardBlock>) => {
  const view = executable.view
  return withViewInputs(view, {
    issues: initialWorkspace.issues,
    members: initialWorkspace.members,
    issueHrefs: { 'issue-101': '/issues/issue-101' },
  })
}

describe('Issue Board view', () => {
  test('renders all statuses and exposes accessible drag handles', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        const handle = role('button', { name: 'Drag WSP-101' })

        scene(
          { update, view: sceneView(executable)() },
          given(executable.init().model),
          expect(role('heading', { name: 'Backlog' })).toExist(),
          expect(role('heading', { name: 'Todo' })).toExist(),
          expect(role('heading', { name: 'In progress' })).toExist(),
          expect(role('heading', { name: 'Done' })).toExist(),
          expect(handle).toExist(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('renders a native issue title link when its href is supplied', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        scene(
          { update, view: sceneView(executable)() },
          given(executable.init().model),
          expect(
            role('link', { name: 'Build a faster command menu' }),
          ).toHaveAttr('href', '/issues/issue-101'),
          expectNoOutMessage(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('renders non-link title content when its href is absent', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        scene(
          { update, view: sceneView(executable)({ issueHrefs: {} }) },
          given(executable.init().model),
          expect(
            role('link', { name: 'Build a faster command menu' }),
          ).not.toExist(),
          expect(text('Build a faster command menu')).toExist(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('requests issue creation in the selected column', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        scene(
          { update, view: sceneView(executable)() },
          given(executable.init().model),
          click(role('button', { name: 'Create issue in In progress' })),
          expectOutMessage(
            OutMessage.RequestedCreation({ status: 'InProgress' }),
          ),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('disables issue actions while saving', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        const handle = role('button', { name: 'Drag WSP-101' })
        const createIssueButton = role('button', {
          name: 'Create issue in In progress',
        })
        const title = text('Build a faster command menu')

        scene(
          { update, view: sceneView(executable)({ isSaving: true }) },
          given(executable.init().model),
          expect(
            role('link', { name: 'Build a faster command menu' }),
          ).not.toExist(),
          expect(title).toHaveAttr('aria-disabled', 'true'),
          expect(handle).toHaveAttr('aria-disabled', 'true'),
          expect(createIssueButton).toBeDisabled(),
          expectNoOutMessage(),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })
})
