import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  Command,
  click,
  expect,
  expectNoOutMessage,
  expectOutMessage,
  role,
  scene,
  text,
} from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { initialWorkspace } from './domain/seed'
import {
  IssueBoard,
  IssueBoardLive,
  OutMessage,
  type ViewInput,
} from './issueBoard'

class IssueBoardScene extends Block<IssueBoardScene, Partial<ViewInput>>()(
  'IssueBoardScene',
  { Model: Schema.Struct({ issueBoard: IssueBoard }), OutMessage },
) {}

const IssueBoardSceneLive = IssueBoardScene.make(
  Effect.fn(function* (_id, viewInputOverrides) {
    const issueBoard = yield* new IssueBoard('issueBoard')

    const viewInput: ViewInput = {
      issues: initialWorkspace.issues,
      members: initialWorkspace.members,
      issueHrefs: { 'issue-101': '/issues/issue-101' },
      ...viewInputOverrides,
    }

    return {
      model: { issueBoard },
      update: issueBoard.on({
        RequestedCreation: (model, outMessage) => ({ model, outMessage }),
        RequestedMove: (model, outMessage) => ({ model, outMessage }),
      }),
      view: (model, h) => h.div([], [model.issueBoard.view(viewInput)]),
    }
  }),
).pipe(Layer.provide(IssueBoardLive))

describe('Issue Board view', () => {
  it.effect('renders all statuses and exposes accessible drag handles', () => {
    const handle = role('button', { name: 'Drag WSP-101' })

    return scene(
      IssueBoardSceneLive,
      {},
      expect(role('heading', { name: 'Backlog' })).toExist(),
      expect(role('heading', { name: 'Todo' })).toExist(),
      expect(role('heading', { name: 'In progress' })).toExist(),
      expect(role('heading', { name: 'Done' })).toExist(),
      expect(handle).toExist(),
    )
  })

  it.effect('renders a native issue title link when its href is supplied', () =>
    scene(
      IssueBoardSceneLive,
      {},
      expect(role('link', { name: 'Build a faster command menu' })).toHaveAttr(
        'href',
        '/issues/issue-101',
      ),
      expectNoOutMessage(),
    ),
  )

  it.effect('renders non-link title content when its href is absent', () =>
    scene(
      IssueBoardSceneLive,
      { issueHrefs: {} },
      expect(
        role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      expect(text('Build a faster command menu')).toExist(),
    ),
  )

  it.effect('requests issue creation in the selected column', () =>
    scene(
      IssueBoardSceneLive,
      {},
      click(role('button', { name: 'Create issue in In progress' })),
      expectOutMessage(OutMessage.RequestedCreation({ status: 'InProgress' })),
    ),
  )

  it.effect('disables issue actions while saving', () => {
    const handle = role('button', { name: 'Drag WSP-101' })
    const createIssueButton = role('button', {
      name: 'Create issue in In progress',
    })
    const title = text('Build a faster command menu')

    return scene(
      IssueBoardSceneLive,
      { isSaving: true },
      expect(
        role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      expect(title).toHaveAttr('aria-disabled', 'true'),
      expect(handle).toHaveAttr('aria-disabled', 'true'),
      expect(createIssueButton).toBeDisabled(),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })
})
