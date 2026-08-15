import { Array, Option, Schema as S, pipe } from 'effect'
import type { Root, RootContent, Yaml } from 'mdast'
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Plugin } from 'vite'

import { MarkdownDocument, encodeDocument } from '../ast/index.js'
import type { FrontmatterDefinition } from './frontmatter.js'
import {
  parseFrontmatterFields,
  validateFrontmatterFields,
} from './frontmatter.js'
import { normalizeRoot } from './normalize.js'
import type { NormalizeOptions } from './normalize.js'

// NOTE: remark-frontmatter is included so that YAML frontmatter parses as one
// `yaml` node. With a `frontmatter` schema configured it becomes the document's
// typed frontmatter; without one it fails the build with guidance. Without the
// remark plugin, remark reads `---` fences as a thematic break plus a setext
// heading and renders garbage.
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm)
  .use(remarkDirective)
  .freeze()

/** Options for {@link markdown}, {@link parseMarkdown}, and {@link parseMarkdownWithFrontmatter}. */
export type MarkdownPluginOptions = NormalizeOptions &
  Readonly<{
    frontmatter?: FrontmatterDefinition | undefined
  }>

const isSchemaStruct = (value: unknown): boolean =>
  S.isSchema(value) && 'fields' in value

const validateMarkdownPluginOptions = (
  options: MarkdownPluginOptions,
): MarkdownPluginOptions => {
  const { islands, frontmatter } = options
  if (islands !== undefined) {
    for (const [islandName, attributesSchema] of Object.entries(islands)) {
      if (!isSchemaStruct(attributesSchema)) {
        throw new Error(
          `Island "${islandName}" in markdown plugin options must map to a Schema struct describing its attributes.`,
        )
      }
    }
  }
  if (frontmatter !== undefined && !isSchemaStruct(frontmatter)) {
    throw new Error(
      'The `frontmatter` markdown plugin option must be a Schema struct describing the frontmatter fields.',
    )
  }
  return options
}

/** A parsed document together with its frontmatter fields, when it has any. */
export type ParsedMarkdown = Readonly<{
  document: MarkdownDocument
  maybeFrontmatter: Option.Option<Readonly<Record<string, string>>>
}>

const isYamlNode = (node: RootContent): node is Yaml => node.type === 'yaml'

type ExtractedFrontmatter = Readonly<{
  contentRoot: Root
  maybeFrontmatter: Option.Option<Readonly<Record<string, string>>>
}>

const extractFrontmatter = (
  root: Root,
  frontmatter: FrontmatterDefinition | undefined,
): ExtractedFrontmatter => {
  if (frontmatter === undefined) {
    return { contentRoot: root, maybeFrontmatter: Option.none() }
  }

  return pipe(
    root.children,
    Array.head,
    Option.filter(isYamlNode),
    Option.match({
      onNone: (): ExtractedFrontmatter => ({
        contentRoot: root,
        maybeFrontmatter: Option.none(),
      }),
      onSome: (yamlNode): ExtractedFrontmatter => {
        const parsedFields = parseFrontmatterFields(
          yamlNode.value,
          yamlNode.position,
        )
        validateFrontmatterFields(frontmatter, parsedFields, yamlNode.position)

        return {
          contentRoot: { ...root, children: root.children.slice(1) },
          maybeFrontmatter: Option.some(parsedFields.fields),
        }
      },
    }),
  )
}

const parseWithValidatedOptions = (
  source: string,
  options: MarkdownPluginOptions,
): ParsedMarkdown => {
  const { contentRoot, maybeFrontmatter } = extractFrontmatter(
    processor.parse(source),
    options.frontmatter,
  )
  return {
    document: normalizeRoot(contentRoot, options),
    maybeFrontmatter,
  }
}

/**
 * Parses markdown source into a typed {@link MarkdownDocument}. Throws on any
 * construct outside the markdown vocabulary, and on malformed options. The
 * {@link markdown} plugin runs this per `.md` module; call it directly for
 * one-off compilation in scripts. Frontmatter, when enabled via the
 * `frontmatter` option, is validated and dropped; use
 * {@link parseMarkdownWithFrontmatter} to read it.
 */
export const parseMarkdown = (
  source: string,
  options: MarkdownPluginOptions = {},
): MarkdownDocument =>
  parseWithValidatedOptions(source, validateMarkdownPluginOptions(options))
    .document

/**
 * Like {@link parseMarkdown}, but also returns the document's frontmatter
 * fields when the `frontmatter` option is set and the source carries a
 * frontmatter block. The fields arrive as the raw strings the block declares,
 * already validated against the schema, so decoding them with the same schema
 * cannot fail.
 */
export const parseMarkdownWithFrontmatter = (
  source: string,
  options: MarkdownPluginOptions = {},
): ParsedMarkdown =>
  parseWithValidatedOptions(source, validateMarkdownPluginOptions(options))

/**
 * Vite plugin that compiles imported `.md` files at build time into typed
 * document modules. Decode the default export with `decodeDocument` and
 * render it with `Markdown.view`. Every module also carries a `frontmatter`
 * named export: with a `frontmatter` schema configured, it holds the
 * document's validated frontmatter fields, and it is `undefined` when the
 * document has no frontmatter block.
 */
export const markdown = (options: MarkdownPluginOptions = {}): Plugin => {
  const validatedOptions = validateMarkdownPluginOptions(options)

  return {
    name: 'foldkit-markdown',
    transform(source, id) {
      if (!id.endsWith('.md')) {
        return undefined
      }
      const { document, maybeFrontmatter } = parseWithValidatedOptions(
        source,
        validatedOptions,
      )
      const documentExport = `export default ${JSON.stringify(encodeDocument(document))}`
      // NOTE: `frontmatter` is emitted for every module, `undefined` when the
      // document has no frontmatter block, so the export always exists and the
      // `*.md` ambient declaration cannot promise an export a module lacks.
      const frontmatterExport = Option.match(maybeFrontmatter, {
        onNone: () => 'undefined',
        onSome: fields => JSON.stringify(fields),
      })
      return {
        code: `${documentExport}\nexport const frontmatter = ${frontmatterExport}`,
        map: null,
      }
    },
  }
}
