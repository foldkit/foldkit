import { Effect } from 'effect'
import {
  Command,
  click,
  expect,
  expectNoOutMessage,
  expectOutMessage,
  init,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../domain'
import { layer } from './block'
import { IssueBoardBlock } from './definition'
import { OutMessage } from './outMessage'

const viewInputs = {
  issues: initialWorkspace.issues,
  members: initialWorkspace.members,
  issueHrefs: { 'issue-101': '/issues/issue-101' },
}

describe('Issue Board view', () => {
  it.effect('renders all statuses and exposes accessible drag handles', () => {
    const handle = role('button', { name: 'Drag WSP-101' })
    return scene(
      { block: IssueBoardBlock, viewInputs },
      init(),
      expect(role('heading', { name: 'Backlog' })).toExist(),
      expect(role('heading', { name: 'Todo' })).toExist(),
      expect(role('heading', { name: 'In progress' })).toExist(),
      expect(role('heading', { name: 'Done' })).toExist(),
      expect(handle).toExist(),
    ).pipe(Effect.provide(layer))
  })

  it.effect(
    'renders a native issue title link when its href is supplied',
    () => {
      return scene(
        { block: IssueBoardBlock, viewInputs },
        init(),
        expect(
          role('link', { name: 'Build a faster command menu' }),
        ).toHaveAttr('href', '/issues/issue-101'),
        expectNoOutMessage(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect('renders non-link title content when its href is absent', () => {
    return scene(
      {
        block: IssueBoardBlock,
        viewInputs: { ...viewInputs, ...{ issueHrefs: {} } },
      },
      init(),
      expect(
        role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      expect(text('Build a faster command menu')).toExist(),
    ).pipe(Effect.provide(layer))
  })

  it.effect('requests issue creation in the selected column', () => {
    return scene(
      { block: IssueBoardBlock, viewInputs },
      init(),
      click(role('button', { name: 'Create issue in In progress' })),
      expectOutMessage(OutMessage.RequestedCreation({ status: 'InProgress' })),
    ).pipe(Effect.provide(layer))
  })

  it.effect('disables issue actions while saving', () => {
    const handle = role('button', { name: 'Drag WSP-101' })

    const createIssueButton = role('button', {
      name: 'Create issue in In progress',
    })

    const title = text('Build a faster command menu')
    return scene(
      {
        block: IssueBoardBlock,
        viewInputs: { ...viewInputs, ...{ isSaving: true } },
      },
      init(),
      expect(
        role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      expect(title).toHaveAttr('aria-disabled', 'true'),
      expect(handle).toHaveAttr('aria-disabled', 'true'),
      expect(createIssueButton).toBeDisabled(),
      expectNoOutMessage(),
      Command.expectNone(),
    ).pipe(Effect.provide(layer))
  })
})
