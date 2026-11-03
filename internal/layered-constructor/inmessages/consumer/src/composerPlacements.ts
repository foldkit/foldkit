import { Effect } from 'effect'

import { MessageComposerComposition } from './messageComposer/composition'
import {
  MessageComposerDefinition,
  makeFieldsStep,
} from './messageComposer/definition'
import { init } from './messageComposer/init'
import { FocusInput } from './messageComposer/mount'
import { submitMessage } from './messageComposer/steps'
import { update } from './messageComposer/update'
import { view } from './messageComposer/view'

export const LocalMessageComposerBlock = MessageComposerDefinition.makeBlock(
  Effect.gen(function* () {
    const inMessageUpdate = MessageComposerComposition.makeInMessageUpdate({
      RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
      RequestedSubmit: submitMessage,
    })
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: FocusInput.layer,
    }
  }),
)

export const InlineMessageComposerBlock = MessageComposerDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate: MessageComposerComposition.makeInMessageUpdate({
        RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
        RequestedSubmit: submitMessage,
      }),
      view,
      EffectsLayer: FocusInput.layer,
    }
  }),
)
