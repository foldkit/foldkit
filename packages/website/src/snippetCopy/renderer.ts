import { type Html } from 'foldkit/html'

import { type CodeBlock } from '../component'
import { type Model } from './model'
import { type ViewInputs } from './view'

type Render = (
  config: Readonly<{
    slotId: string
    model: Model
    viewInputs: ViewInputs
  }>,
) => Html

export const renderer =
  (model: Model, render: Render): CodeBlock.RenderCopyButton =>
  ({ id, text, ariaLabel, positionClass, variant }) =>
    render({
      slotId: `snippet-copy-${id}`,
      model,
      viewInputs: { snippetId: id, text, ariaLabel, positionClass, variant },
    })
