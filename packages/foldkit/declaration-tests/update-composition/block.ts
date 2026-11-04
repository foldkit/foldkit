import { Effect, Layer } from 'effect'

import { SaveDraft } from './command.js'
import { ApplicationComposition, EditorBinding } from './composition.js'
import { ApplicationBlock } from './definition.js'
import * as Editor from './editor.js'
import { update } from './update.js'

export { ApplicationBlock } from './definition.js'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const editor = yield* EditorBinding

    return {
      children: [editor],
      init: ApplicationComposition.makeInit(() => ({
        model: { title: '', editCount: 0, dispatchCount: 0 },
      })),
      update,
      EffectsLayer: SaveDraft.layer,
    }
  }),
).pipe(Layer.provide(Editor.layer))
