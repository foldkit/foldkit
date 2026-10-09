import { Layer } from 'effect'

import * as Main from './main'
import { ApiReference, Example, Home, Playground } from './page'
import * as Search from './search'
import * as SnippetCopy from './snippetCopy'
import * as SnippetDisclosure from './snippetDisclosure'
import { LocalStorageLayer, SessionStorageLayer } from './storage'
import * as Subscriptions from './subscription'

export const HandlersLayer = Layer.mergeAll(
  Main.Layer,
  Search.Layer,
  Home.Layer,
  Playground.Layer,
  ApiReference.Layer,
  Example.Layer,
  SnippetCopy.Layer,
  SnippetDisclosure.Layer,
  Subscriptions.Layer,
)

const ServicesLayer = Layer.mergeAll(
  LocalStorageLayer,
  SessionStorageLayer,
  Search.PagefindLayer,
)

export const AppLayer = Layer.provide(HandlersLayer, ServicesLayer)
