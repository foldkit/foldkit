import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreMountRouter, exampleDetailRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const definingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'defining-a-binding',
  text: 'Defining a Binding',
}

const propertiesAndEventsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'properties-and-events',
  text: 'Properties and Events',
}

const whenToReachHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'when-to-reach-for-customelement',
  text: 'When to Reach for CustomElement',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  definingHeader,
  propertiesAndEventsHeader,
  whenToReachHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/custom-element', 'CustomElement'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Native web components are a standard browser feature: a hyphenated tag, a class extending ',
        inlineCode('HTMLElement'),
        ', observed attributes, JS properties, and ',
        inlineCode('CustomEvent'),
        's. They render their own shadow DOM and handle their own keyboard and pointer behavior. Foldkit gives them a typed seam through ',
        inlineCode('CustomElement.define'),
        ', so they slot into a view next to standard elements without manual property wiring or a separate mount step.',
      ),
      para(
        'You declare the element’s shape once with Schema. Property factories arrive as PascalCase methods on the builder, event factories as ',
        inlineCode('On{PascalCase}'),
        ' methods. The builder is callable, so the element itself appears inline in your view alongside ',
        inlineCode('h.div'),
        ', ',
        inlineCode('h.button'),
        ', etc. Property changes diff across renders; CustomEvents come back as Messages.',
      ),
      infoCallout(
        'CustomElement.define mirrors Command.define and Mount.define',
        'The shape is consistent across Foldkit’s lifecycle primitives. Declare the foreign element once. The runtime owns the wiring. Your view stays a pure function from Model to VNode.',
      ),
      tableOfContentsEntryToHeader(definingHeader),
      para(
        'Foldkit only owns the typed binding. Registering the element class with the browser is the same step you would take in any other framework. Most third-party packages do it for you when imported: ',
        inlineCode("import 'vanilla-colorful/hex-color-picker.js'"),
        ' calls ',
        inlineCode("customElements.define('hex-color-picker', HexColorPicker)"),
        ' as a side effect, and ',
        inlineCode('<hex-color-picker>'),
        ' is then a real tag in the browser. If you author your own element, you do the same: ',
        inlineCode("customElements.define('your-tag', YourClass)"),
        ' once, usually alongside the class definition.',
      ),
      para(
        'A ',
        inlineCode('CustomElement.define'),
        ' call takes the tag name, a record of properties keyed by their JS property name, and a record of events keyed by their kebab-case event name. It returns a spec you can export and share across modules. Inside the view module, call ',
        inlineCode('.withMessage<Message>()'),
        ' to mint a typed builder bound to your Message universe.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.customElementDefineHighlighted),
          ],
          [],
        ),
        Snippets.customElementDefineRaw,
        'Copy CustomElement.define example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The element constructor is callable. Pass attributes (including the property and event factories) as the first argument and children as the second, same shape as ',
        inlineCode('h.div'),
        ' and friends. Property factories are checked against the declared Schema at the type level: ',
        inlineCode('qr.Size("220")'),
        ' is a compile error when ',
        inlineCode('size'),
        ' is declared as ',
        inlineCode('S.Number'),
        '. Event factories receive a typed ',
        inlineCode('detail'),
        ' argument; the consumer returns a Message that the runtime dispatches when the CustomEvent fires.',
      ),
      tableOfContentsEntryToHeader(propertiesAndEventsHeader),
      para(
        'Each property in the config becomes a PascalCase factory: ',
        inlineCode('value'),
        ' → ',
        inlineCode('Value'),
        ', ',
        inlineCode('isDisabled'),
        ' → ',
        inlineCode('IsDisabled'),
        '. The factory writes a JS property on the live element through ',
        inlineCode('propsModule'),
        ', not an HTML attribute. That distinction matters: properties can carry any JS value (arrays, dates, objects), and ',
        inlineCode('propsModule'),
        ' diffs them across renders so the element only receives writes when the value actually changes. Removed boolean properties get reset to ',
        inlineCode('false'),
        ' on cleanup.',
      ),
      para(
        'Each event becomes an ',
        inlineCode('On{PascalCase}'),
        ' factory derived from the kebab-case name: ',
        inlineCode('"color-changed"'),
        ' → ',
        inlineCode('OnColorChanged'),
        '. The factory takes a ',
        inlineCode('(detail) => Message'),
        ' callback. When the element dispatches the CustomEvent, the runtime extracts ',
        inlineCode('event.detail'),
        ', runs your callback, and dispatches the resulting Message just like any other handler.',
      ),
      infoCallout(
        'Validation runs at define time',
        inlineCode('CustomElement.define'),
        ' validates property and event names up front. Property names must be valid JS identifiers; event names must be hyphen-separated lowercase segments. Collisions between factory names (e.g. a ',
        inlineCode('click'),
        ' event and an ',
        inlineCode('onClick'),
        ' property both producing ',
        inlineCode('OnClick'),
        ') throw immediately so you catch them before they ship.',
      ),
      tableOfContentsEntryToHeader(whenToReachHeader),
      para(
        'CustomElement is the right primitive when the foreign DOM speaks the three regular web-component surfaces: typed JS properties, observed attributes, and dispatched ',
        inlineCode('CustomEvent'),
        's. Everything you push to the element is a property; everything you read back is an event. The element owns its rendering and its internal state, and Foldkit sees the same surface a vanilla JS or React consumer would.',
      ),
      para(
        link(coreMountRouter(), 'Mount'),
        ' stays the right primitive for foreign DOM that does not speak properties, attributes, and events. A code editor that exposes an imperative ',
        inlineCode('setValue(text)'),
        ' method, a map renderer that wants its own ',
        inlineCode('HTMLElement'),
        ' to render into, an audio worklet that hands back a node, all of those need direct access to the live element. ',
        inlineCode('OnMount'),
        ' is the seam for that. Web components do speak attributes and properties and events, so ',
        inlineCode('CustomElement.define'),
        ' is the higher-level fit when those surfaces are available.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'web-components' }),
          'Web Components example',
        ),
        ' pairs two real third-party elements: ',
        inlineCode('<hex-color-picker>'),
        ' from ',
        inlineCode('vanilla-colorful'),
        ' emits color-changed CustomEvents that flow back as Messages, and ',
        inlineCode('<sl-qr-code>'),
        ' from ',
        inlineCode('@shoelace-style/shoelace'),
        ' accepts typed properties that the runtime diffs through ',
        inlineCode('propsModule'),
        '. The picker and the QR code never touch each other directly; they share state through the Model.',
      ),
    ],
  )
}
