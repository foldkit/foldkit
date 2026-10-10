import { Layer } from 'effect'

import * as Main from './main'
import { ApiReference, Example, Home, Playground, Ui } from './page'
import * as Search from './search'
import * as SnippetCopy from './snippetCopy'
import * as SnippetDisclosure from './snippetDisclosure'
import { LocalStorageLayer, SessionStorageLayer } from './storage'
import * as Subscriptions from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Main.EffectsLayer,
  Ui.EffectsLayer,
  Search.EffectsLayer,
  Home.EffectsLayer,
  Playground.EffectsLayer,
  ApiReference.EffectsLayer,
  Example.EffectsLayer,
  SnippetCopy.EffectsLayer,
  SnippetDisclosure.EffectsLayer,
  Subscriptions.EffectsLayer,
)

const ServicesLayer = Layer.mergeAll(
  LocalStorageLayer,
  SessionStorageLayer,
  Search.PagefindLayer,
)

export const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)
