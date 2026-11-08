import { Layer } from 'effect'

import { Dialog, Menu } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import {
  ApiReference,
  BlockPage,
  ComingFromReact,
  ExampleDetail,
  Home,
  Playground,
  Search,
  SnippetCopy,
  SnippetDisclosure,
  Ui,
} from './blocks'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
})

export const childLayers = {
  Layer,
  ApiReference: ApiReference.layer,
  BlockPage: BlockPage.layer,
  ComingFromReact: ComingFromReact.layer,
  ExampleDetail: ExampleDetail.layer,
  Home: Home.layer,
  Playground: Playground.layer,
  Search: Search.layer,
  SnippetCopy: SnippetCopy.layer,
  SnippetDisclosure: SnippetDisclosure.layer,
  Ui: Ui.layer,
  Dialog: Dialog.layer,
  Menu: Menu.layer,
}
