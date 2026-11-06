import type { Option } from 'effect/Option'

import type { ResolvedTheme } from '../../colorScheme'
import type * as CodeBlock from '../../markdown/codeBlock'

export type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  isNarrowViewport: boolean
  maybeGitHubStarCount: Option<number>
  resolvedTheme: ResolvedTheme
  isBrowserEnvironmentLoaded: boolean
  newsletterEmail: string
}>
