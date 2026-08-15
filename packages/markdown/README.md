# @foldkit/markdown

Write markdown files, get Foldkit views with live islands.

A Vite plugin parses each imported `.md` file with remark, validates it against an Effect Schema vocabulary, and emits a typed document module. The browser receives data, never a parser. A pure fold renders the document as Foldkit `Html`, so markdown content participates in the vdom, DevTools, and time travel like any other view.

## Install

```bash
pnpm add @foldkit/markdown
```

## Setup

Add the plugin to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'

import { markdown } from '@foldkit/markdown/vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), foldkit(), markdown()],
})
```

Type `.md` imports by adding the ambient declaration to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@foldkit/markdown/content"]
  }
}
```

If you run tests with Vitest, add `markdown()` with the same options to the `plugins` in `vitest.config.ts` as well, so test runs compile and validate `.md` imports exactly the way the app build does.

## Render a document

```typescript
import { Html, type HtmlBuilder } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import aboutRaw from './content/about.md'
import { type Message } from './message'

const about = Markdown.decodeDocument(aboutRaw)

const view = (h: HtmlBuilder<Message>): Html =>
  h.div([], [Markdown.view(about)])
```

`decodeDocument` memoizes on the wire object, so calling it inside a view decodes each module once rather than once per render.

`Markdown.view` renders every node through unstyled semantic defaults. Restyle any node by overriding its view:

```typescript
Markdown.view(about, {
  views: {
    Paragraph: (paragraph, content) =>
      h.p([h.Class('leading-relaxed text-stone-700')], content),
    Link: ({ url }, content) =>
      h.a([h.Href(url), h.Class('underline underline-offset-2')], content),
  },
})
```

`Markdown.viewBlocks` returns one `Html` per top-level block instead, for when the blocks should land directly inside your own container element.

## Islands

Directives reserve space in the prose for live application views. A leaf directive stands alone; a container directive wraps nested markdown:

```markdown
The count lives in the Model like everything else on this page.

::Counter{label="Clicks while reading"}

:::Note{tone="calm"}
Islands can wrap _markdown_ too.
:::
```

Declare each island's attributes as a Schema struct, once, in a module both your Vite config and your views import:

```typescript
// src/islands.ts
import { Schema as S } from 'effect'

export const islandAttributes = {
  Counter: S.Struct({ label: S.optionalKey(S.String) }),
  Note: S.Struct({ tone: S.optionalKey(S.String) }),
}
```

Pass the definitions to the plugin and every directive validates at build time. An unknown island name, an unknown attribute, or an attribute value outside its schema fails the build with the file and line:

```typescript
import { markdown } from '@foldkit/markdown/vite'

import { islandAttributes } from './src/islands'

markdown({ islands: islandAttributes })
```

`islandsFor` pairs the same definitions with typed views: attributes arrive decoded through each island's schema, and the record must cover every declared name. State stays in your Model; the markdown only decides placement. The third argument is the zero-based occurrence of that island name in the document, for identifiers that must be unique per instance, like an `h.submodel` slotId:

```typescript
import { Html, type HtmlBuilder } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { Counter } from './counter'
import { islandAttributes } from './islands'
import { GotCounterMessage, type Message, type Model } from './message'

const postView = (
  model: Model,
  post: Markdown.MarkdownDocument,
  h: HtmlBuilder<Message>,
): Html =>
  Markdown.view(post, {
    islands: Markdown.islandsFor(islandAttributes, {
      Counter: ({ label }, _content, occurrenceIndex) =>
        h.div(
          [],
          [
            h.span([], [label ?? 'Counter']),
            h.submodel({
              slotId: `counter-${occurrenceIndex}`,
              model: model.counter,
              view: Counter.view,
              toParentMessage: message => GotCounterMessage({ message }),
            }),
          ],
        ),
      Note: (_attributes, content) =>
        h.aside([h.Class('rounded border p-4')], content),
    }),
  })
```

Attribute values are strings on the wire, so transforming field schemas decode past them: `S.NumberFromString` turns `::Chart{height="240"}` into `height: number`. A plain `islands` record of untyped views (`Readonly<Record<string, IslandView>>`) also works when you want to skip the schemas.

## Frontmatter

Documents can open with a frontmatter block when the plugin is given a schema for it. Declare the fields as a Schema struct, once, in a module both your Vite config and your application import:

```typescript
// src/postFrontmatter.ts
import { Schema as S } from 'effect'

export const PostFrontmatter = S.Struct({
  title: S.String.check(S.isNonEmpty()),
  date: S.String,
})
```

```typescript
import { markdown } from '@foldkit/markdown/vite'

import { PostFrontmatter } from './src/postFrontmatter'

markdown({ frontmatter: PostFrontmatter })
```

```markdown
---
title: 'Introducing the blog'
date: 2026-08-01
---

The prose starts here.
```

Every field validates at build time. An unknown field, a missing required field, or a value the schema rejects fails the build with the file and line. Without a `frontmatter` schema, a frontmatter block fails the build.

The supported shape is deliberately flat: one `key: value` pair per line, every value a string. A value wrapped in matching single or double quotes has that outer pair stripped, so values containing special characters like `:` stay unambiguous. Only the first and last characters decide, so a value that itself starts and ends with the same quote character loses that pair; wrap it in the other quote style to keep it. Nesting, lists, and multi-line values are not supported.

Every compiled `.md` module carries a `frontmatter` named export alongside the default document export. It holds the block's validated fields, and it is `undefined` when the document has no block:

```typescript
import postRaw, { frontmatter } from './post/introducing-the-blog.md'
```

The fields arrive as the raw strings the block declares. The build validates them against the schema and discards the decoded result, so where the application needs typed values, decode the export with the same schema at runtime; validation at build time means that decode cannot fail. `S.NumberFromString` and friends do their transformation in that runtime decode, not in the emitted module.

## Vocabulary

The schema accepts CommonMark plus GFM tables and strikethrough: headings, paragraphs, emphasis, strong, strikethrough, inline code, links, images, hard breaks, nested lists, code blocks, blockquotes, thematic breaks, and tables. Directives (`::Name`, `:::Name`) become Island nodes.

Anything outside the vocabulary fails the build with an error naming the construct and its line. Raw HTML is rejected by design; islands are the escape hatch. Reference-style links, footnotes, task lists, and directive labels (`::Name[label]`) are not supported. Frontmatter is supported only with a `frontmatter` schema configured, in the flat shape described above. Link and image URLs must be relative or use the `http:`, `https:`, `mailto:`, or `tel:` schemes; executable schemes like `javascript:` fail the build.

## One-off compilation

`parseMarkdown` runs the same parse-and-validate pipeline outside Vite, for scripts and tests:

```typescript
import { parseMarkdown } from '@foldkit/markdown/vite'

import { islandAttributes } from './islands'

const document = parseMarkdown('# Title', { islands: islandAttributes })
```

`parseMarkdownWithFrontmatter` also returns the document's frontmatter fields, as an `Option` of the raw string record:

```typescript
import { parseMarkdownWithFrontmatter } from '@foldkit/markdown/vite'

import { PostFrontmatter } from './postFrontmatter'

const { document, maybeFrontmatter } = parseMarkdownWithFrontmatter(source, {
  frontmatter: PostFrontmatter,
})
```
