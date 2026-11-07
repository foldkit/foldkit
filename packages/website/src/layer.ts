import { Effect, Layer } from 'effect'

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
import { ApplicationComposition } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ApiReference.layer,
      ComingFromReact.layer,
      BlockPage.layer,
      ExampleDetail.layer,
      Home.layer,
      Playground.layer,
      Ui.layer,
      Search.layer,
      SnippetCopy.layer,
      SnippetDisclosure.layer,
      Dialog.layer,
      Menu.layer,
    ),
  ),
)
