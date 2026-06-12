import { Html, html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { apiModuleRouter, coreViewRouter } from '../route'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'

const familiarityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'recognition-speed-vs-readability',
  text: 'Recognition speed vs readability',
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

const couldFoldkitAddJsxHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'could-foldkit-add-jsx',
  text: 'Could Foldkit add JSX?',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  familiarityHeader,
  dslInThirtySecondsHeader,
  sideBySideHeader,
  buttonHeader,
  inputHeader,
  conditionalHeader,
  couldFoldkitAddJsxHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('why-no-jsx', 'Why no JSX?'),
      para(
        'Foldkit is plain TypeScript. There is no JSX, no transform, no compiler step. The view is built with a typed function-call DSL. Developers coming from JSX often ask why Foldkit doesn’t use it, and whether it could. This is the answer to both.',
      ),
      tableOfContentsEntryToHeader(familiarityHeader),
      para(
        'When a developer says JSX is easier to read, they usually mean they read it faster. That measurement is real. After years of working in JSX, an angle bracket lights up neurons that a function call does not. That is recognition speed. It belongs to the reader, not to the syntax.',
      ),
      para(
        'Readability is a property of the code: how completely it communicates what it does, what it accepts, and what it can produce. A typed function call wins that comparison. Every attribute is a known constructor. Every event handler returns a known Message type. Children are a typed array, not an opaque variadic.',
      ),
      para(
        'Familiarity is real, but it is a complaint about ramp-up, not about the syntax. A week into using the DSL, the recognition gap closes and unfamiliarity stops being the bottleneck.',
      ),
      tableOfContentsEntryToHeader(dslInThirtySecondsHeader),
      para(
        'Each HTML element is a function: ',
        inlineCode('div'),
        ', ',
        inlineCode('button'),
        ', ',
        inlineCode('p'),
        ', ',
        inlineCode('input'),
        '. Each one returns ',
        inlineCode('Html'),
        '. Attributes are passed as an array of typed values, children as an array of ',
        inlineCode('Html | string'),
        '. Event handlers like ',
        inlineCode('OnClick'),
        ' and ',
        inlineCode('OnInput'),
        ' produce typed Messages. The ',
        inlineCode('html()'),
        " factory is parameterized by your app's ",
        inlineCode('Message'),
        ' type, so every handler in the resulting tree is constrained to produce a Message that belongs to that union. The compiler enforces it.',
      ),
      para(
        'For the full tour of how views work, see ',
        link(coreViewRouter(), 'View'),
        '.',
      ),
      tableOfContentsEntryToHeader(sideBySideHeader),
      tableOfContentsEntryToHeader(buttonHeader),
      para('A button with a click handler in JSX:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.comparisonJsxButtonHighlighted),
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.comparisonDslButtonHighlighted),
          ],
          [],
        ),
        Snippets.comparisonDslButtonRaw,
        'Copy DSL button',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'The shapes are different. ',
        inlineCode('OnClick'),
        ' does not take a function. It takes a value of the Message type. That value flows through the entire app, gets logged in DevTools, replays in tests, and lands in ',
        inlineCode('update'),
        '. JSX reaches into closures. The DSL hands you a fact.',
      ),
      tableOfContentsEntryToHeader(inputHeader),
      para('An email input in JSX:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.comparisonJsxInputHighlighted),
          ],
          [],
        ),
        Snippets.comparisonJsxInputRaw,
        'Copy JSX input',
        copiedSnippets,
        'mb-4',
      ),
      para('The same input in the DSL:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.comparisonDslInputHighlighted),
          ],
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
        'The DSL ships ',
        link(
          `${apiModuleRouter({ moduleSlug: 'html' })}#type-Html/Attribute`,
          'typed handlers for the standard HTML event surface',
        ),
        '. ',
        inlineCode('OnPointerDown'),
        ' hands you ',
        inlineCode('pointerType, button, screenX, screenY, clientX, clientY'),
        '. ',
        inlineCode('OnFileChange'),
        ' hands you a list of files with metadata. ',
        inlineCode('OnKeyDown'),
        ' hands you the key and a typed modifier set.',
      ),
      para(
        'The natural follow-up question is: what if I need a field a typed handler does not expose? Today you cannot reach it through the DSL. The set of handlers is closed. In practice this is rarely the limit you hit, because the curated payloads cover the fields you usually want. The places it does bite are specialized: pen pressure on pointer events for drawing apps, ',
        inlineCode('isComposing'),
        ' on input events for IME-aware text editors, multi-touch gesture data, and custom events dispatched by third-party widgets. We plan to add a typed escape hatch the way Elm does, with a decoder that fails safely on missing fields, before v1.0.0 ships. Until then, the set is what it is.',
      ),
      tableOfContentsEntryToHeader(conditionalHeader),
      para('Four-way dispatch in JSX:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.comparisonJsxConditionalHighlighted),
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.comparisonDslConditionalHighlighted),
          ],
          [],
        ),
        Snippets.comparisonDslConditionalRaw,
        'Copy DSL conditional',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'With ',
        inlineCode('Data.TaggedEnum'),
        ' and ',
        inlineCode('Match'),
        ' from effect-ts, JSX gets dispatch parity. Both versions are exhaustive. Both fail to compile if you add a fifth variant without handling it. Without those tools, JSX is back to ternaries, ',
        inlineCode('&&'),
        ', and extracted helper components, with exhaustiveness on you.',
      ),
      para(
        'The remaining difference is structural. JSX is an expression syntax, so the match lives inside ',
        inlineCode('{...}'),
        ' braces inside a wrapping element, and every arm returns a React node. The DSL returns ',
        inlineCode('Html'),
        ' directly into the children array because the tree already is an array of values. No wrapping required. No expression embedding. The dispatch sits at the same level as everything else in the view.',
      ),
      tableOfContentsEntryToHeader(couldFoldkitAddJsxHeader),
      para(
        'JSX is not magic. A bundler compiles ',
        inlineCode('<div class="x">hi</div>'),
        ' into a function call like ',
        inlineCode("jsx('div', { class: 'x', children: 'hi' })"),
        ', and Foldkit could ship a JSX runtime that maps that props bag onto the same element factories the DSL already uses. Views are plain functions that return virtual nodes. No hooks, no reactivity tracking, no compile-time magic. At runtime, JSX support would be a small adapter.',
      ),
      para(
        'The blocker is the type system. Everything above about typed handlers rests on one mechanism: ',
        inlineCode('html<Message>()'),
        ' parameterizes every element factory by your Message union, per view. TypeScript resolves lowercase JSX tags like ',
        inlineCode('<div>'),
        ' through ',
        inlineCode('JSX.IntrinsicElements'),
        ', a single non-generic interface shared by the whole project. There is no way for ',
        inlineCode('<div onClick={...}>'),
        ' to infer a Message type from the view function around it.',
      ),
      para(
        'That leaves three ways to wire it up, and each one gives up something the DSL refuses to give up. Type handlers as ',
        inlineCode('unknown'),
        ', and any Message compiles in any view; the guarantee this page advertises is gone. Declare your app’s Message type into ',
        inlineCode('JSX.IntrinsicElements'),
        ' globally, and the first Submodel breaks it, because a Foldkit codebase routinely has several Message unions live at once and one global type cannot represent that. Or skip lowercase tags entirely and generate capitalized components per view, ',
        inlineCode('const { Div, Button } = jsxElements<Message>()'),
        ', which preserves the typing and throws away the familiarity that was the only reason to want JSX.',
      ),
      para(
        'Even a perfectly typed JSX layer would be a second authoring syntax: a parallel set of docs, examples, and edge cases, with every future view feature needing two mappings. That is a permanent cost paid to soften a ramp-up that closes in a week.',
      ),
      para(
        'So the precise answer is sharper than a style preference. JSX as syntax is feasible. JSX with the DSL’s guarantee, in the lowercase form people actually want, is not. “Every handler in this subtree produces a Message from this view’s union” is not something JSX’s type model can say. Foldkit isn’t avoiding JSX. It expresses a constraint JSX cannot.',
      ),
    ],
  )
}
