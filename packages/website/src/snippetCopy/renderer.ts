import { type HtmlBuilder } from 'foldkit/html'

import { type CodeBlock } from '../component'
import { type Message } from './message'
import { type Model } from './model'
import { view } from './view'

export const renderer =
  <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
  ): CodeBlock.RenderCopyButton =>
  ({ id, text, ariaLabel, positionClass }) =>
    h.submodel({
      slotId: `snippet-copy-${id}`,
      model,
      view,
      viewInputs: { snippetId: id, text, ariaLabel, positionClass },
      toParentMessage,
    })
