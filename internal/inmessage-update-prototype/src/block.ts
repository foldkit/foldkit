import { Effect } from 'effect'

import { ApplicationComposition, EditorBinding } from './composition.js'
import { ApplicationDefinition, SaveDraft } from './definition.js'
import * as Editor from './editor.js'
import { inMessageUpdate, update } from './update.js'
export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
).provide(Editor.layer)
