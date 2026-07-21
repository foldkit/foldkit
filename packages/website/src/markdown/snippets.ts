import { Array, Option, Record as Record_, Result, String, pipe } from 'effect'

// SNIPPETS

/**
 * One compiled snippet: `raw` is the verbatim source for the copy button,
 * `highlighted` is the build-time Shiki HTML rendered through `h.InnerHTML`.
 */
export type Snippet = Readonly<{ raw: string; highlighted: string }>

type SnippetEntry = readonly [string, Snippet]

const rawByPath = import.meta.glob<string>('../snippet/*.{ts,tsx,elm,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const highlightedByPath = import.meta.glob<string>(
  '../snippet/*.{ts,tsx,elm,json}',
  { query: '?highlighted', import: 'default', eager: true },
)

const snippetName = (path: string): Option.Option<string> =>
  pipe(
    Array.last(String.split(path, '/')),
    Option.map(fileName => fileName.replace(/\.(?:ts|tsx|elm|json)$/, '')),
  )

const registry: Record<string, Snippet> = pipe(
  Record_.toEntries(rawByPath),
  Array.filterMap(([path, raw]) =>
    pipe(
      Option.all([snippetName(path), Record_.get(highlightedByPath, path)]),
      Option.map(
        ([name, highlighted]): SnippetEntry => [name, { raw, highlighted }],
      ),
      Result.fromOption(() => undefined),
    ),
  ),
  Record_.fromEntries,
)

/**
 * Looks up a compiled snippet by its file basename, for example
 * `"counterCommands"` for `src/snippet/counterCommands.ts`.
 */
export const lookupSnippet = (name: string): Option.Option<Snippet> =>
  Record_.get(registry, name)

/**
 * Every registered snippet name, so a build-time check can validate that each
 * `::Snippet{name="..."}` directive resolves to a real file.
 */
export const snippetNames: ReadonlyArray<string> = Record_.keys(registry)
