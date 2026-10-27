import { Array, Option } from 'effect'
import {
  Command,
  Mount,
  click,
  expect,
  expectOutMessage,
  given,
  label,
  role,
  scene,
  text,
  type,
  withViewInputs,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Listbox } from '@foldkit/ui'

import { IssueFilters, initialWorkspace } from '../domain'
import { WorkspaceListboxBlock } from '../listbox'
import { IssueListBlock } from './block'
import { OutMessage } from './outMessage'
import { update } from './update'
import { view } from './view'

const initialFilters = IssueFilters.make({
  query: '',
  maybeStatus: Option.none(),
  sort: 'Identifier',
  groupBy: 'None',
})

const sceneView = (filters: typeof IssueFilters.Type = initialFilters) =>
  withViewInputs(view, {
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
    WorkspaceListboxBlock.Message.CompletedFocusListboxItems(),
  ),
  Mount.resolve(
    Listbox.test.AnchorListbox,
    WorkspaceListboxBlock.Message.CompletedAnchorListbox(),
  ),
  Mount.resolve(
    Listbox.test.PortalListboxBackdrop,
    WorkspaceListboxBlock.Message.CompletedPortalListboxBackdrop(),
  ),
]

const finishSelection = () => [
  Command.resolve(
    Listbox.test.FocusListboxButton,
    WorkspaceListboxBlock.Message.CompletedFocusListboxButton(),
  ),
  Mount.expectEnded(
    Listbox.test.AnchorListbox,
    Listbox.test.PortalListboxBackdrop,
  ),
]

describe('Issue List view', () => {
  test('disables issue creation when there is no project to create it in', () => {
    scene(
      {
        update,
        view: withViewInputs(view, {
          issues: [],
          members: initialWorkspace.members,
          projects: [],
          maybeActiveIssueId: Option.none(),
          filters: initialFilters,
          issueHrefs: {},
        })(),
      },
      given(IssueListBlock.init().model),
      expect(role('button', { name: 'New issue' })).toBeDisabled(),
    )
  })

  test('reports search and clear requests while rendering controlled filters', () => {
    const filters = IssueFilters.make({
      ...initialFilters,
      query: 'no matching issue',
    })

    scene(
      { update, view: sceneView(filters)() },
      given(IssueListBlock.init().model),
      expect(label('Search issues')).toHaveValue('no matching issue'),
      expect(role('heading', { name: 'No matching issues' })).toExist(),
      type(label('Search issues'), 'keyboard'),
      expectOutMessage(OutMessage.ChangedQuery({ query: 'keyboard' })),
      click(role('button', { name: 'Clear filters' })),
      expectOutMessage(OutMessage.RequestedClearFilters()),
      expect(label('Search issues')).toHaveValue('no matching issue'),
    )
  })

  test('renders issue hrefs and leaves issues without hrefs as content', () => {
    scene(
      { update, view: sceneView()() },
      given(IssueListBlock.init().model),
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
  })

  test('renders grouped controlled results and saves the current filters', () => {
    const filters = IssueFilters.make({
      query: '',
      maybeStatus: Option.none(),
      sort: 'Priority',
      groupBy: 'Project',
    })

    scene(
      { update, view: sceneView(filters)() },
      given(IssueListBlock.init().model),
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
  })

  test('reports validated Listbox selections without changing controlled values', () => {
    scene(
      { update, view: sceneView()() },
      given(IssueListBlock.init().model),
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
  })
})
