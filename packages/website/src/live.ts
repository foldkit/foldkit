import { Layer } from 'effect'

import { Live as MainLive, devTracerLayer } from './main'
import { ApiReference, Example, Home, Playground } from './page'
import * as Search from './search'
import * as SnippetCopy from './snippetCopy'
import * as SnippetDisclosure from './snippetDisclosure'
import * as Subscriptions from './subscription'

export const WebsiteLive = Layer.mergeAll(
  MainLive,
  Search.Live,
  Home.Live,
  Playground.Live,
  ApiReference.Live,
  Example.Live,
  SnippetCopy.Live,
  SnippetDisclosure.Live,
  Subscriptions.Live,
  devTracerLayer,
)
