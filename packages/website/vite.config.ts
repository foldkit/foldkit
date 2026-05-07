import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { Array, Match as M, Option, Schema as S, pipe } from 'effect'
import { readFile, readdir } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import { codeToHtml } from 'shiki'
import { type Plugin, defineConfig } from 'vite'

import { playgroundFilesPlugin } from './scripts/playgroundFilesPlugin'
import {
  ParsedApiReference,
  moduleNameToSlug,
  parseTypedocJson,
} from './src/page/apiReference/domain'
import {
  typeDefFromChildren,
  typeToString,
} from './src/page/apiReference/typeToString'
import {
  Kind,
  type TypeDocCommentPart,
  type TypeDocItem,
  TypeDocJson,
  type TypeDocParam,
  type TypeDocSignature,
  type TypeDocTypeParam,
} from './src/page/apiReference/typedoc'
import { exampleSlugs } from './src/page/example/meta'
import { shikiDarkTheme, shikiLightTheme } from './src/shikiTheme'

const shikiThemes = {
  light: shikiLightTheme,
  dark: shikiDarkTheme,
}

const highlightCodePlugin = (): Plugin => ({
  name: 'highlight-code',
  async transform(_code, id) {
    if (!id.includes('?highlighted')) {
      return undefined
    }

    const filePath = id.slice(0, id.indexOf('?'))
    const rawCode = await readFile(filePath, 'utf-8')
    const code = rawCode.trimEnd()

    const lines = code.split('\n')
    const lineCount = lines.length
    const lineDigits = String(lineCount).length

    const lang = filePath.endsWith('.tsx') ? 'tsx' : 'typescript'

    const html = await codeToHtml(code, {
      lang,
      themes: shikiThemes,
      decorations: lines.map((line, i) => ({
        start: { line: i, character: 0 },
        end: { line: i, character: line.length },
        properties: { 'data-line': i + 1 },
      })),
    })

    const htmlWithDigits = html.replace(
      '<pre ',
      `<pre data-line-digits="${lineDigits}" `,
    )

    return `export default ${JSON.stringify(htmlWithDigits)}`
  },
})

const VIRTUAL_MODULE_ID = 'virtual:api-highlights'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

const API_MODULE_INDEX_ID = 'virtual:api-module-index'
const RESOLVED_API_MODULE_INDEX_ID = '\0' + API_MODULE_INDEX_ID

const PARSED_API_ID = 'virtual:parsed-api'
const RESOLVED_PARSED_API_ID = '\0' + PARSED_API_ID

const formatTypeParam = (typeParam: TypeDocTypeParam): string => {
  const constraint = Option.match(typeParam.type, {
    onNone: () => '',
    onSome: () => ` extends ${typeToString(typeParam.type)}`,
  })
  const defaultValue = Option.match(typeParam.default, {
    onNone: () => '',
    onSome: () => ` = ${typeToString(typeParam.default)}`,
  })
  return `${typeParam.name}${constraint}${defaultValue}`
}

const formatParam = (parameter: TypeDocParam, depth: number): string => {
  const optionalSuffix = parameter.flags.isOptional ? '?' : ''
  return `${parameter.name}${optionalSuffix}: ${typeToString(parameter.type, depth)}`
}

const formatParams = (parameters: ReadonlyArray<TypeDocParam>): string =>
  Array.matchLeft(parameters, {
    onEmpty: () => '()',
    onNonEmpty: (first, rest) =>
      Array.match(rest, {
        onEmpty: () => `(${formatParam(first, 0)})`,
        onNonEmpty: () =>
          pipe(
            parameters,
            Array.map(parameter => `  ${formatParam(parameter, 1)}`),
            Array.join(',\n'),
            joined => `(\n${joined}\n)`,
          ),
      }),
  })

const buildFunctionSignatureString = (signature: TypeDocSignature): string => {
  const typeParamString = pipe(
    signature.typeParameters,
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.match({
      onNone: () => '',
      onSome: typeParams =>
        pipe(
          typeParams,
          Array.map(formatTypeParam),
          Array.join(', '),
          joined => `<${joined}>`,
        ),
    }),
  )

  const paramString = pipe(
    signature.parameters,
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.match({
      onNone: () => '()',
      onSome: formatParams,
    }),
  )

  return `${typeParamString}${paramString}: ${typeToString(signature.type)}`
}

const partsToText = (
  parts: ReadonlyArray<TypeDocCommentPart>,
): Option.Option<string> =>
  pipe(
    Array.map(parts, ({ text }) => text),
    Array.join(''),
    text => text.trim(),
    Option.liftPredicate(text => text.length > 0),
  )

const itemDescription = (item: TypeDocItem): Option.Option<string> =>
  pipe(
    item.comment,
    Option.flatMap(comment => comment.summary),
    Option.flatMap(partsToText),
  )

const signatureDescription = (item: TypeDocItem): Option.Option<string> =>
  pipe(
    item.signatures,
    Option.flatMap(Array.head),
    Option.flatMap(({ comment }) => comment),
    Option.flatMap(comment => comment.summary),
    Option.flatMap(partsToText),
  )

const formatAsDocComment = (description: string): string => {
  const lines = description.split('\n')
  if (lines.length === 1) {
    return `/** ${description} */`
  }
  return ['/**', ...lines.map(line => ` * ${line}`), ' */'].join('\n')
}

const prependDescription = (
  code: string,
  maybeDescription: Option.Option<string>,
): string =>
  Option.match(maybeDescription, {
    onNone: () => code,
    onSome: description => `${formatAsDocComment(description)}\n${code}`,
  })

const functionEntries = (
  prefix: string,
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> =>
  pipe(
    item.signatures,
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.match({
      onNone: () => [],
      onSome: signatures => [
        [
          `function-${prefix}${item.name}`,
          prependDescription(
            pipe(
              signatures,
              Array.map(
                signature =>
                  `declare function _${buildFunctionSignatureString(signature)}`,
              ),
              Array.join('\n\n'),
            ),
            signatureDescription(item),
          ),
        ] as const,
      ],
    }),
  )

const isExtractedTypeAlias = (item: TypeDocItem): boolean =>
  Option.exists(item.type, ({ type }) => type === 'query')

const typeAliasEntries = (
  prefix: string,
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> => {
  if (isExtractedTypeAlias(item)) {
    return []
  }
  const tsString = Option.match(item.type, {
    onNone: () => `type ${item.name} = ${typeDefFromChildren(item.children)}`,
    onSome: () => `type ${item.name} = ${typeToString(item.type)}`,
  })
  return [
    [
      `type-${prefix}${item.name}`,
      prependDescription(tsString, itemDescription(item)),
    ] as const,
  ]
}

const interfaceEntries = (
  prefix: string,
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> => [
  [
    `interface-${prefix}${item.name}`,
    prependDescription(
      `interface ${item.name} ${typeDefFromChildren(item.children)}`,
      itemDescription(item),
    ),
  ] as const,
]

const variableEntries = (
  prefix: string,
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> => [
  [
    `const-${prefix}${item.name}`,
    prependDescription(
      `const ${item.name}: ${typeToString(item.type)}`,
      itemDescription(item),
    ),
  ] as const,
]

const itemToEntries = (
  prefix: string,
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> =>
  M.value(item.kind).pipe(
    M.when(Kind.Function, () => functionEntries(prefix, item)),
    M.when(Kind.TypeAlias, () => typeAliasEntries(prefix, item)),
    M.when(Kind.Interface, () => interfaceEntries(prefix, item)),
    M.when(Kind.Variable, () => variableEntries(prefix, item)),
    M.orElse(() => []),
  )

// NOTE: Signatures are wrapped as `declare function _<sig>` so Shiki highlights them
// as valid TypeScript. This strips the wrapper from the highlighted HTML output.
const stripDeclarePrefix = (html: string): string =>
  html.replace(
    /<span[^>]*>declare<\/span><span[^>]*> function<\/span><span[^>]*> _<\/span>/g,
    '',
  )

const highlightApiSignaturesPlugin = (): Plugin => ({
  name: 'highlight-api-signatures',
  resolveId(id) {
    if (id === VIRTUAL_MODULE_ID) {
      return RESOLVED_VIRTUAL_MODULE_ID
    } else {
      return undefined
    }
  },
  async load(id) {
    if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
      return undefined
    }

    const jsonPath = resolve(__dirname, 'src/generated/api.json')
    const raw = await readFile(jsonPath, 'utf-8')
    const json = S.decodeUnknownSync(TypeDocJson)(JSON.parse(raw))

    const itemsToEntries = (
      prefix: string,
      children: ReadonlyArray<TypeDocItem>,
    ): ReadonlyArray<readonly [string, string]> =>
      Array.flatMap(children, item =>
        item.kind === Kind.Namespace
          ? Option.match(item.children, {
              onNone: () => [],
              onSome: namespaceChildren =>
                itemsToEntries(`${prefix}${item.name}/`, namespaceChildren),
            })
          : itemToEntries(prefix, item),
      )

    const entries = Array.flatMap(json.children, ({ name, children }) =>
      itemsToEntries(`${name}/`, children),
    )

    const highlightedEntries = await Promise.all(
      Array.map(entries, async ([key, tsString]) => {
        const html = await codeToHtml(tsString, {
          lang: 'typescript',
          themes: shikiThemes,
        })
        return [
          key,
          key.startsWith('function-') ? stripDeclarePrefix(html) : html,
        ] as const
      }),
    )

    const highlighted = Object.fromEntries(highlightedEntries)

    return `export default ${JSON.stringify(highlighted)}`
  },
})

// NOTE: Tiny synchronous index of API module slugs + display names. Used by the sidebar so
// it can render link entries without pulling in the parsed api payload or the pre-highlighted
// HTML, both of which are loaded lazily via virtual:parsed-api and virtual:api-highlights.
const apiModuleIndexPlugin = (): Plugin => ({
  name: 'api-module-index',
  resolveId(id) {
    if (id === API_MODULE_INDEX_ID) {
      return RESOLVED_API_MODULE_INDEX_ID
    } else {
      return undefined
    }
  },
  async load(id) {
    if (id !== RESOLVED_API_MODULE_INDEX_ID) {
      return undefined
    }

    const jsonPath = resolve(__dirname, 'src/generated/api.json')
    const raw = await readFile(jsonPath, 'utf-8')
    const json = S.decodeUnknownSync(TypeDocJson)(JSON.parse(raw))

    const collectNestedNames = (
      prefix: string,
      children: ReadonlyArray<TypeDocItem>,
    ): ReadonlyArray<string> =>
      Array.flatMap(children, item => {
        if (item.kind !== Kind.Namespace) {
          return []
        }
        return Option.match(item.children, {
          onNone: () => [],
          onSome: namespaceChildren => {
            const qualifiedName = `${prefix}/${item.name}`
            const hasDeclarations = Array.some(
              namespaceChildren,
              ({ kind }) => kind !== Kind.Namespace,
            )
            const selfEntry = hasDeclarations ? [qualifiedName] : []
            const nested = collectNestedNames(qualifiedName, namespaceChildren)
            return [...selfEntry, ...nested]
          },
        })
      })

    const index = Array.flatMap(json.children, module => {
      const hasDeclarations = Array.some(
        module.children,
        ({ kind }) => kind !== Kind.Namespace,
      )
      const selfEntry = hasDeclarations ? [module.name] : []
      const nested = collectNestedNames(module.name, module.children)
      return Array.map([...selfEntry, ...nested], name => ({
        slug: moduleNameToSlug(name),
        name,
      }))
    })

    return `export default ${JSON.stringify(index)}`
  },
})

const parsedApiPlugin = (): Plugin => ({
  name: 'parsed-api',
  resolveId(id) {
    if (id === PARSED_API_ID) {
      return RESOLVED_PARSED_API_ID
    } else {
      return undefined
    }
  },
  async load(id) {
    if (id !== RESOLVED_PARSED_API_ID) {
      return undefined
    }

    const jsonPath = resolve(__dirname, 'src/generated/api.json')
    const raw = await readFile(jsonPath, 'utf-8')
    const json = S.decodeUnknownSync(TypeDocJson)(JSON.parse(raw))
    const parsed = parseTypedocJson(json)
    const encoded = S.encodeSync(ParsedApiReference)(parsed)

    return `export default ${JSON.stringify(encoded)}`
  },
})

const COUNTER_DEMO_CODE_ID = 'virtual:counter-demo-code'
const RESOLVED_COUNTER_DEMO_CODE_ID = '\0' + COUNTER_DEMO_CODE_ID

const DEMO_CODE = `// MODEL

const Model = S.Struct({
  count: S.Number,
  isResetting: S.Boolean,
  resetDuration: S.Number,
})

// MESSAGE

const ClickedIncrement = m('ClickedIncrement')
const ChangedResetDuration = m('ChangedResetDuration', {
  seconds: S.Number,
})
const ClickedReset = m('ClickedReset')
const CompletedDelayReset = m('CompletedDelayReset')

// COMMAND

const DelayReset = Command.define('DelayReset', CompletedDelayReset)

// UPDATE

M.tagsExhaustive({
  ClickedIncrement: () => [
    evo(model, { count: count => count + 1 }),
    [],
  ],
  ChangedResetDuration: ({ seconds }) => [
    evo(model, { resetDuration: () => seconds }),
    [],
  ],
  ClickedReset: () => [
    evo(model, { isResetting: () => true }),
    [DelayReset(
      Task.delay(\`\${model.resetDuration} seconds\`).pipe(
        Effect.as(CompletedDelayReset()),
      ),
    )],
  ],
  CompletedDelayReset: () => [
    evo(model, { count: () => 0, isResetting: () => false }),
    [],
  ],
})`

const counterDemoCodePlugin = (): Plugin => ({
  name: 'counter-demo-code',
  resolveId(id) {
    if (id === COUNTER_DEMO_CODE_ID) {
      return RESOLVED_COUNTER_DEMO_CODE_ID
    } else {
      return undefined
    }
  },
  async load(id) {
    if (id !== RESOLVED_COUNTER_DEMO_CODE_ID) {
      return undefined
    }

    const code = DEMO_CODE.trimEnd()
    const lines = code.split('\n')
    const lineCount = lines.length
    const lineDigits = String(lineCount).length

    const html = await codeToHtml(code, {
      lang: 'typescript',
      themes: shikiThemes,
      decorations: lines.map((line, i) => ({
        start: { line: i, character: 0 },
        end: { line: i, character: line.length },
        properties: { 'data-line': i + 1 },
      })),
    })

    const htmlWithDigits = html.replace(
      '<pre ',
      `<pre data-line-digits="${lineDigits}" `,
    )

    return `export default ${JSON.stringify(htmlWithDigits)}`
  },
})

const NOTE_PLAYER_DEMO_CODE_ID = 'virtual:note-player-demo-code'
const RESOLVED_NOTE_PLAYER_DEMO_CODE_ID = '\0' + NOTE_PLAYER_DEMO_CODE_ID

const NOTE_PLAYER_DEMO_CODE = `// MODEL

const Model = S.Struct({
  noteInput: NoteInputField.Union,
  noteDuration: NoteDuration,
  playbackState: PlaybackState, // Idle | Playing | Paused
})

// MESSAGE

const ClickedPlay = m('ClickedPlay')
const ClickedPause = m('ClickedPause')
const CompletedPlayNote = m('CompletedPlayNote', {
  noteIndex: S.Number,
})

// UPDATE

M.tagsExhaustive({
  ClickedPlay: () => [
    evo(model, {
      playbackState: () =>
        Playing({ noteSequence, currentNoteIndex: 0 }),
    }),
    [playNote(firstNote, model.noteDuration, 0)],
  ],
  ClickedPause: () => [
    evo(model, {
      playbackState: () =>
        Paused({ noteSequence, currentNoteIndex }),
    }),
    [],
  ],
  CompletedPlayNote: ({ noteIndex }) => {
    if (nextIndex >= noteSequence.length) {
      return [
        evo(model, { playbackState: () => Idle() }),
        [],
      ]
    } else {
      return [
        evo(model, {
          playbackState: () =>
            Playing({
              noteSequence,
              currentNoteIndex: nextIndex,
            }),
        }),
        [playNote(nextNote, model.noteDuration, nextIndex)],
      ]
    }
  },
})

// RESOURCE

class AudioContextService extends Context.Service<
  AudioContextService,
  AudioContext
>()('AudioContextService') {
  static readonly Default = Layer.sync(this, () => new AudioContext())
}

// COMMAND

const PlayNote = Command.define('PlayNote', CompletedPlayNote)

const playNote = (note, duration, noteIndex) =>
  PlayNote(
    Effect.gen(function* () {
      const audioContext = yield* AudioContextService

      return yield* Effect.callback(resume => {
        const oscillator = audioContext.createOscillator()
        oscillator.frequency.setValueAtTime(NOTE_FREQUENCIES[note])
        oscillator.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + duration)
        oscillator.onended = () =>
          resume(Effect.succeed(CompletedPlayNote({ noteIndex })))
      })
    }),
  )`

const notePlayerDemoCodePlugin = (): Plugin => ({
  name: 'note-player-demo-code',
  resolveId(id) {
    if (id === NOTE_PLAYER_DEMO_CODE_ID) {
      return RESOLVED_NOTE_PLAYER_DEMO_CODE_ID
    } else {
      return undefined
    }
  },
  async load(id) {
    if (id !== RESOLVED_NOTE_PLAYER_DEMO_CODE_ID) {
      return undefined
    }

    const code = NOTE_PLAYER_DEMO_CODE.trimEnd()
    const lines = code.split('\n')
    const lineCount = lines.length
    const lineDigits = String(lineCount).length

    const html = await codeToHtml(code, {
      lang: 'typescript',
      themes: shikiThemes,
      decorations: lines.map((line, i) => ({
        start: { line: i, character: 0 },
        end: { line: i, character: line.length },
        properties: { 'data-line': i + 1 },
      })),
    })

    const htmlWithDigits = html.replace(
      '<pre ',
      `<pre data-line-digits="${lineDigits}" `,
    )

    return `export default ${JSON.stringify(htmlWithDigits)}`
  },
})

const LANDING_DATA_ID = 'virtual:landing-data'
const RESOLVED_LANDING_DATA_ID = '\0' + LANDING_DATA_ID

const landingDataPlugin = (): Plugin => ({
  name: 'landing-data',
  resolveId(id) {
    if (id === LANDING_DATA_ID) {
      return RESOLVED_LANDING_DATA_ID
    } else {
      return undefined
    }
  },
  async load(id) {
    if (id !== RESOLVED_LANDING_DATA_ID) {
      return undefined
    }

    const packageJson = JSON.parse(
      await readFile(resolve(__dirname, '../foldkit/package.json'), 'utf-8'),
    )

    return `export const foldkitVersion = ${JSON.stringify(packageJson.version)}`
  },
})

// NOTE: Vite injects the CSS <link> at the end of <head>, after the <script> tag, with a
// `crossorigin` attribute. Safari iOS resumes rendering pre-rendered HTML before the CORS
// CSS response arrives when restoring frozen tabs, causing a flash of unstyled content.
// This plugin moves CSS <link> tags before <script> tags and strips the unnecessary
// `crossorigin` from same-origin stylesheet links so they remain render-blocking.
const cssLoadOrderPlugin = (): Plugin => ({
  name: 'css-load-order',
  enforce: 'post',
  transformIndexHtml(html) {
    const cssLinkPattern =
      /<link\s+rel="stylesheet"[^>]*crossorigin[^>]*href="[^"]*\.css"[^>]*>/g
    const cssLinks = html.match(cssLinkPattern)
    if (!cssLinks) {
      return html
    }

    let result = html
    for (const link of cssLinks) {
      result = result.replace(link, '')
    }

    const cleanedLinks = cssLinks.map(link =>
      link.replace(/\s+crossorigin/, ''),
    )

    const headOpenIndex = result.indexOf('<head>')
    if (headOpenIndex === -1) {
      return html
    }

    const insertIndex = headOpenIndex + '<head>'.length
    const linkBlock = '\n    ' + cleanedLinks.join('\n    ')
    return result.slice(0, insertIndex) + linkBlock + result.slice(insertIndex)
  },
})

const EXAMPLE_SOURCES_PREFIX = 'virtual:example-sources/'
const RESOLVED_EXAMPLE_SOURCES_PREFIX = '\0' + EXAMPLE_SOURCES_PREFIX

const EXAMPLE_SLUG_SET: Set<string> = new Set(exampleSlugs)

const EXAMPLE_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.css'])

const langFromExtension = (filePath: string): string => {
  const extension = extname(filePath)
  if (extension === '.tsx') {
    return 'tsx'
  }
  if (extension === '.css') {
    return 'css'
  }
  return 'typescript'
}

const collectSourceFiles = async (
  directory: string,
): Promise<ReadonlyArray<string>> => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter(
      entry =>
        entry.isFile() &&
        EXAMPLE_FILE_EXTENSIONS.has(extname(entry.name)) &&
        !entry.parentPath.includes('node_modules') &&
        !entry.name.startsWith('vitest-setup'),
    )
    .map(entry => join(entry.parentPath, entry.name))
}

const sortExampleFiles = (
  files: ReadonlyArray<string>,
  baseDirectory: string,
): ReadonlyArray<string> =>
  [...files].sort((fileA, fileB) => {
    const relativeA = relative(baseDirectory, fileA)
    const relativeB = relative(baseDirectory, fileB)
    const isMainA = basename(fileA) === 'main.ts'
    const isMainB = basename(fileB) === 'main.ts'
    if (isMainA && !isMainB) {
      return -1
    }
    if (!isMainA && isMainB) {
      return 1
    }
    const depthA = relativeA.split('/').length
    const depthB = relativeB.split('/').length
    if (depthA !== depthB) {
      return depthA - depthB
    }
    return relativeA.localeCompare(relativeB)
  })

const highlightExampleFile = async (
  filePath: string,
  baseDirectory: string,
) => {
  const rawCode = await readFile(filePath, 'utf-8')
  const code = rawCode.trimEnd()
  const lines = code.split('\n')
  const lineCount = lines.length
  const lineDigits = String(lineCount).length
  const lang = langFromExtension(filePath)

  const html = await codeToHtml(code, {
    lang,
    themes: shikiThemes,
    decorations: lines.map((line, i) => ({
      start: { line: i, character: 0 },
      end: { line: i, character: line.length },
      properties: { 'data-line': i + 1 },
    })),
  })

  const htmlWithDigits = html.replace(
    '<pre ',
    `<pre data-line-digits="${lineDigits}" `,
  )

  return {
    path: relative(baseDirectory, filePath),
    highlightedHtml: htmlWithDigits,
    rawCode: code,
  }
}

const highlightExampleSourcesPlugin = (): Plugin => ({
  name: 'highlight-example-sources',
  resolveId(id) {
    if (id.startsWith(EXAMPLE_SOURCES_PREFIX)) {
      return '\0' + id
    } else {
      return undefined
    }
  },
  async load(id) {
    if (!id.startsWith(RESOLVED_EXAMPLE_SOURCES_PREFIX)) {
      return undefined
    }

    const slug = id.slice(RESOLVED_EXAMPLE_SOURCES_PREFIX.length)
    if (!EXAMPLE_SLUG_SET.has(slug)) {
      return undefined
    }

    const exampleDirectory = resolve(__dirname, `../../examples/${slug}`)
    const sourceDirectory = join(exampleDirectory, 'src')
    const allFiles = await collectSourceFiles(sourceDirectory)
    const sortedFiles = sortExampleFiles(allFiles, exampleDirectory)

    const files = await Promise.all(
      sortedFiles.map(filePath =>
        highlightExampleFile(filePath, exampleDirectory),
      ),
    )

    return `export default ${JSON.stringify({ files })}`
  },
})

const embeddedExampleRedirectPlugin = (): Plugin => ({
  name: 'embedded-example-redirect',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url) {
        return next()
      }
      const url = new URL(req.url, 'http://localhost')
      const slug = url.searchParams.get('embedded')
      if (
        slug &&
        EXAMPLE_SLUG_SET.has(slug) &&
        !url.pathname.startsWith('/example-apps-embed/')
      ) {
        const target = `/example-apps-embed/${slug}/index.html${url.search}`
        res.writeHead(302, { Location: target })
        res.end()
        return undefined
      }
      next()
    })
  },
})

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({ devToolsMcpPort: 9988 }),
    embeddedExampleRedirectPlugin(),
    highlightCodePlugin(),
    highlightApiSignaturesPlugin(),
    apiModuleIndexPlugin(),
    parsedApiPlugin(),
    landingDataPlugin(),
    counterDemoCodePlugin(),
    notePlayerDemoCodePlugin(),
    highlightExampleSourcesPlugin(),
    playgroundFilesPlugin(),
    cssLoadOrderPlugin(),
  ],
})
