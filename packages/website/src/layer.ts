import { Layer } from 'effect'

import { layer as MainLayer, devTracerLayer } from './main'
import { ApiReference, Example, Home, Playground } from './page'
import * as Search from './search'
import * as SnippetCopy from './snippetCopy'
import * as SnippetDisclosure from './snippetDisclosure'
import { LocalStorageLayer, SessionStorageLayer } from './storage'
import * as Subscriptions from './subscription'

export const HandlersLayer = Layer.mergeAll(
  MainLayer,
  Search.layer,
  Home.layer,
  Playground.layer,
  ApiReference.layer,
  Example.layer,
  SnippetCopy.layer,
  SnippetDisclosure.layer,
  Subscriptions.layer,
  devTracerLayer,
)

export const layer = HandlersLayer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      LocalStorageLayer,
      SessionStorageLayer,
      Search.PagefindService.Default,
    ),
  ),
)
