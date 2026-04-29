import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, ul } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

const familiarityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'familiarity-is-not-readability',
  text: 'Familiarity is not readability',
}

const dslInThirtySecondsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-dsl-in-thirty-seconds',
  text: 'The DSL in thirty seconds',
}

const sideBySideHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'side-by-side',
  text: 'Side by side',
}

const buttonHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'a-button-with-an-event',
  text: 'A button with an event',
}

const inputHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'an-input',
  text: 'An input',
}

const conditionalHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'conditional-rendering',
  text: 'Conditional rendering',
}

const onlyTheDslHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-only-the-dsl-can-express',
  text: 'What only the DSL can express',
}

const noCompileHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'why-we-do-not-compile',
  text: 'Why we do not compile',
}

const tradeoffsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-tradeoffs-we-accept',
  text: 'The tradeoffs we accept',
}

const aViewIsDataHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'a-view-is-data',
  text: 'A view is data',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  familiarityHeader,
  dslInThirtySecondsHeader,
  sideBySideHeader,
  buttonHeader,
  inputHeader,
  conditionalHeader,
  onlyTheDslHeader,
  noCompileHeader,
  tradeoffsHeader,
  aViewIsDataHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('why-no-jsx', 'Why no JSX?'),
      para(
        'Foldkit is plain TypeScript. There is no JSX, no transform, no compiler step. The view is built with a typed function-call DSL. A very common question from developers used to JSX is why doesn’t Foldkit use JSX. This page is the answer.',
      ),
      tableOfContentsEntryToHeader(familiarityHeader),
      para(
        'When a developer says JSX is easier to read, they usually mean they read it faster. That measurement is real. After years of working in JSX, an angle bracket lights up neurons that a function call does not. That is recognition speed. It belongs to the reader, not to the syntax.',
      ),
      para(
        'Readability is a property of the code: how completely it communicates what it does, what it accepts, and what it can produce. A typed function call wins that comparison. Every attribute is a known constructor. Every event handler returns a known Message type. Children are an array, not an opaque variadic that silently accepts numbers, booleans, and undefined.',
      ),
      para(
        'We accept the familiarity argument as a complaint about ramp-up. We do not accept it as an argument about the syntax itself. A week into the DSL, the gap closes. Reading a Foldkit view feels exactly the same as reading a JSX one.',
      ),
      tableOfContentsEntryToHeader(dslInThirtySecondsHeader),
      para(
        'Tag functions return ',
        inlineCode('Html'),
        '. Attributes are typed values. Children are an array. Events are payload-extracting helpers that produce Messages. The ',
        inlineCode('html()'),
        " factory is parameterized by your app's ",
        inlineCode('Message'),
        ' type, so every event handler in the resulting tree is constrained to produce a Message that belongs to that union. The compiler enforces it.',
      ),
      tableOfContentsEntryToHeader(sideBySideHeader),
      tableOfContentsEntryToHeader(buttonHeader),
      para('A button with a click handler in JSX:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonJsxButtonHighlighted),
          ],
          [],
        ),
        Snippets.comparisonJsxButtonRaw,
        'Copy JSX button',
        copiedSnippets,
        'mb-4',
      ),
      para('The same button in the Foldkit DSL:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonDslButtonHighlighted),
          ],
          [],
        ),
        Snippets.comparisonDslButtonRaw,
        'Copy DSL button',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'The JSX version is shorter. We are not pretending otherwise. What the DSL adds is a typed Message constructor. ',
        inlineCode('OnClick'),
        ' does not take a function. It takes a value of the Message type. That value flows through the entire app, gets logged in DevTools, replays in tests, and lands in ',
        inlineCode('update'),
        '. JSX reaches into closures. The DSL hands you a fact.',
      ),
      tableOfContentsEntryToHeader(inputHeader),
      para('An email input in JSX:'),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.comparisonJsxInputHighlighted)],
          [],
        ),
        Snippets.comparisonJsxInputRaw,
        'Copy JSX input',
        copiedSnippets,
        'mb-4',
      ),
      para('The same input in the DSL:'),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.comparisonDslInputHighlighted)],
          [],
        ),
        Snippets.comparisonDslInputRaw,
        'Copy DSL input',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'In JSX you write ',
        inlineCode('(e) => onChange(e.target.value)'),
        '. The handler signature leaks the SyntheticEvent shape into your code. In the DSL, ',
        inlineCode('OnInput(value => ...)'),
        ' extracts the value for you. The handler only cares about the data you actually want.',
      ),
      para(
        'The DSL has dozens of these typed extractors. ',
        inlineCode('OnPointerDown'),
        ' hands you ',
        inlineCode('pointerType, button, screenX, screenY, clientX, clientY'),
        '. ',
        inlineCode('OnFileChange'),
        ' hands you a list of files with metadata. ',
        inlineCode('OnKeyDown'),
        ' hands you the key and a typed modifier set. The set is closed. For everything an extractor exposes, you never have to know the shape of a DOM event.',
      ),
      tableOfContentsEntryToHeader(conditionalHeader),
      para('Four-way dispatch in JSX:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonJsxConditionalHighlighted),
          ],
          [],
        ),
        Snippets.comparisonJsxConditionalRaw,
        'Copy JSX conditional',
        copiedSnippets,
        'mb-4',
      ),
      para('The same dispatch in the DSL:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonDslConditionalHighlighted),
          ],
          [],
        ),
        Snippets.comparisonDslConditionalRaw,
        'Copy DSL conditional',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'JSX has no native answer to four-way dispatch. It expects expressions, so you reach for ternaries, ',
        inlineCode('&&'),
        ', or you extract the whole tree into a helper. The DSL uses ',
        inlineCode('Match.tagsExhaustive'),
        ', the same pattern used in ',
        inlineCode('update'),
        ' and everywhere else in a Foldkit app. The compiler enforces that you handle every variant. Add a fifth status next year and the build fails until you handle it.',
      ),
      tableOfContentsEntryToHeader(onlyTheDslHeader),
      para(
        'There are four guarantees the DSL provides that JSX, by virtue of how its type system models elements, cannot.',
      ),
      ul(
        [Class('list-disc ml-6 mb-6 space-y-2')],
        [
          li(
            [],
            [
              'Per-element attribute typing. ',
              inlineCode('<input maxlength="100" />'),
              ' looks fine and is silently a no-op in React because the prop name is wrong. The DSL only spells it ',
              inlineCode('MaxLength(100)'),
              '.',
            ],
          ),
          li(
            [],
            [
              'Typed event payloads. ',
              inlineCode('OnInput(value => ...)'),
              ' is shaped specifically for input events. There is no ',
              inlineCode('e.target.value'),
              ' to remember.',
            ],
          ),
          li(
            [],
            [
              'No string-children footguns. Children must be ',
              inlineCode('Html | string'),
              '. Booleans, numbers, and ',
              inlineCode('undefined'),
              ' cannot slip through and render as text. JSX accepts all four because its children type is ',
              inlineCode('ReactNode'),
              '.',
            ],
          ),
          li(
            [],
            [
              'Compile-time Message threading. ',
              inlineCode('html<Message>()'),
              ' parameterizes every event helper in the tree. If you accidentally dispatch a Message that does not belong to this view, the compiler catches it.',
            ],
          ),
        ],
      ),
      para(
        'These are not limitations of React. They are limitations of JSX as a syntactic surface. JSX is a transform from HTML-ish syntax to function calls, and the function calls have to accept anything HTML-ish accepts. That ceiling is fixed.',
      ),
      tableOfContentsEntryToHeader(noCompileHeader),
      para(
        'Foldkit is a plain TypeScript library. There is no Vite plugin, no compiler hook, no JSX transform target. You install it, you import functions, you build your app.',
      ),
      para(
        'A custom JSX transform is technically possible. Mithril, Inferno, and Solid all do it. We chose not to because adopting JSX would be a strict downgrade in expressiveness.',
      ),
      ul(
        [Class('list-disc ml-6 mb-6 space-y-2')],
        [
          li(
            [],
            [
              'JSX cannot represent per-tag attribute unions. Every JSX-using framework ends up with a single ',
              inlineCode('Props'),
              " type per element where most props are optional, because that is what JSX's element type model can express. The DSL constrains each attribute precisely.",
            ],
          ),
          li(
            [],
            [
              'JSX cannot represent typed event payloads. ',
              inlineCode('onChange={(e) => ...}'),
              " is the contract. The DSL's curried payload extractors do not fit JSX's props-are-an-object model.",
            ],
          ),
          li(
            [],
            [
              'JSX implies a transform-time tree, which means tooling has to understand JSX to understand your view. The DSL is plain function calls. Refactoring tools, search, AI assistants, and code review all see exactly what runs.',
            ],
          ),
        ],
      ),
      para(
        'We do not promise that we will never support JSX. We do promise that if we ever did, it would be a strictly weaker view.',
      ),
      tableOfContentsEntryToHeader(tradeoffsHeader),
      para('Honest tradeoffs we accept by not using JSX:'),
      ul(
        [Class('list-disc ml-6 mb-6 space-y-2')],
        [
          li(
            [],
            [
              'More characters for trivial elements. ',
              inlineCode("div([Class('foo')], ['hello'])"),
              ' is longer than ',
              inlineCode('<div className="foo">hello</div>'),
              '.',
            ],
          ),
          li(
            [],
            [
              'No spread attributes. There is no ',
              inlineCode('{...attrs}'),
              '. You write ',
              inlineCode('[...attrs, MoreAttr(...)]'),
              ', which is a normal array spread but not a syntactic special.',
            ],
          ),
          li(
            [],
            [
              'Explicit array braces around children. There is no ',
              inlineCode('<>...</>'),
              ' fragment. A list of children is just an array.',
            ],
          ),
          li(
            [],
            [
              'One new module to learn. The attribute and event helpers are PascalCase factories: ',
              inlineCode('Class'),
              ', ',
              inlineCode('OnClick'),
              ', ',
              inlineCode('Disabled'),
              '. After a day of writing views, your hands know them.',
            ],
          ),
        ],
      ),
      para('That is the list. We do not think it is a long one.'),
      tableOfContentsEntryToHeader(aViewIsDataHeader),
      para(
        'Read the DSL like any other typed function. Within a week, the unfamiliarity dissolves. What is left is a view the compiler checks completely, that DevTools can introspect without a transform, and that hands you typed Messages instead of synthetic events.',
      ),
      para('That is the whole pitch.'),
    ],
  )
