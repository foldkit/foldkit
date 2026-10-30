import { clsx } from 'clsx'
import { Array, Effect, Option, Record, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button, Nav } from '@foldkit/ui'

import type { SavedView, Workspace } from './domain/domain'
import { navigationLink } from './domain/navigationLink'
import {
  ApplicationRoute,
  issuesRouter,
  maybeIssueId,
  maybeProjectId,
  myIssuesRouter,
  peopleRouter,
  projectRouter,
  savedViewRouter,
  settingsRouter,
} from './route'

const Message = defineMessageUnion({
  ClickedOpenCommandPalette: {},
  ClickedDeleteSavedView: { viewId: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  RequestedCommandPalette: {},
  RequestedDeleteSavedView: { viewId: Schema.String },
})

type ViewInput = Readonly<{
  route: ApplicationRoute
  savedViews: ReadonlyArray<SavedView>
  maybeConfirmedWorkspace: Option.Option<Workspace>
  issueDrafts: ReadonlyArray<Readonly<{ issueId: string; title: string }>>
  toIssueHref: (issueId: string) => string
}>

export class Sidebar extends Block<Sidebar, void, ViewInput>()('Sidebar', {
  Message,
  OutMessage,
}) {}

export const SidebarLive = Sidebar.make(
  Effect.fn(function* () {
    return {
      update: {
        ClickedOpenCommandPalette: model => ({
          model,
          outMessage: OutMessage.RequestedCommandPalette(),
        }),
        ClickedDeleteSavedView: (model, { viewId }) => ({
          model,
          outMessage: OutMessage.RequestedDeleteSavedView({ viewId }),
        }),
      },

      view: (_model, h, input) => {
        const { route, maybeConfirmedWorkspace } = input
        const maybeCurrentProjectId = maybeProjectId(route)

        const workspacePages = {
          'All issues': {
            href: issuesRouter({}),
            isCurrent: ApplicationRoute.guards.Issues(route),
          },
          'My issues': {
            href: myIssuesRouter({}),
            isCurrent: ApplicationRoute.guards.MyIssues(route),
          },
          People: {
            href: peopleRouter({}),
            isCurrent: ApplicationRoute.guards.People(route),
          },
          Settings: {
            href: settingsRouter({}),
            isCurrent: ApplicationRoute.guards.Settings(route),
          },
        }

        return h.aside(
          [
            h.Class(
              'grid max-h-[40dvh] shrink-0 grid-cols-[1fr_auto] items-start gap-4 overflow-y-auto border-b border-slate-200 bg-slate-100/80 p-4 lg:flex lg:h-full lg:max-h-none lg:w-60 lg:flex-col lg:gap-0 lg:border-r lg:border-b-0 lg:p-5',
            ),
          ],
          [
            h.a(
              [
                h.Href(issuesRouter({})),
                h.Class(
                  'flex min-h-10 items-center gap-2.5 px-1 text-lg font-semibold tracking-tight text-slate-800 lg:mb-7 lg:px-2',
                ),
              ],
              [
                h.span(
                  [
                    h.AriaHidden(true),
                    h.Class(
                      'grid size-8 place-items-center rounded-xl bg-indigo-600 text-sm text-white shadow-sm',
                    ),
                  ],
                  ['N'],
                ),
                'Northstar',
              ],
            ),
            Button.view(
              {
                type: 'button',
                onClick: Message.ClickedOpenCommandPalette(),
                toView: attributes =>
                  h.button(
                    [
                      ...attributes.button,
                      h.AriaLabel('Search workspace'),
                      h.Class('button w-full justify-between lg:mb-5'),
                    ],
                    [
                      h.span([h.Class('sm:hidden')], ['Search']),
                      h.span(
                        [h.Class('hidden sm:inline')],
                        ['Search workspace'],
                      ),
                      h.kbd(
                        [
                          h.Class(
                            'hidden rounded border border-slate-200 px-1 text-xs font-medium text-slate-600 sm:inline',
                          ),
                        ],
                        ['⌘ K'],
                      ),
                    ],
                  ),
              },
              h,
            ),
            h.div(
              [h.Class('col-span-2 w-full')],
              [
                Nav.view({
                  items: Record.keys(workspacePages),
                  ariaLabel: 'Workspace navigation',
                  toHref: label => workspacePages[label].href,
                  isItemCurrent: label => workspacePages[label].isCurrent,
                  toView: ({ nav, items }) =>
                    h.nav(
                      [
                        ...nav,
                        h.Class('flex w-full flex-wrap gap-1 lg:flex-col'),
                      ],
                      Array.map(items, item =>
                        navigationLink(item, item.value, h),
                      ),
                    ),
                }),
                h.p(
                  [
                    h.Class(
                      'mt-5 hidden px-3 pb-2 text-xs font-semibold tracking-wider text-slate-600 uppercase lg:block',
                    ),
                  ],
                  ['Projects'],
                ),
                ...Option.match(maybeConfirmedWorkspace, {
                  onNone: () => [],
                  onSome: ({ projects }) => [
                    Nav.view({
                      items: Array.map(projects, project => project.id),
                      ariaLabel: 'Projects',
                      toHref: projectId => projectRouter({ projectId }),
                      isItemCurrent: projectId =>
                        Option.contains(maybeCurrentProjectId, projectId),
                      toView: ({ nav, items }) =>
                        h.nav(
                          [
                            ...nav,
                            h.Class('flex w-full flex-wrap gap-1 lg:flex-col'),
                          ],
                          Array.map(
                            Array.zip(items, projects),
                            ([item, project]) =>
                              navigationLink(item, project.name, h),
                          ),
                        ),
                    }),
                  ],
                }),
              ],
            ),
            savedViewsSection(input, h),
            draftsSection(input, h),
            h.div(
              [
                h.Class(
                  'mt-auto hidden pt-10 text-xs font-medium leading-6 text-slate-500 lg:block',
                ),
              ],
              [h.p([], ['Demo data resets on reload'])],
            ),
          ],
        )
      },
    }
  }),
)

type SidebarViewBuilder = HtmlBuilder<Message>

const SIDEBAR_COLLECTION_CLASS =
  'col-span-2 w-full border-t border-slate-200 pt-5 lg:mt-6'

const SAVED_VIEW_LINK_CLASS =
  'min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm'

const DRAFT_LINK_CLASS = 'block rounded-lg px-3 py-2'

const savedViewsSection = (
  { route, savedViews }: ViewInput,
  h: SidebarViewBuilder,
): Html =>
  h.section(
    [
      h.Class(
        clsx({
          hidden: Array.isReadonlyArrayEmpty(savedViews),
          [SIDEBAR_COLLECTION_CLASS]: Array.isReadonlyArrayNonEmpty(savedViews),
        }),
      ),
      h.AriaLabel('Saved views'),
    ],
    [
      h.h2(
        [
          h.Class(
            'mb-2 px-3 text-xs font-semibold tracking-wider text-slate-600 uppercase',
          ),
        ],
        ['Saved views'],
      ),
      ...Array.match(savedViews, {
        onEmpty: () => [],
        onNonEmpty: nonEmptySavedViews =>
          Array.map(nonEmptySavedViews, savedView =>
            h.keyed('div')(
              savedView.id,
              [h.Class('flex items-center gap-1')],
              [
                h.a(
                  [
                    h.Href(
                      savedViewRouter({
                        viewId: savedView.id,
                        filters: savedView.filters,
                      }),
                    ),
                    h.Class(
                      clsx(SAVED_VIEW_LINK_CLASS, {
                        'bg-white font-semibold text-indigo-700':
                          ApplicationRoute.guards.SavedView(route) &&
                          route.viewId === savedView.id,
                        'font-medium text-slate-600 hover:bg-white/60':
                          !ApplicationRoute.guards.SavedView(route) ||
                          route.viewId !== savedView.id,
                      }),
                    ),
                  ],
                  [savedView.name],
                ),
                Button.view(
                  {
                    type: 'button',
                    onClick: Message.ClickedDeleteSavedView({
                      viewId: savedView.id,
                    }),
                    toView: attributes =>
                      h.button(
                        [
                          ...attributes.button,
                          h.AriaLabel(`Delete view ${savedView.name}`),
                          h.Class(
                            'inline-grid size-7 cursor-pointer place-items-center rounded text-sm font-medium text-slate-600 outline-offset-2 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-indigo-500',
                          ),
                        ],
                        ['×'],
                      ),
                  },
                  h,
                ),
              ],
            ),
          ),
      }),
    ],
  )

const draftsSection = (
  { route, maybeConfirmedWorkspace, issueDrafts, toIssueHref }: ViewInput,
  h: SidebarViewBuilder,
): Html =>
  h.section(
    [
      h.Class(
        clsx({
          hidden: Array.isReadonlyArrayEmpty(issueDrafts),
          [SIDEBAR_COLLECTION_CLASS]:
            Array.isReadonlyArrayNonEmpty(issueDrafts),
        }),
      ),
      h.AriaLabel('Drafts'),
    ],
    [
      h.h2(
        [
          h.Class(
            'mb-2 px-3 text-xs font-semibold tracking-wider text-slate-600 uppercase',
          ),
        ],
        ['Drafts'],
      ),
      ...Array.map(issueDrafts, retainedDraft => {
        const maybeIssue = Option.flatMap(maybeConfirmedWorkspace, workspace =>
          Array.findFirst(
            workspace.issues,
            issue => issue.id === retainedDraft.issueId,
          ),
        )
        const isActive = Option.contains(
          maybeIssueId(route),
          retainedDraft.issueId,
        )

        return h.keyed('div')(
          retainedDraft.issueId,
          [],
          [
            h.a(
              [
                h.Href(toIssueHref(retainedDraft.issueId)),
                h.Class(
                  clsx(DRAFT_LINK_CLASS, {
                    'bg-white text-indigo-700 shadow-xs': isActive,
                    'text-slate-500 transition hover:bg-white/60 hover:text-slate-800':
                      !isActive,
                  }),
                ),
                ...(isActive ? [h.AriaCurrent('page')] : []),
              ],
              [
                h.span(
                  [h.Class('block text-xs font-semibold')],
                  [
                    Option.match(maybeIssue, {
                      onNone: () => retainedDraft.issueId,
                      onSome: issue => issue.identifier,
                    }),
                  ],
                ),
                h.span(
                  [h.Class('block truncate text-sm font-medium')],
                  [retainedDraft.title],
                ),
              ],
            ),
          ],
        )
      }),
    ],
  )
