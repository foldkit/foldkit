import { Array, Option } from 'effect'
import {
  click,
  expect,
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

import { initialSnapshot } from '../domain'
import { MemberDirectoryBlock, Message, update, view } from './memberDirectory'

const sceneView = withViewInputs(view, {
  members: initialSnapshot.members,
  issues: initialSnapshot.issues,
  issueHrefs: { 'issue-101': '/issues/issue-101' },
})

describe('member directory', () => {
  test('filters members by name and reports an empty search', () => {
    scene(
      { update, view: sceneView() },
      given(MemberDirectoryBlock.init().model),
      expect(text('3 members')).toExist(),
      type(label('Search members'), 'maya'),
      expect(role('button', { name: 'View Maya Chen' })).toExist(),
      expect(role('button', { name: 'View Alex Rivera' })).not.toExist(),
      type(label('Search members'), 'no matching teammate'),
      expect(role('status')).toContainText('No matching members.'),
    )
  })

  test('shows a selected member and renders a native assigned-issue link', () => {
    const issue = Option.getOrThrow(Array.head(initialSnapshot.issues))

    scene(
      { update, view: sceneView() },
      given(MemberDirectoryBlock.init().model),
      click(role('button', { name: 'View Maya Chen' })),
      expect(role('heading', { name: 'Maya Chen' })).toExist(),
      expect(
        role('link', { name: `${issue.identifier} ${issue.title}` }),
      ).toHaveAttr('href', '/issues/issue-101'),
    )
  })

  test('renders non-link assigned-issue content when its href is absent', () => {
    const issue = Option.getOrThrow(Array.head(initialSnapshot.issues))
    const directoryInit = MemberDirectoryBlock.init()
    const memberSelection = update(
      directoryInit.model,
      Message.ClickedMember({ memberId: 'maya' }),
    )

    scene(
      { update, view: sceneView({ issueHrefs: {} }) },
      given(memberSelection.model),
      expect(
        role('link', { name: `${issue.identifier} ${issue.title}` }),
      ).not.toExist(),
      expect(text(issue.title)).toExist(),
    )
  })

  test('reads assignment changes from current parent inputs', () => {
    const directoryInit = MemberDirectoryBlock.init()
    const memberSelection = update(
      directoryInit.model,
      Message.ClickedMember({ memberId: 'maya' }),
    )
    const nextIssues = Array.map(initialSnapshot.issues, issue =>
      modifyFields(issue, { maybeAssigneeId: () => Option.none() }),
    )

    scene(
      { update, view: sceneView({ issues: nextIssues }) },
      given(memberSelection.model),
      expect(role('heading', { name: 'Maya Chen' })).toExist(),
      expect(text('No assigned issues.')).toExist(),
    )
  })
})
