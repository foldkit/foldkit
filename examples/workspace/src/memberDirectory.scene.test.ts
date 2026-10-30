import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { initialWorkspace } from './domain/seed'
import {
  MemberDirectory,
  MemberDirectoryLive,
  type ViewInput,
} from './memberDirectory'

class MemberDirectoryScene extends Block<MemberDirectoryScene, ViewInput>()(
  'MemberDirectoryScene',
  {
    Model: Schema.Struct({ memberDirectory: MemberDirectory }),
    Message: defineMessageUnion({}),
  },
) {}

const MemberDirectorySceneLive = MemberDirectoryScene.make(
  Effect.fn(function* (_id, viewInput) {
    const memberDirectory = yield* new MemberDirectory('memberDirectory')

    return {
      model: { memberDirectory },
      update: {},
      view: model => model.memberDirectory.view(viewInput),
    }
  }),
).pipe(Layer.provide(MemberDirectoryLive))

const sceneInputs = (overrides: Partial<ViewInput> = {}): ViewInput => ({
  members: initialWorkspace.members,
  issues: initialWorkspace.issues,
  issueHrefs: { 'issue-101': '/issues/issue-101' },
  ...overrides,
})

const withMayaSelected = given({
  memberDirectory: { query: '', maybeSelectedMemberId: Option.some('maya') },
})

describe('member directory', () => {
  it.effect('filters members by name and reports an empty search', () =>
    scene(
      MemberDirectorySceneLive,
      sceneInputs(),
      expect(text('3 members')).toExist(),
      type(label('Search members'), 'maya'),
      expect(role('button', { name: 'View Maya Chen' })).toExist(),
      expect(role('button', { name: 'View Alex Rivera' })).not.toExist(),
      type(label('Search members'), 'no matching teammate'),
      expect(role('status')).toContainText('No matching members.'),
    ),
  )

  it.effect(
    'shows a selected member and renders a native assigned-issue link',
    () => {
      const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))

      return scene(
        MemberDirectorySceneLive,
        sceneInputs(),
        click(role('button', { name: 'View Maya Chen' })),
        expect(role('heading', { name: 'Maya Chen' })).toExist(),
        expect(
          role('link', { name: `${issue.identifier} ${issue.title}` }),
        ).toHaveAttr('href', '/issues/issue-101'),
      )
    },
  )

  it.effect(
    'renders non-link assigned-issue content when its href is absent',
    () => {
      const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))

      return scene(
        MemberDirectorySceneLive,
        sceneInputs({ issueHrefs: {} }),
        withMayaSelected,
        expect(
          role('link', { name: `${issue.identifier} ${issue.title}` }),
        ).not.toExist(),
        expect(text(issue.title)).toExist(),
      )
    },
  )

  it.effect('reads assignment changes from current parent inputs', () => {
    const nextIssues = Array.map(initialWorkspace.issues, issue =>
      modifyFields(issue, { maybeAssigneeId: () => Option.none() }),
    )

    return scene(
      MemberDirectorySceneLive,
      sceneInputs({ issues: nextIssues }),
      withMayaSelected,
      expect(role('heading', { name: 'Maya Chen' })).toExist(),
      expect(text('No assigned issues.')).toExist(),
    )
  })
})
