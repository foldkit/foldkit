import { MessageComposerDefinition } from './definition'
import { FocusInput } from './mount'

export const MessageComposerComposition =
  MessageComposerDefinition.makeComposition({
    mounts: [FocusInput],
  })
