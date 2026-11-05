import { Effect, Layer } from 'effect'

// composition.ts
import { DialogBlock, layer as DialogLayer } from '@foldkit/ui/dialog'
import {
  layer as MenuLayer,
  makeBlock as makeMenuBlock,
} from '@foldkit/ui/menu'

import { ApplicationBlock, makeBinding, makeComposition } from './block'

export const DialogBinding = makeBinding(DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const ApplicationMenu = makeMenuBlock<string>()

export const MenuBinding = makeBinding(ApplicationMenu, {
  field: 'menu',
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const ApplicationComposition = makeComposition({
  bindings: [DialogBinding, MenuBinding],
})

// update.ts
import {
  ApplicationComposition,
  DialogBinding,
  MenuBinding,
} from './composition'

export const update = ApplicationComposition.makeUpdate({})

// view.ts

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Account',
  body: h.main(
    [],
    [
      h.block(
        DialogBinding.embedView({
          slotId: 'dialog',
          model: model.dialog,
          viewInputs: dialogViewInputs,
        }),
      ),
      h.block(
        MenuBinding.embedView({
          slotId: 'menu',
          model: model.menu,
          viewInputs: menuViewInputs,
        }),
      ),
    ],
  ),
}))

// layer.ts
import { Block, Program, Runtime } from 'foldkit'

import { init } from './init'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding
    const menu = yield* MenuBinding

    return {
      children: [dialog, menu],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(DialogLayer, MenuLayer)))

// entry.ts

import { ApplicationBlock } from './block'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)

export { ApplicationBlock } from './block'
