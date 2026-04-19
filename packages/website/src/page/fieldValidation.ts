import { Html } from 'foldkit/html'

import { Class, InnerHTML, code, div } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { apiModuleRouter, exampleDetailRouter } from '../route'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const plainCode = (text: string): Html => code([Class('text-sm')], [text])

const definingAFieldHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'defining-a-field',
  text: 'Defining a Field',
}

const applyingValidationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'applying-validation',
  text: 'Applying Validation',
}

const displayingStateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'displaying-validation-state',
  text: 'Displaying Validation State',
}

const asyncValidationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'async-validation',
  text: 'Async Validation',
}

const customRulesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'custom-rules',
  text: 'Custom Rules',
}

const crossFieldValidationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'cross-field-validation',
  text: 'Cross-Field Validation',
}

const builtInRulesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'built-in-rules',
  text: 'Built-in Rules',
}

const conditionalRulesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'conditional-rules',
  text: 'Conditional Rules',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  definingAFieldHeader,
  conditionalRulesHeader,
  applyingValidationHeader,
  displayingStateHeader,
  asyncValidationHeader,
  customRulesHeader,
  crossFieldValidationHeader,
  builtInRulesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('field-validation', 'Field Validation'),
      para(
        'Foldkit models field validation as data in your Model, not scattered logic across event handlers. Each field is a four-state discriminated union: ',
        inlineCode('NotValidated'),
        ', ',
        inlineCode('Validating'),
        ', ',
        inlineCode('Valid'),
        ', and ',
        inlineCode('Invalid'),
        '. This makes it impossible to render a success indicator while an error exists, or show a spinner when validation is already complete.',
      ),

      tableOfContentsEntryToHeader(definingAFieldHeader),
      para(
        inlineCode('makeRules'),
        ' takes an options object and returns a ',
        inlineCode('Rules'),
        ' bundle. ',
        inlineCode('Field'),
        ' is the four-state schema you put in your Model.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationMakeRulesHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationMakeRulesRaw,
        'Copy makeRules example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The four states: ',
        inlineCode('NotValidated'),
        ' for fields the user hasn\u2019t interacted with yet, ',
        inlineCode('Validating'),
        ' for async checks in flight, ',
        inlineCode('Valid'),
        ' when all rules pass, and ',
        inlineCode('Invalid'),
        ' when one or more rules fail. Every state carries the current ',
        inlineCode('value'),
        ', and ',
        inlineCode('Invalid'),
        ' additionally carries an ',
        inlineCode('errors'),
        ' array.',
      ),
      para(
        'Each entry in the ',
        inlineCode('rules'),
        ' array is a ',
        inlineCode('Rule'),
        ': a ',
        inlineCode('[predicate, errorMessage]'),
        ' tuple. Error messages can be static strings or functions that receive the invalid value. Foldkit ships built-in rules for common cases; see ',
        link(`#${customRulesHeader.id}`, 'Custom Rules'),
        ' to write your own.',
      ),
      para(
        'Operations are free module functions that take a ',
        inlineCode('Rules'),
        ' bundle as their first argument. ',
        inlineCode('Rules'),
        ' itself has no methods; the sections below introduce each operation.',
      ),
      para(
        'To construct a state directly (e.g. initial Model values, async Command results), use the module-level constructors: ',
        inlineCode('NotValidated'),
        ', ',
        inlineCode('Validating'),
        ', ',
        inlineCode('Valid'),
        ', ',
        inlineCode('Invalid'),
        '.',
      ),

      tableOfContentsEntryToHeader(conditionalRulesHeader),
      para(
        'A ',
        inlineCode('Rules'),
        ' bundle is just data, so build it from model state via a plain function.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationConditionalHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationConditionalRaw,
        'Copy conditional rules example to clipboard',
        copiedSnippets,
        'mb-8',
      ),

      tableOfContentsEntryToHeader(applyingValidationHeader),
      para(
        'Call ',
        inlineCode('validate(rules)(value)'),
        ' to validate a value against a bundle of rules. It returns one of the four ',
        inlineCode('Field'),
        ' variants, failing fast at the first rule that fails. Use it in your update function with ',
        inlineCode('evo'),
        ' to set the field state.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationApplyHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationApplyRaw,
        'Copy validate example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Use ',
        inlineCode('validateAll(rules)'),
        ' when you want to collect every failing rule into the ',
        inlineCode('errors'),
        ' array rather than stopping at the first failure.',
      ),

      tableOfContentsEntryToHeader(displayingStateHeader),
      para(
        'Match exhaustively on the four tags to derive border colors, status indicators, and error messages. For form-level submit gates, use ',
        inlineCode('allValid'),
        ' to fold across every field\u2019s state and rules; for a single field, use ',
        inlineCode('isValid(rules)(state)'),
        '. If the rules are required, only ',
        inlineCode('Valid'),
        ' passes; if optional, ',
        inlineCode('NotValidated'),
        ' also passes.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationViewHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationViewRaw,
        'Copy validation view example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Because ',
        inlineCode('Field'),
        ' is a discriminated union, the exhaustive match ensures you handle every state.',
      ),

      tableOfContentsEntryToHeader(asyncValidationHeader),
      para(
        'For server-side checks like \u201CIs this email taken?\u201D, use the ',
        inlineCode('Validating'),
        ' state as a bridge: run sync ',
        inlineCode('validate'),
        ' first, then transition to ',
        inlineCode('Validating'),
        ', fire a Command, and handle the result message.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationAsyncHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationAsyncRaw,
        'Copy async validation example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The ',
        inlineCode('validationId'),
        ' pattern prevents race conditions. Each keystroke increments the ID, and the result handler only applies if the ID still matches. Responses from superseded requests are silently discarded.',
      ),

      tableOfContentsEntryToHeader(customRulesHeader),
      para(
        'A ',
        inlineCode('Rule'),
        ' is a ',
        inlineCode('[predicate, errorMessage]'),
        ' tuple. Write your own by pairing any predicate with an error message (a static string, or a function that receives the value).',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationCustomRuleHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationCustomRuleRaw,
        'Copy custom rule example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Custom rules compose with built-in ones in the same ',
        inlineCode('rules'),
        ' array.',
      ),

      tableOfContentsEntryToHeader(crossFieldValidationHeader),
      para(
        'A ',
        inlineCode('Rule'),
        ' only sees a single value. For checks that compare fields against each other (like \u201Cconfirm password must match password\u201D), handle the logic directly in your update function where you have access to the full model.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationCrossFieldHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationCrossFieldRaw,
        'Copy cross-field validation example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Keep cross-field logic in update only when the check genuinely needs more than one value. Anything expressible as ',
        inlineCode('[predicate, errorMessage]'),
        ' over a single value fits better as a ',
        link(`#${customRulesHeader.id}`, 'custom rule'),
        '.',
      ),

      tableOfContentsEntryToHeader(builtInRulesHeader),
      para(
        'Required-ness is not a rule. It\u2019s a ',
        inlineCode('makeRules'),
        ' option: pass ',
        inlineCode('required: message'),
        ' to make the field required, omit it for an optional field.',
      ),
      comparisonTable(
        ['Rule', 'Description'],
        [
          [
            [plainCode('minLength(min, message?)')],
            ['Minimum character count'],
          ],
          [
            [plainCode('maxLength(max, message?)')],
            ['Maximum character count'],
          ],
          [
            [plainCode('pattern(regex, message?)')],
            ['Matches a regular expression'],
          ],
          [[plainCode('email(message?)')], ['Valid email format']],
          [[plainCode('url(options?)')], ['Valid URL format']],
          [
            [plainCode('startsWith(prefix, message?)')],
            ['Begins with a prefix'],
          ],
          [[plainCode('endsWith(suffix, message?)')], ['Ends with a suffix']],
          [
            [plainCode('includes(substring, message?)')],
            ['Contains a substring'],
          ],
          [[plainCode('equals(expected, message?)')], ['Exact string match']],
          [
            [plainCode('oneOf(values, message?)')],
            ['Value is in a set of allowed strings'],
          ],
        ],
      ),
      para(
        'See the full ',
        link(
          apiModuleRouter({ moduleSlug: 'field-validation' }),
          'API reference',
        ),
        ' for details on every export. For a complete working example with sync validation, async server checks, and form submission gating, see the ',
        link(exampleDetailRouter({ exampleSlug: 'form' }), 'Form example'),
        '. For sync-only validation with OutMessage context, see the ',
        link(Link.exampleAuthLogin, 'Auth example'),
        '.',
      ),
    ],
  )
