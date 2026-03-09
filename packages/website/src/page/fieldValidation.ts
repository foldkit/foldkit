import { Html } from 'foldkit/html'

import { Class, InnerHTML, code, div } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { apiModuleRouter } from '../route'
import * as Snippets from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const plainCode = (text: string): Html => code([Class('text-sm')], [text])

const creatingFieldHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'creating-a-field',
  text: 'Creating a Field',
}

const definingRulesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'defining-validation-rules',
  text: 'Defining Validation Rules',
}

const applyingValidationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'applying-validation',
  text: 'Applying Validation',
}

const renderingStateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'rendering-validation-state',
  text: 'Rendering Validation State',
}

const asyncValidationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'async-validation',
  text: 'Async Validation',
}

const customValidatorsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'custom-validators',
  text: 'Custom Validators',
}

const crossFieldValidationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'cross-field-validation',
  text: 'Cross-Field Validation',
}

const builtInValidatorsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'built-in-validators',
  text: 'Built-in Validators',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  creatingFieldHeader,
  definingRulesHeader,
  applyingValidationHeader,
  renderingStateHeader,
  asyncValidationHeader,
  customValidatorsHeader,
  crossFieldValidationHeader,
  builtInValidatorsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('field-validation', 'Field Validation'),
      para(
        'Foldkit models field validation as data in your Model, not scattered logic across event handlers. Each field is a four-state discriminated union — ',
        inlineCode('NotValidated'),
        ', ',
        inlineCode('Validating'),
        ', ',
        inlineCode('Valid'),
        ', and ',
        inlineCode('Invalid'),
        ' — making it impossible to render a success indicator while an error exists, or show a spinner when validation is already complete.',
      ),

      tableOfContentsEntryToHeader(creatingFieldHeader),
      para(
        inlineCode('makeField'),
        ' takes a value schema and returns four constructors plus a ',
        inlineCode('Union'),
        ' schema. Use the union as a field type in your Model.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationMakeFieldHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationMakeFieldRaw,
        'Copy makeField example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The four states represent the complete lifecycle of a field: ',
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

      tableOfContentsEntryToHeader(definingRulesHeader),
      para(
        'Validation rules are ',
        inlineCode('[predicate, errorMessage]'),
        ' tuples. Foldkit ships built-in validators for common cases — compose them into an array for each field.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fieldValidationRulesHighlighted),
          ],
          [],
        ),
        Snippets.fieldValidationRulesRaw,
        'Copy validation rules example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Each validator returns a ',
        inlineCode('Validation<T>'),
        ' tuple. The predicate returns ',
        inlineCode('true'),
        ' when the value is valid. The error message can be a static string or a function that receives the invalid value — pass a function when the message needs to include context like ',
        inlineCode('value => `Too long (${value.length}/20)`'),
        '.',
      ),

      tableOfContentsEntryToHeader(applyingValidationHeader),
      para(
        'Call ',
        inlineCode('StringField.validate(rules)'),
        ' to create a validation function, then apply it to a value. It returns either a ',
        inlineCode('Valid'),
        ' or ',
        inlineCode('Invalid'),
        ' schema instance. It fails fast — stopping at the first failing rule. Use it in your update function with ',
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
        'Copy validateField example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Use ',
        inlineCode('validateAll'),
        ' instead when you want to collect every failing rule into the ',
        inlineCode('errors'),
        ' array rather than stopping at the first failure.',
      ),

      tableOfContentsEntryToHeader(renderingStateHeader),
      para(
        'Match exhaustively on the four tags to derive border colors, status indicators, and error messages. Gate form submission on all fields being ',
        inlineCode('Valid'),
        '.',
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
        'Because the field type is a discriminated union, the exhaustive match ensures you handle every state. If you add a new state in the future, the compiler will tell you every view that needs updating.',
      ),

      tableOfContentsEntryToHeader(asyncValidationHeader),
      para(
        'For server-side checks like \u201CIs this email taken?\u201D, use the ',
        inlineCode('Validating'),
        ' state as a bridge: run sync validation first, then transition to ',
        inlineCode('Validating'),
        ', fire a command, and handle the result message.',
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
        ' pattern prevents race conditions. Each keystroke increments the ID, and the result handler only applies if the ID still matches. Stale responses from slow requests are silently discarded.',
      ),
      callout(
        'Sync First',
        'Run sync validation first. Only fire async commands when the sync rules pass. This avoids unnecessary API calls for obviously invalid input.',
      ),

      tableOfContentsEntryToHeader(customValidatorsHeader),
      para(
        'A ',
        inlineCode('Validation<T>'),
        ' is a ',
        inlineCode('[Predicate<T>, ValidationMessage<T>]'),
        ' tuple. Write your own by pairing any predicate with an error message — either a static string or a function that receives the value.',
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
        'Copy custom validator example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Custom validators compose with built-in ones in the same rules array \u2014 there\u2019s no registration step or special interface to implement.',
      ),

      tableOfContentsEntryToHeader(crossFieldValidationHeader),
      para(
        'A ',
        inlineCode('Validation<T>'),
        ' only sees a single value. For checks that compare fields against each other \u2014 like \u201Cconfirm password must match password\u201D \u2014 handle the logic directly in your update function where you have access to the full model.',
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
        'This is the natural place for cross-field logic — the update function already has the model, and constructing ',
        inlineCode('Valid'),
        ' or ',
        inlineCode('Invalid'),
        ' directly is straightforward.',
      ),

      tableOfContentsEntryToHeader(builtInValidatorsHeader),
      para(
        'Foldkit ships validators for strings, numbers, and generic values.',
      ),
      para('String validators:'),
      comparisonTable(
        ['Validator', 'Description'],
        [
          [[plainCode('required(message?)')], ['Non-empty string']],
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
          [[plainCode('url(message?)')], ['Valid URL format']],
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
        ],
      ),
      para('Number validators:'),
      comparisonTable(
        ['Validator', 'Description'],
        [
          [[plainCode('min(num, message?)')], ['Greater than or equal to']],
          [[plainCode('max(num, message?)')], ['Less than or equal to']],
          [
            [plainCode('between(min, max, message?)')],
            ['Within an inclusive range'],
          ],
          [[plainCode('positive(message?)')], ['Greater than zero']],
          [[plainCode('nonNegative(message?)')], ['Zero or greater']],
          [[plainCode('integer(message?)')], ['Whole number']],
        ],
      ),
      para('Generic validators:'),
      comparisonTable(
        ['Validator', 'Description'],
        [
          [
            [plainCode('oneOf(values, message?)')],
            ['Value is in a set of allowed strings'],
          ],
        ],
      ),
      para(
        'Every validator accepts an optional custom error message. When omitted, a sensible default is used.',
      ),
      para(
        'See the full ',
        link(
          apiModuleRouter({ moduleSlug: 'field-validation' }),
          'API reference',
        ),
        ' for details on every export. For a complete working example with sync validation, async server checks, and form submission gating, see the ',
        link(Link.exampleForm, 'Form example'),
        '. For sync-only validation with OutMessage context, see the ',
        link(Link.exampleAuthLogin, 'Auth example'),
        '.',
      ),
    ],
  )
