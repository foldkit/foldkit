import { Array, Option } from 'effect'
import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../domain'
import { MemberDirectoryBlock } from './block'
import { layer } from './layer'

const viewInputs = {
  members: initialWorkspace.members,
  issues: initialWorkspace.issues,
  issueHrefsById: { 'issue-101': '/issues/issue-101' },
}

describe('member directory', () => {
  it.effect('filters members by name and reports an empty search', () => {
    return Scene.scene(
      { block: MemberDirectoryBlock, layer, viewInputs },
      Scene.init(),
      Scene.expect(Scene.text('3 members')).toExist(),
      Scene.type(Scene.label('Search members'), 'maya'),
      Scene.expect(Scene.role('button', { name: 'View Maya Chen' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'View Alex Rivera' }),
      ).not.toExist(),
      Scene.type(Scene.label('Search members'), 'no matching teammate'),
      Scene.expect(Scene.role('status')).toContainText('No matching members.'),
    )
  })

  it.effect(
    'shows a selected member and renders a native assigned-issue link',
    () => {
      const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
      return Scene.scene(
        { block: MemberDirectoryBlock, layer, viewInputs },
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'View Maya Chen' })),
        Scene.expect(Scene.role('heading', { name: 'Maya Chen' })).toExist(),
        Scene.expect(
          Scene.role('link', { name: `${issue.identifier} ${issue.title}` }),
        ).toHaveAttr('href', '/issues/issue-101'),
      )
    },
  )

  it.effect(
    'renders non-link assigned-issue content when its href is absent',
    () => {
      const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
      return Scene.scene(
        {
          block: MemberDirectoryBlock,
          layer,
          viewInputs: { ...viewInputs, issueHrefsById: {} },
        },
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'View Maya Chen' })),
        Scene.expect(
          Scene.role('link', { name: `${issue.identifier} ${issue.title}` }),
        ).not.toExist(),
        Scene.expect(Scene.text(issue.title)).toExist(),
      )
    },
  )

  it.effect('reads assignment changes from current parent inputs', () => {
    const nextIssues = Array.map(initialWorkspace.issues, issue =>
      modifyFields(issue, { maybeAssigneeId: () => Option.none() }),
    )
    return Scene.scene(
      {
        block: MemberDirectoryBlock,
        layer,
        viewInputs: { ...viewInputs, issues: nextIssues },
      },
      Scene.init(),
      Scene.click(Scene.role('button', { name: 'View Maya Chen' })),
      Scene.expect(Scene.role('heading', { name: 'Maya Chen' })).toExist(),
      Scene.expect(Scene.text('No assigned issues.')).toExist(),
    )
  })
})
