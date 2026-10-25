import { clsx } from 'clsx'
import { Array, Option, String } from 'effect'
import { AsyncData } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import type { ApplicationViewBuilder } from '../composition'
import { Message } from '../message'
import type { Model } from '../model'
import { issueHref } from '../navigation'
import {
  ApplicationRoute,
  issuesRouter,
  maybeProjectId,
  myIssuesRouter,
  pageRoute,
  peopleRouter,
  projectRouter,
  savedViewRouter,
  settingsRouter,
} from '../route'
import { navigationLink } from './navigation'

const maybeSnapshot = (model: typeof Model.Type) =>
  AsyncData.getData(model.workspaceAsyncData)

const SIDEBAR_COLLECTION_CLASS =
  'col-span-2 w-full border-t border-slate-200 pt-5 lg:mt-6'

const SAVED_VIEW_LINK_CLASS =
  'min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm'

const DRAFT_LINK_CLASS = 'block rounded-lg px-3 py-2'

export const sidebarView = (
  model: typeof Model.Type,
  h: ApplicationViewBuilder,
): Html => {
  const route = pageRoute(model.route)
  const maybeCurrentProjectId = maybeProjectId(route)

  return h.aside(
    [
      h.Class(
        'grid shrink-0 grid-cols-[1fr_auto] items-start gap-4 border-b border-slate-200 bg-slate-100/80 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-5',
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
                h.span([h.Class('hidden sm:inline')], ['Search workspace']),
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
      h.nav(
        [
          h.AriaLabel('Workspace navigation'),
          h.Class('col-span-2 flex w-full flex-wrap gap-1 lg:flex-col'),
        ],
        [
          navigationLink(
            issuesRouter({}),
            'All issues',
            ApplicationRoute.guards.Issues(route),
            h,
          ),
          navigationLink(
            myIssuesRouter({}),
            'My issues',
            ApplicationRoute.guards.MyIssues(route),
            h,
          ),
          navigationLink(
            peopleRouter(),
            'People',
            ApplicationRoute.guards.People(route),
            h,
          ),
          navigationLink(
            settingsRouter(),
            'Settings',
            ApplicationRoute.guards.Settings(route),
            h,
          ),
          h.p(
            [
              h.Class(
                'mt-5 hidden px-3 pb-2 text-xs font-semibold tracking-wider text-slate-600 uppercase lg:block',
              ),
            ],
            ['Projects'],
          ),
          ...Option.match(maybeSnapshot(model), {
            onNone: () => [],
            onSome: ({ projects }) =>
              Array.map(projects, project =>
                h.keyed('div')(
                  project.id,
                  [],
                  [
                    navigationLink(
                      projectRouter({ projectId: project.id }),
                      project.name,
                      Option.contains(maybeCurrentProjectId, project.id),
                      h,
                    ),
                  ],
                ),
              ),
          }),
        ],
      ),
      h.section(
        [
          h.Class(
            clsx({
              hidden: Array.isReadonlyArrayEmpty(model.savedViews),
              [SIDEBAR_COLLECTION_CLASS]: Array.isReadonlyArrayNonEmpty(
                model.savedViews,
              ),
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
          ...Array.match(model.savedViews, {
            onEmpty: () => [],
            onNonEmpty: savedViews =>
              Array.map(savedViews, savedView =>
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
      ),
      h.section(
        [
          h.Class(
            clsx({
              hidden: Array.isReadonlyArrayEmpty(model.issueDrafts),
              [SIDEBAR_COLLECTION_CLASS]: Array.isReadonlyArrayNonEmpty(
                model.issueDrafts,
              ),
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
          ...Array.map(model.issueDrafts, retainedDraft => {
            const title = String.trim(retainedDraft.draft.title)
            const maybeIssue = Option.flatMap(maybeSnapshot(model), snapshot =>
              Array.findFirst(
                snapshot.issues,
                issue => issue.id === retainedDraft.issueId,
              ),
            )
            const isActive =
              ApplicationRoute.guards.Issue(model.route) &&
              model.route.issueId === retainedDraft.issueId

            return h.keyed('div')(
              retainedDraft.issueId,
              [],
              [
                h.a(
                  [
                    h.Href(issueHref(model, retainedDraft.issueId)),
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
                      [
                        String.isEmpty(title)
                          ? retainedDraft.baseline.fields.title
                          : title,
                      ],
                    ),
                  ],
                ),
              ],
            )
          }),
        ],
      ),
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
}
