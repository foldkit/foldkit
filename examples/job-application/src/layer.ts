import { Effect, Layer } from 'effect'

import { Menu, Tabs } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './blocks'
import { SubmitApplication } from './command'
import { ApplicationComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view/view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
      EffectsLayer: SubmitApplication.layer,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      PersonalInfo.layer,
      WorkHistory.layer,
      Education.layer,
      Skills.layer,
      CoverLetter.layer,
      Attachments.layer,
      Menu.layer,
      Tabs.layer,
    ),
  ),
)
