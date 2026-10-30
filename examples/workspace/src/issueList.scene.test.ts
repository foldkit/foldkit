import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  Command,
  Mount,
  click,
  expect,
  expectOutMessage,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'

import { describe, it } from '@effect/vitest'
import { Listbox } from '@foldkit/ui'

import { IssueFilters } from './domain/domain'
import { initialWorkspace } from './domain/seed'
import {
  IssueList,
  IssueListLive,
  OutMessage,
  type ViewInputs,
} from './issueList'
import { WorkspaceListbox } from './listbox'

class IssueListScene extends Block<IssueListScene, ViewInputs>()(
  'IssueListScene',
  {
    Model: Schema.Struct({ issueList: IssueList }),
    Message: defineMessageUnion({}),
    OutMessage,
  },
) {}

const IssueListSceneLive = IssueListScene.make(
  Effect.fn(function* (_id, viewInputs) {
    const issueList = yield* new IssueList('issueList')

    return {
      model: { issueList },
      update: {
        ...issueList.on({
          ChangedQuery: (model, outMessage) => ({ model, outMessage }),
          ChangedStatusFilter: (model, outMessage) => ({ model, outMessage }),
          ChangedSort: (model, outMessage) => ({ model, outMessage }),
          ChangedGrouping: (model, outMessage) => ({ model, outMessage }),
          RequestedClearFilters: (model, outMessage) => ({
            model,
            outMessage,
          }),
          RequestedCreation: (model, outMessage) => ({ model, outMessage }),
          SavedFilter: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: model => model.issueList.view(viewInputs),
    }
  }),
).pipe(Layer.provide(IssueListLive))

const initialFilters = IssueFilters.make({
  query: '',
  maybeStatus: Option.none(),
  sort: 'Identifier',
  groupBy: 'None',
})

const sceneInputs = (filters: IssueFilters = initialFilters): ViewInputs => ({
  issues: Array.take(initialWorkspace.issues, 2),
  members: initialWorkspace.members,
  projects: initialWorkspace.projects,
  maybeActiveIssueId: Option.none(),
  filters,
  issueHrefs: { 'issue-101': '/issues/issue-101' },
})

const openFilter = (filter: string) => [
  click(role('button', { name: filter })),
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
]

const finishSelection = () => [
  Command.resolve(
    Listbox.test.FocusListboxButton,
    WorkspaceListbox.Message.CompletedFocusListboxButton(),
  ),
  Mount.expectEnded(
    Listbox.test.AnchorListbox,
    Listbox.test.PortalListboxBackdrop,
  ),
]

describe('Issue List view', () => {
  it.effect(
    'disables issue creation when there is no project to create it in',
    () => {
      return scene(
        IssueListSceneLive,
        {
          issues: [],
          members: initialWorkspace.members,
          projects: [],
          maybeActiveIssueId: Option.none(),
          filters: initialFilters,
          issueHrefs: {},
        },
        expect(role('button', { name: 'New issue' })).toBeDisabled(),
      )
    },
  )

  it.effect(
    'reports search and clear requests while rendering controlled filters',
    () => {
      const filters = IssueFilters.make({
        ...initialFilters,
        query: 'no matching issue',
      })

      return scene(
        IssueListSceneLive,
        sceneInputs(filters),
        expect(label('Search issues')).toHaveValue('no matching issue'),
        expect(role('heading', { name: 'No matching issues' })).toExist(),
        type(label('Search issues'), 'keyboard'),
        expectOutMessage(OutMessage.ChangedQuery({ query: 'keyboard' })),
        click(role('button', { name: 'Clear filters' })),
        expectOutMessage(OutMessage.RequestedClearFilters()),
        expect(label('Search issues')).toHaveValue('no matching issue'),
      )
    },
  )

  it.effect(
    'renders issue hrefs and leaves issues without hrefs as content',
    () => {
      return scene(
        IssueListSceneLive,
        sceneInputs(),
        expect(
          role('link', { name: 'WSP-101 Build a faster command menu' }),
        ).toHaveAttr('href', '/issues/issue-101'),
        expect(
          role('link', {
            name: 'WSP-102 Keep issue drafts when switching projects',
          }),
        ).not.toExist(),
        expect(text('Keep issue drafts when switching projects')).toExist(),
      )
    },
  )

  it.effect(
    'renders grouped controlled results and saves the current filters',
    () => {
      const filters = IssueFilters.make({
        query: '',
        maybeStatus: Option.none(),
        sort: 'Priority',
        groupBy: 'Project',
      })

      return scene(
        IssueListSceneLive,
        sceneInputs(filters),
        expect(role('heading', { name: 'Experience · 1' })).toExist(),
        expect(role('heading', { name: 'Platform · 1' })).toExist(),
        type(label('Saved view name'), '  Project work  '),
        click(role('button', { name: 'Save view' })),
        expectOutMessage(
          OutMessage.SavedFilter({
            name: 'Project work',
            filters,
          }),
        ),
        expect(label('Saved view name')).toHaveValue(''),
      )
    },
  )

  it.effect(
    'reports validated Listbox selections without changing controlled values',
    () => {
      return scene(
        IssueListSceneLive,
        sceneInputs(),
        ...openFilter('Filter by status'),
        click(role('option', { name: 'Todo' })),
        expectOutMessage(
          OutMessage.ChangedStatusFilter({ maybeStatus: Option.some('Todo') }),
        ),
        ...finishSelection(),
        expect(role('button', { name: 'Filter by status' })).toHaveText(
          'All statuses',
        ),
        ...openFilter('Sort issues'),
        click(role('option', { name: 'Priority' })),
        expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
        ...finishSelection(),
        ...openFilter('Group issues'),
        click(role('option', { name: 'Status' })),
        expectOutMessage(OutMessage.ChangedGrouping({ groupBy: 'Status' })),
        ...finishSelection(),
        expect(text('2 issues')).toExist(),
      )
    },
  )
})
