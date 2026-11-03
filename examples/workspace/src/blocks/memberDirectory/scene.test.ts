import { Array, Effect, Option } from 'effect'
import {
  click,
  expect,
  init,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../domain'
import { layer } from './block'
import { MemberDirectoryBlock } from './definition'

const viewInputs = {
  members: initialWorkspace.members,
  issues: initialWorkspace.issues,
  issueHrefs: { 'issue-101': '/issues/issue-101' },
}

describe('member directory', () => {
  it.effect('filters members by name and reports an empty search', () => {
    return scene(
      { block: MemberDirectoryBlock, viewInputs },
      init(),
      expect(text('3 members')).toExist(),
      type(label('Search members'), 'maya'),
      expect(role('button', { name: 'View Maya Chen' })).toExist(),
      expect(role('button', { name: 'View Alex Rivera' })).not.toExist(),
      type(label('Search members'), 'no matching teammate'),
      expect(role('status')).toContainText('No matching members.'),
    ).pipe(Effect.provide(layer))
  })

  it.effect(
    'shows a selected member and renders a native assigned-issue link',
    () => {
      const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
      return scene(
        { block: MemberDirectoryBlock, viewInputs },
        init(),
        click(role('button', { name: 'View Maya Chen' })),
        expect(role('heading', { name: 'Maya Chen' })).toExist(),
        expect(
          role('link', { name: `${issue.identifier} ${issue.title}` }),
        ).toHaveAttr('href', '/issues/issue-101'),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'renders non-link assigned-issue content when its href is absent',
    () => {
      const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
      return scene(
        {
          block: MemberDirectoryBlock,
          viewInputs: { ...viewInputs, issueHrefs: {} },
        },
        init(),
        click(role('button', { name: 'View Maya Chen' })),
        expect(
          role('link', { name: `${issue.identifier} ${issue.title}` }),
        ).not.toExist(),
        expect(text(issue.title)).toExist(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect('reads assignment changes from current parent inputs', () => {
    const nextIssues = Array.map(initialWorkspace.issues, issue =>
      modifyFields(issue, { maybeAssigneeId: () => Option.none() }),
    )
    return scene(
      {
        block: MemberDirectoryBlock,
        viewInputs: { ...viewInputs, issues: nextIssues },
      },
      init(),
      click(role('button', { name: 'View Maya Chen' })),
      expect(role('heading', { name: 'Maya Chen' })).toExist(),
      expect(text('No assigned issues.')).toExist(),
    ).pipe(Effect.provide(layer))
  })
})
