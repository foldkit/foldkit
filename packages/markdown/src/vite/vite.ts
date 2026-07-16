import { Schema as S } from 'effect'
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Plugin } from 'vite'

import { MarkdownDocument, encodeDocument } from '../ast/index.js'
import { normalizeRoot } from './normalize.js'
import type { NormalizeOptions } from './normalize.js'

// NOTE: remark-frontmatter is included so that YAML frontmatter parses as one
// `yaml` node and fails the build with guidance. Without it, remark reads
// `---` fences as a thematic break plus a setext heading and renders garbage.
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm)
  .use(remarkDirective)
  .freeze()

/** Options for {@link markdown} and {@link parseMarkdown}. */
export type MarkdownPluginOptions = NormalizeOptions

const validateMarkdownPluginOptions = (
  options: MarkdownPluginOptions,
): MarkdownPluginOptions => {
  const islands = options.islands
  if (islands === undefined) {
    return options
  }
  for (const [islandName, attributesSchema] of Object.entries(islands)) {
    if (!S.isSchema(attributesSchema) || !('fields' in attributesSchema)) {
      throw new Error(
        `Island "${islandName}" in markdown plugin options must map to a Schema struct describing its attributes.`,
      )
    }
  }
  return options
}

const parseWithValidatedOptions = (
  source: string,
  options: NormalizeOptions,
): MarkdownDocument => normalizeRoot(processor.parse(source), options)

/**
 * Parses markdown source into a typed {@link MarkdownDocument}. Throws on any
 * construct outside the markdown vocabulary, and on malformed options. The
 * {@link markdown} plugin runs this per `.md` module; call it directly for
 * one-off compilation in scripts.
 */
export const parseMarkdown = (
  source: string,
  options: MarkdownPluginOptions = {},
): MarkdownDocument =>
  parseWithValidatedOptions(source, validateMarkdownPluginOptions(options))

/**
 * Vite plugin that compiles imported `.md` files at build time into typed
 * document modules. Decode the default export with `decodeDocument` and
 * render it with `Markdown.view`.
 */
export const markdown = (options: MarkdownPluginOptions = {}): Plugin => {
  const validatedOptions = validateMarkdownPluginOptions(options)

  return {
    name: 'foldkit-markdown',
    transform(source, id) {
      if (!id.endsWith('.md')) {
        return undefined
      }
      const document = parseWithValidatedOptions(source, validatedOptions)
      return {
        code: `export default ${JSON.stringify(encodeDocument(document))}`,
        map: null,
      }
    },
  }
}
