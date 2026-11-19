import type { DefaultTreeAdapterMap } from 'parse5'
import {
  html as Parse5Html,
  defaultTreeAdapter,
  parse,
  parseFragment,
} from 'parse5'
import { describe, expect, it } from 'vitest'

import { parseFragmentModes, scriptingModesFor } from './fragment.js'

const DIV_CONTEXT = defaultTreeAdapter.createElement(
  'div',
  Parse5Html.NS.HTML,
  [],
)

// The whole parsed tree as plain data. Serializing would not do: the serializer
// writes `<noscript>` content the same way whether it parsed as text or as
// elements.
const shapeOf = (node: DefaultTreeAdapterMap['node']): unknown => ({
  name: node.nodeName,
  ...('namespaceURI' in node ? { namespace: node.namespaceURI } : {}),
  ...('attrs' in node ? { attrs: node.attrs } : {}),
  ...('value' in node ? { value: node.value } : {}),
  ...('data' in node ? { data: node.data } : {}),
  ...('childNodes' in node ? { children: node.childNodes.map(shapeOf) } : {}),
  ...('content' in node ? { content: shapeOf(node.content) } : {}),
})

const asDocument = (html: string): string =>
  `<!doctype html><html><head><title>t</title></head><body><div>${html}</div></body></html>`

// Markup without `<noscript>` that reaches the parser's recovery paths: open
// tables, selects and templates, foreign content and its integration points,
// raw text and RCDATA, formatting reconstruction, and input cut off mid-token.
const NOSCRIPT_FREE_MARKUP: ReadonlyArray<string> = [
  '<p>plain <b>text</b></p>',
  '<table><tr><td>cell<p>after',
  '<select><option>one<option>two',
  '<template><tr><td>cell</template><p>after',
  '<svg><foreignObject><p>html</p></foreignObject><circle/></svg>',
  '<math><mi>x</mi><annotation-xml encoding="text/html"><p>y</p></annotation-xml></math>',
  '<textarea><b>raw</b>',
  '<style>p { color: red }',
  '<script>let x = "<p>"',
  '<title><p>text</title>',
  '<p><b>x</p>y',
  '<a href="/one"><a href="/two">nested</a>',
  '<div title="unfinished',
  '<!-- open comment',
  'tail &',
  'tail <',
  '<form><form><input></form>',
  '<plaintext><p>rest',
  '<noembed><p></noembed><iframe><p></iframe>',
  '<body class="x"><html lang="y"><frameset>',
]

describe('parseFragmentModes', () => {
  it('shares one tree that equals a scripting-disabled parse when the markup has no <noscript>', () => {
    for (const html of NOSCRIPT_FREE_MARKUP) {
      const fragments = parseFragmentModes(DIV_CONTEXT, html)
      const unscripted = parseFragment(DIV_CONTEXT, html, {
        scriptingEnabled: false,
      })

      expect(fragments.unscripted).toBe(fragments.scripted)
      expect(shapeOf(fragments.unscripted)).toEqual(shapeOf(unscripted))
    }
  })

  it('parses both modes when the markup has a <noscript> in any letter case', () => {
    for (const html of [
      '<noscript><p>fallback</p></noscript><p>after</p>',
      '<NoScript><p>fallback</p></NoScript><p>after</p>',
    ]) {
      const fragments = parseFragmentModes(DIV_CONTEXT, html)

      expect(shapeOf(fragments.unscripted)).not.toEqual(
        shapeOf(fragments.scripted),
      )
    }
  })
})

describe('scriptingModesFor', () => {
  it('names one mode for documents that parse identically in both', () => {
    for (const html of NOSCRIPT_FREE_MARKUP) {
      const document = asDocument(html)

      expect(scriptingModesFor(document)).toEqual([true])
      expect(shapeOf(parse(document, { scriptingEnabled: false }))).toEqual(
        shapeOf(parse(document, { scriptingEnabled: true })),
      )
    }
  })

  it('names both modes when any source has a <noscript>', () => {
    expect(scriptingModesFor('<p>plain</p>', '<NOSCRIPT>')).toEqual([
      true,
      false,
    ])
  })
})
