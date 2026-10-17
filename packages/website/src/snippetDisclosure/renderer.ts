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
  (
    model: Model,
    renderCopyButton: CodeBlock.RenderCopyButton,
    render: Render,
  ): CodeBlock.RenderSnippet =>
  config =>
    render({
      slotId: `snippet-disclosure-${config.id}`,
      model,
      viewInputs: { ...config, renderCopyButton },
    })
