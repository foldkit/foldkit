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
import { describe, test } from 'vitest'

import { initialSnapshot } from '../domain'
import { IssueBoardBlock } from './block'
import { OutMessage } from './definition'
import { update } from './update'
import { view } from './view'

const sceneView = withViewInputs(view, {
  issues: initialSnapshot.issues,
  members: initialSnapshot.members,
  issueHrefs: { 'issue-101': '/issues/issue-101' },
})

describe('Issue Board view', () => {
  test('renders all statuses and exposes accessible drag handles', () => {
    const handle = role('button', { name: 'Drag WSP-101' })

    scene(
      { update, view: sceneView() },
      given(IssueBoardBlock.init().model),
      expect(role('heading', { name: 'Backlog' })).toExist(),
      expect(role('heading', { name: 'Todo' })).toExist(),
      expect(role('heading', { name: 'In progress' })).toExist(),
      expect(role('heading', { name: 'Done' })).toExist(),
      expect(handle).toExist(),
    )
  })

  test('renders a native issue title link when its href is supplied', () => {
    scene(
      { update, view: sceneView() },
      given(IssueBoardBlock.init().model),
      expect(role('link', { name: 'Build a faster command menu' })).toHaveAttr(
        'href',
        '/issues/issue-101',
      ),
      expectNoOutMessage(),
    )
  })

  test('renders non-link title content when its href is absent', () => {
    scene(
      { update, view: sceneView({ issueHrefs: {} }) },
      given(IssueBoardBlock.init().model),
      expect(
        role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      expect(text('Build a faster command menu')).toExist(),
    )
  })

  test('requests issue creation in the selected column', () => {
    scene(
      { update, view: sceneView() },
      given(IssueBoardBlock.init().model),
      click(role('button', { name: 'Create issue in In progress' })),
      expectOutMessage(OutMessage.RequestedCreation({ status: 'InProgress' })),
    )
  })

  test('disables issue actions while saving', () => {
    const handle = role('button', { name: 'Drag WSP-101' })
    const createIssue = role('button', {
      name: 'Create issue in In progress',
    })
    const title = text('Build a faster command menu')

    scene(
      { update, view: sceneView({ isSaving: true }) },
      given(IssueBoardBlock.init().model),
      expect(
        role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      expect(title).toHaveAttr('aria-disabled', 'true'),
      expect(handle).toHaveAttr('aria-disabled', 'true'),
      expect(createIssue).toBeDisabled(),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })
})
