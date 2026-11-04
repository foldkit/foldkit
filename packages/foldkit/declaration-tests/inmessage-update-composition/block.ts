import { Effect, Layer } from 'effect'

import { ApplicationComposition, EditorBinding } from './composition.js'
import { ApplicationBlock, SaveDraft } from './definition.js'
import * as Editor from './editor.js'
import { inMessageUpdate, update } from './update.js'
export { ApplicationBlock } from './definition.js'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const editor = yield* EditorBinding

    return {
      children: [editor],
      init: ApplicationComposition.makeInit(() => ({
        model: { count: 0, snapshots: [], seen: [] },
      })),
      update,
      inMessageUpdate,
      EffectsLayer: SaveDraft.layer,
    }
  }),
).pipe(Layer.provide(Editor.layer))
