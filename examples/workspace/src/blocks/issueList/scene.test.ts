import { Array, Option } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Listbox } from '@foldkit/ui'

import { Issue, initialWorkspace } from '../../domain'
import { StringListboxBlock } from '../../listbox'
import { IssueListBlock } from './block'
import { layer } from './layer'
import { OutMessage } from './outMessage'

const initialFilters = Issue.Filters.make({
  query: '',
  maybeStatus: Option.none(),
  sort: 'Identifier',
  groupBy: 'None',
})

const viewInputs = (filters: Issue.Filters = initialFilters) => ({
  issues: Array.take(initialWorkspace.issues, 2),
  members: initialWorkspace.members,
  projects: initialWorkspace.projects,
  maybeActiveIssueId: Option.none(),
  filters,
  issueHrefsById: { 'issue-101': '/issues/issue-101' },
})

const openFilter = (filter: string) => [
  Scene.click(Scene.role('button', { name: filter })),
  Scene.Command.resolve(
    Listbox.test.FocusListboxItems,
    StringListboxBlock.Message.CompletedFocusListboxItems(),
  ),
  Scene.Mount.resolve(
    Listbox.test.AnchorListbox,
    StringListboxBlock.Message.CompletedAnchorListbox(),
  ),
  Scene.Mount.resolve(
    Listbox.test.PortalListboxBackdrop,
    StringListboxBlock.Message.CompletedPortalListboxBackdrop(),
  ),
]

const finishSelection = () => [
  Scene.Command.resolve(
    Listbox.test.FocusListboxButton,
    StringListboxBlock.Message.CompletedFocusListboxButton(),
  ),
  Scene.Mount.expectEnded(
    Listbox.test.AnchorListbox,
    Listbox.test.PortalListboxBackdrop,
  ),
]

describe('Issue List view', () => {
  it.effect(
    'disables issue creation when there is no project to create it in',
    () => {
      return Scene.scene(
        {
          block: IssueListBlock,
          layer,
          viewInputs: {
            issues: [],
            members: initialWorkspace.members,
            projects: [],
            maybeActiveIssueId: Option.none(),
            filters: initialFilters,
            issueHrefsById: {},
          },
        },
        Scene.init(),
        Scene.expect(
          Scene.role('button', { name: 'New issue' }),
        ).toBeDisabled(),
      )
    },
  )

  it.effect(
    'reports search and clear requests while rendering controlled filters',
    () => {
      const filters = Issue.Filters.make({
        ...initialFilters,
        query: 'no matching issue',
      })
      return Scene.scene(
        { block: IssueListBlock, layer, viewInputs: viewInputs(filters) },
        Scene.init(),
        Scene.expect(Scene.label('Search issues')).toHaveValue(
          'no matching issue',
        ),
        Scene.expect(
          Scene.role('heading', { name: 'No matching issues' }),
        ).toExist(),
        Scene.type(Scene.label('Search issues'), 'keyboard'),
        Scene.expectOutMessage(OutMessage.ChangedQuery({ query: 'keyboard' })),
        Scene.click(Scene.role('button', { name: 'Clear filters' })),
        Scene.expectOutMessage(OutMessage.RequestedClearFilters()),
        Scene.expect(Scene.label('Search issues')).toHaveValue(
          'no matching issue',
        ),
      )
    },
  )

  it.effect(
    'renders issue hrefs and leaves issues without hrefs as content',
    () => {
      return Scene.scene(
        { block: IssueListBlock, layer, viewInputs: viewInputs() },
        Scene.init(),
        Scene.expect(
          Scene.role('link', { name: 'WSP-101 Build a faster command menu' }),
        ).toHaveAttr('href', '/issues/issue-101'),
        Scene.expect(
          Scene.role('link', {
            name: 'WSP-102 Keep issue drafts when switching projects',
          }),
        ).not.toExist(),
        Scene.expect(
          Scene.text('Keep issue drafts when switching projects'),
        ).toExist(),
      )
    },
  )

  it.effect(
    'renders grouped controlled results and saves the current filters',
    () => {
      const filters = Issue.Filters.make({
        query: '',
        maybeStatus: Option.none(),
        sort: 'Priority',
        groupBy: 'Project',
      })
      return Scene.scene(
        { block: IssueListBlock, layer, viewInputs: viewInputs(filters) },
        Scene.init(),
        Scene.expect(
          Scene.role('heading', { name: 'Experience · 1' }),
        ).toExist(),
        Scene.expect(Scene.role('heading', { name: 'Platform · 1' })).toExist(),
        Scene.type(Scene.label('Saved view name'), '  Project work  '),
        Scene.click(Scene.role('button', { name: 'Save view' })),
        Scene.expectOutMessage(
          OutMessage.SubmittedSavedView({
            name: 'Project work',
            filters,
          }),
        ),
        Scene.expect(Scene.label('Saved view name')).toHaveValue(''),
      )
    },
  )

  it.effect(
    'reports validated Listbox selections without changing controlled values',
    () => {
      return Scene.scene(
        { block: IssueListBlock, layer, viewInputs: viewInputs() },
        Scene.init(),
        ...openFilter('Filter by status'),
        Scene.click(Scene.role('option', { name: 'Todo' })),
        Scene.expectOutMessage(
          OutMessage.ChangedStatusFilter({
            maybeStatus: Option.some('Todo'),
          }),
        ),
        ...finishSelection(),
        Scene.expect(
          Scene.role('button', { name: 'Filter by status' }),
        ).toHaveText('All statuses'),
        ...openFilter('Sort issues'),
        Scene.click(Scene.role('option', { name: 'Priority' })),
        Scene.expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
        ...finishSelection(),
        ...openFilter('Group issues'),
        Scene.click(Scene.role('option', { name: 'Status' })),
        Scene.expectOutMessage(
          OutMessage.ChangedGrouping({ groupBy: 'Status' }),
        ),
        ...finishSelection(),
        Scene.expect(Scene.text('2 issues')).toExist(),
      )
    },
  )
})
