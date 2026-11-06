import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
  CommandPaletteBinding,
  CreateIssueBinding,
} from '../composition'
import { Workspace } from '../domain'
import { Message } from '../message'
import type { Model } from '../model'
import { ApplicationRoute, maybeIssueId } from '../route'
import { visibleWorkspaceAsyncData } from '../selectors'
import { sidebarView } from './sidebar'
import { pageTitle, workspaceView } from './workspace'

const maybeVisibleWorkspace = (model: Model) =>
  AsyncData.getData(visibleWorkspaceAsyncData(model))

const overlaysView = (
  commandPalette: Model['commandPalette'],
  createIssue: Model['createIssue'],
  maybeWorkspace: Option.Option<Workspace.Workspace>,
  h: ApplicationViewBuilder,
): Html => {
  const paletteInputs = Option.match(maybeWorkspace, {
    onNone: () => ({ issues: [], projects: [] }),
    onSome: workspace => ({
      issues: workspace.issues,
      projects: workspace.projects,
    }),
  })
  const projects = Option.match(maybeWorkspace, {
    onNone: () => [],
    onSome: workspace => workspace.projects,
  })

  return h.div(
    [],
    [
      h.block(
        CommandPaletteBinding.embedView({
          slotId: 'command-palette',
          model: commandPalette,
          viewInputs: paletteInputs,
        }),
      ),
      h.block(
        CreateIssueBinding.embedView({
          slotId: 'create-issue',
          model: createIssue,
          viewInputs: { projects },
        }),
      ),
    ],
  )
}

const pageDocumentTitle = (
  route: ApplicationRoute,
  savedViews: Model['savedViews'],
  workspace: Workspace.Workspace,
) => {
  const title = pageTitle(route, savedViews, workspace.projects)

  return ApplicationRoute.matchOrElse(
    route,
    {
      Project: () => `Issues | ${title} | Northstar`,
      ProjectOverview: () => `Overview | ${title} | Northstar`,
      ProjectSettings: () => `Project settings | ${title} | Northstar`,
      Board: () => `Board | ${title} | Northstar`,
    },
    () => `${title} | Northstar`,
  )
}

const documentTitle = (
  route: ApplicationRoute,
  savedViews: Model['savedViews'],
  maybeWorkspace: Option.Option<Workspace.Workspace>,
): string =>
  Option.match(maybeWorkspace, {
    onNone: () => 'Northstar | Foldkit workspace',
    onSome: workspace =>
      Option.match(maybeIssueId(route), {
        onNone: () => pageDocumentTitle(route, savedViews, workspace),
        onSome: issueId =>
          Option.match(Workspace.findIssue(workspace, issueId), {
            onNone: () => 'Issue not found | Northstar',
            onSome: issue => `${issue.identifier}: ${issue.title} | Northstar`,
          }),
      }),
  })

const pageNotFoundView = (h: ApplicationViewBuilder): Html =>
  h.section(
    [h.Class('p-8')],
    [
      h.h1(
        [h.Class('mb-3 text-2xl font-semibold text-slate-800')],
        ['Page not found'],
      ),
      h.p(
        [h.Class('text-sm text-slate-500')],
        ['Choose a page from the workspace navigation.'],
      ),
    ],
  )

const workspaceLoadingView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'grid min-h-[60vh] place-content-center px-8 text-sm text-slate-500',
      ),
      h.Role('status'),
    ],
    ['Loading workspace…'],
  )

const workspaceLoadFailureView = (
  error: string,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'mx-auto my-20 max-w-md rounded-xl border border-rose-100 bg-white p-8 text-center',
      ),
      h.Role('alert'),
    ],
    [
      h.h1(
        [h.Class('mb-3 text-lg font-semibold text-slate-700')],
        ['Unable to load workspace'],
      ),
      h.p([h.Class('mb-6 text-sm leading-6 text-slate-500')], [error]),
      Button.view(
        {
          onClick: Message.ClickedRetryLoad(),
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class('button-primary')],
              ['Retry loading'],
            ),
        },
        h,
      ),
    ],
  )

const mainContent = (model: Model, h: ApplicationViewBuilder): Html =>
  ApplicationRoute.matchOrElse<Html>(
    model.route,
    { NotFound: () => pageNotFoundView(h) },
    () =>
      AsyncData.matchDataSplitEmpty(visibleWorkspaceAsyncData(model), {
        onIdle: () => workspaceLoadingView(h),
        onLoading: () => workspaceLoadingView(h),
        onFailure: error => workspaceLoadFailureView(error, h),
        onData: workspace => workspaceView(model, workspace, h),
      }),
  )

export const view = ApplicationComposition.makeView((model, h) => ({
  title: documentTitle(
    model.route,
    model.savedViews,
    maybeVisibleWorkspace(model),
  ),
  body: h.div(
    [
      h.Class(
        'flex h-dvh flex-col overflow-hidden bg-slate-50 font-sans text-sm font-medium text-slate-700 antialiased lg:flex-row',
      ),
    ],
    [
      sidebarView(model, h),
      h.main(
        [h.Class('flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto')],
        [
          h.div(
            [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
            [Option.getOrElse(model.maybeNotice, () => '')],
          ),
          mainContent(model, h),
        ],
      ),
      overlaysView(
        model.commandPalette,
        model.createIssue,
        maybeVisibleWorkspace(model),
        h,
      ),
    ],
  ),
}))
