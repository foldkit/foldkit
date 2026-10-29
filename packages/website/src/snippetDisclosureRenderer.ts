import { type Html } from 'foldkit/html'

import { type CodeBlock } from './component'
import type { SnippetDisclosureBinding } from './composition'
import { SnippetDisclosureBlock } from './snippetDisclosure'

type SnippetDisclosureBlockModel = typeof SnippetDisclosureBlock.Model.Type

type Render = (
  config: Parameters<typeof SnippetDisclosureBinding.embedView>[0],
) => Html

export const renderer =
  (
    model: SnippetDisclosureBlockModel,
    renderCopyButton: CodeBlock.RenderCopyButton,
    render: Render,
  ): CodeBlock.RenderSnippet =>
  config =>
    render({
      slotId: `snippet-disclosure-${config.id}`,
      model,
      viewInputs: { ...config, renderCopyButton },
    })
