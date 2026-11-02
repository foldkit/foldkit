import { Array, Effect, Option } from 'effect'
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
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { initialWorkspace } from '../domain'
import { layer } from './block'
import { MemberDirectoryBlock } from './definition'
import { Message } from './message'

const sceneView = (
  executable: Story.TestBlock<typeof MemberDirectoryBlock>,
) => {
  const view = executable.view
  return withViewInputs(view, {
    members: initialWorkspace.members,
    issues: initialWorkspace.issues,
    issueHrefs: { 'issue-101': '/issues/issue-101' },
  })
}

describe('member directory', () => {
  test('filters members by name and reports an empty search', () => {
    return Effect.runPromise(
      Story.withBlock(MemberDirectoryBlock, executable => {
        const update = executable.update

        scene(
          { update, view: sceneView(executable)() },
          given(executable.init().model),
          expect(text('3 members')).toExist(),
          type(label('Search members'), 'maya'),
          expect(role('button', { name: 'View Maya Chen' })).toExist(),
          expect(role('button', { name: 'View Alex Rivera' })).not.toExist(),
          type(label('Search members'), 'no matching teammate'),
          expect(role('status')).toContainText('No matching members.'),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('shows a selected member and renders a native assigned-issue link', () => {
    return Effect.runPromise(
      Story.withBlock(MemberDirectoryBlock, executable => {
        const update = executable.update

        const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))

        scene(
          { update, view: sceneView(executable)() },
          given(executable.init().model),
          click(role('button', { name: 'View Maya Chen' })),
          expect(role('heading', { name: 'Maya Chen' })).toExist(),
          expect(
            role('link', { name: `${issue.identifier} ${issue.title}` }),
          ).toHaveAttr('href', '/issues/issue-101'),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('renders non-link assigned-issue content when its href is absent', () => {
    return Effect.runPromise(
      Story.withBlock(MemberDirectoryBlock, executable => {
        const update = executable.update

        const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
        const directoryInit = executable.init()
        const directoryUpdate = update(
          directoryInit.model,
          Message.ClickedMember({ memberId: 'maya' }),
        )

        scene(
          { update, view: sceneView(executable)({ issueHrefs: {} }) },
          given(directoryUpdate.model),
          expect(
            role('link', { name: `${issue.identifier} ${issue.title}` }),
          ).not.toExist(),
          expect(text(issue.title)).toExist(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('reads assignment changes from current parent inputs', () => {
    return Effect.runPromise(
      Story.withBlock(MemberDirectoryBlock, executable => {
        const update = executable.update

        const directoryInit = executable.init()
        const directoryUpdate = update(
          directoryInit.model,
          Message.ClickedMember({ memberId: 'maya' }),
        )
        const nextIssues = Array.map(initialWorkspace.issues, issue =>
          modifyFields(issue, { maybeAssigneeId: () => Option.none() }),
        )

        scene(
          { update, view: sceneView(executable)({ issues: nextIssues }) },
          given(directoryUpdate.model),
          expect(role('heading', { name: 'Maya Chen' })).toExist(),
          expect(text('No assigned issues.')).toExist(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })
})
