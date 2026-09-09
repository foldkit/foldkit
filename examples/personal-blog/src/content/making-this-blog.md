The words you are reading live in a markdown file. At build time, a Vite plugin from `@foldkit/markdown` parses that file, checks it against a Schema, and emits a typed tree of blocks. The view folds the tree into real Foldkit Html. No parser ships to the browser, and the prose participates in the vdom like everything else on this site.

## Why bother

I wanted three things at once:

- Writing in plain markdown, with nothing between me and the words
- Real Foldkit views, so DevTools and time travel keep working
- A build that fails loudly when a file uses syntax the site does not support

That last one is my favorite. The vocabulary is a contract. Write a footnote and the build stops with the file and line, not a silently empty `div`.

## The fold

Rendering is one pure function from document to Html. Every node type has an unstyled semantic default, and this site overrides the ones it wants to dress up:

```ts
const proseView = (
  document: Markdown.MarkdownDocument,
  islands: Markdown.Islands,
): Html =>
  h.div(
    [h.Class('space-y-5')],
    Markdown.viewBlocks(document, { islands, views: blogViews }),
  )
```

## Proof that it is alive

Markdown is data here, so a post can reserve space for something that lives in the Model. This counter is a real Submodel nestled between two paragraphs:

::Counter{label="Clicks while reading this post"}

Navigate away, come back, and the count survives. Open the DevTools overlay and scrub the history, and you can watch every click replay.

:::Note
Islands can wrap markdown too. This callout is a container directive, and _this_ emphasis renders through the same fold as everything else.
:::

> A blog post that can hold live components is an app wearing prose.

That is the whole trick.
