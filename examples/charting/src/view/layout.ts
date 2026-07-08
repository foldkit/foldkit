import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import type { Html } from 'foldkit/html'
import { html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import type { Telemetry } from '../domain'
import { ClickedRefresh, ClickedRetry, type Message } from '../message'
import type { Model } from '../model'
import { chartPanelView } from './chart'
import { sidebarView } from './sidebar'

export const headerView = (model: Model): Html => {
  const h = html<Message>()
  const isRefreshing = AsyncData.isRefreshing(model.telemetry)
  const isLoading = AsyncData.isLoading(model.telemetry)

  return h.header(
    [
      h.Class(
        'flex flex-col gap-3 border-b border-zinc-200 pb-4 md:flex-row md:items-end md:justify-between',
      ),
    ],
    [
      h.div(
        [],
        [
          h.p(
            [
              h.Class(
                'text-xs font-semibold uppercase tracking-wider text-emerald-700',
              ),
            ],
            ['Live public telemetry'],
          ),
          h.h1(
            [
              h.Class(
                'mt-1 text-2xl font-semibold tracking-tight text-zinc-950',
              ),
            ],
            ['Foldkit Adoption Observatory'],
          ),
        ],
      ),
      Button.view<Message>({
        onClick: ClickedRefresh(),
        isDisabled: isRefreshing || isLoading,
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(
                'inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
              ),
            ],
            [isRefreshing ? 'Refreshing' : 'Refresh'],
          ),
      }),
    ],
  )
}

const dashboardBanner = (
  telemetry: Model['telemetry'],
): Option.Option<string> =>
  AsyncData.match(telemetry, {
    onIdle: () => Option.none(),
    onLoading: () => Option.none(),
    onRefreshing: () => Option.some('Refreshing public data'),
    onFailure: () => Option.none(),
    onStale: ({ error }) => Option.some(error),
    onSuccess: ({ warnings }) =>
      Array.match(warnings, {
        onEmpty: () => Option.none(),
        onNonEmpty: warnings => Option.some(Array.join(warnings, ' ')),
      }),
  })

export const telemetryStateView = (model: Model): Html =>
  AsyncData.matchData(model.telemetry, {
    onEmpty: () => loadingView(),
    onFailure: error => failureView(error),
    onData: data =>
      dashboardShellView(model, data, dashboardBanner(model.telemetry)),
  })

export const loadingView = (): Html => {
  const h = html<Message>()

  return h.keyed('section')(
    'TelemetryLoading',
    [
      h.Class(
        'grid flex-1 place-items-center rounded-md border border-zinc-200 bg-white px-6 py-16',
      ),
      h.AriaLabel('Loading telemetry'),
    ],
    [
      h.div(
        [h.Class('text-center')],
        [
          h.div(
            [
              h.Class(
                'mx-auto h-8 w-8 rounded-full border-2 border-zinc-200 border-t-emerald-600 motion-safe:animate-spin',
              ),
              h.AriaLabel('Loading'),
            ],
            [],
          ),
          h.p(
            [h.Class('mt-4 text-sm font-medium text-zinc-700')],
            ['Fetching public telemetry'],
          ),
        ],
      ),
    ],
  )
}

export const failureView = (error: string): Html => {
  const h = html<Message>()

  return h.keyed('section')(
    'TelemetryFailure',
    [
      h.Class(
        'grid flex-1 place-items-center rounded-md border border-rose-200 bg-rose-50 px-6 py-16 text-center',
      ),
      h.AriaLabel('Telemetry failed'),
    ],
    [
      h.div(
        [h.Class('max-w-lg')],
        [
          h.h2(
            [h.Class('text-lg font-semibold text-rose-950')],
            ['Could not fetch telemetry'],
          ),
          h.p([h.Class('mt-2 text-sm text-rose-800')], [error]),
          Button.view<Message>({
            onClick: ClickedRetry(),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    'mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-rose-700 px-4 text-sm font-medium text-white hover:bg-rose-800',
                  ),
                ],
                ['Retry'],
              ),
          }),
        ],
      ),
    ],
  )
}

export const dashboardShellView = (
  model: Model,
  telemetry: Telemetry,
  maybeBanner: Option.Option<string>,
): Html => {
  const h = html<Message>()

  return h.keyed('section')(
    'TelemetryDashboard',
    [
      h.Class(
        'grid flex-1 gap-5 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]',
      ),
    ],
    [
      sidebarView(model, telemetry, maybeBanner),
      chartPanelView(model, telemetry),
    ],
  )
}
