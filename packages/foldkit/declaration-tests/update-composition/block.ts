import { Effect } from 'effect'

import { SaveDraft } from './command.js'
import { ApplicationComposition, EditorBinding } from './composition.js'
import { ApplicationDefinition } from './definition.js'
import * as Editor from './editor.js'
import { update } from './update.js'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
).provide(Editor.layer)
