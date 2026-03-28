import authSources from 'virtual:example-sources/auth'
import counterSources from 'virtual:example-sources/counter'
import crashViewSources from 'virtual:example-sources/crash-view'
import formSources from 'virtual:example-sources/form'
import kanbanSources from 'virtual:example-sources/kanban'
import pixelArtSources from 'virtual:example-sources/pixel-art'
import querySyncSources from 'virtual:example-sources/query-sync'
import routingSources from 'virtual:example-sources/routing'
import shoppingCartSources from 'virtual:example-sources/shopping-cart'
import snakeSources from 'virtual:example-sources/snake'
import stopwatchSources from 'virtual:example-sources/stopwatch'
import todoSources from 'virtual:example-sources/todo'
import uiShowcaseSources from 'virtual:example-sources/ui-showcase'
import weatherSources from 'virtual:example-sources/weather'
import websocketChatSources from 'virtual:example-sources/websocket-chat'

import type { ExampleSlug } from './meta'

export type ExampleSourceFile = Readonly<{
  path: string
  highlightedHtml: string
  rawCode: string
}>

export type ExampleSources = Readonly<{
  files: ReadonlyArray<ExampleSourceFile>
}>

const sourcesBySlug: Record<ExampleSlug, ExampleSources> = {
  counter: counterSources,
  todo: todoSources,
  stopwatch: stopwatchSources,
  form: formSources,
  kanban: kanbanSources,
  weather: weatherSources,
  routing: routingSources,
  'query-sync': querySyncSources,
  'shopping-cart': shoppingCartSources,
  auth: authSources,
  'pixel-art': pixelArtSources,
  snake: snakeSources,
  'crash-view': crashViewSources,
  'websocket-chat': websocketChatSources,
  'ui-showcase': uiShowcaseSources,
}

export const getSourcesForSlug = (slug: ExampleSlug): ExampleSources =>
  sourcesBySlug[slug]
