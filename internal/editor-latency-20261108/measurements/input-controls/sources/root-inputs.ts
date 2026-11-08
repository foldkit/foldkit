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

export const rootInputs = {
  ApplicationBlock,
  EffectsLayer,
  init,
  update,
  view,
  subscriptions,
}
