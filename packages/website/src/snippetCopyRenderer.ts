import { type Html } from 'foldkit/html'

import { type CodeBlock } from './component'
import type { SnippetCopyBinding } from './composition'
import { SnippetCopyBlock } from './snippetCopy'

type SnippetCopyBlockModel = typeof SnippetCopyBlock.Model.Type

type Render = (
  config: Parameters<typeof SnippetCopyBinding.embedView>[0],
) => Html

export const renderer =
  (model: SnippetCopyBlockModel, render: Render): CodeBlock.RenderCopyButton =>
  ({ id, text, ariaLabel, positionClass, variant }) =>
    render({
      slotId: `snippet-copy-${id}`,
      model,
      viewInputs: { snippetId: id, text, ariaLabel, positionClass, variant },
    })
