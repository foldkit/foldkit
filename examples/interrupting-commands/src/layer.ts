import { Effect } from 'effect'

import { ApplicationBlock } from './block'
import { UploadFile } from './command'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: UploadFile.layer,
    }
  }),
)
