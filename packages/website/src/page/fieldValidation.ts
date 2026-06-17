import { Html, html } from 'foldkit/html'

import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { apiModuleRouter, exampleDetailRouter } from '../route'
import * as Snippet from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const plainCode = (text: string): Html => {
  const h = html<Message>()

  return h.code([h.Class('text-sm')], [text])
}

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

const rulesFromSchemaHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'rules-from-a-schema',
  text: 'Rules from a Schema',
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
  rulesFromSchemaHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
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
        inlineCode('Field(valueSchema)'),
        ' builds the four-state Schema you put in your Model.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationMakeRulesHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationMakeRulesRaw,
        'Copy makeRules example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The four states: ',
        inlineCode('NotValidated'),
        ' for fields the user hasn’t interacted with yet, ',
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
        'The Schema you pass ',
        inlineCode('Field'),
        ' should match what the control actually holds as the user edits, not the type you parse it into: ',
        inlineCode('Field(S.String)'),
        ' for text inputs, ',
        inlineCode('Field(S.Array(S.String))'),
        ' for a multi-select. A scalar like a checkbox’s boolean usually stays plain ',
        inlineCode('S.Boolean'),
        ' in the Model; wrap it in ',
        inlineCode('Field'),
        ' only when it needs the validation lifecycle. Values you reach by parsing text, like numbers and dates, stay ',
        inlineCode('Field(S.String)'),
        ': a half-typed entry is still a string, so parse it into its domain type on submit. Validation rules stay separate, in the ',
        inlineCode('Rules'),
        ' bundle.',
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationConditionalHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationConditionalRaw,
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationApplyHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationApplyRaw,
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
        'Match exhaustively on the four tags to derive border colors, status indicators, and error messages. For a single field, use ',
        inlineCode('isValid(rules)(state)'),
        '. If the rules are required, only ',
        inlineCode('Valid'),
        ' passes; if optional, ',
        inlineCode('NotValidated'),
        ' also passes. For form-level submit gates, pass ',
        inlineCode('[state, rules]'),
        ' pairs to ',
        inlineCode('allValid'),
        '. A single call gates fields of one value type, so a form that mixes types calls ',
        inlineCode('allValid'),
        ' per type and combines the results with ',
        inlineCode('&&'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationViewHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationViewRaw,
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
        'For server-side checks like “Is this email taken?”, use the ',
        inlineCode('Validating'),
        ' state as a bridge: run sync ',
        inlineCode('validate'),
        ' first, then transition to ',
        inlineCode('Validating'),
        ', fire a Command, and handle the result message.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationAsyncHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationAsyncRaw,
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationCustomRuleHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationCustomRuleRaw,
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
        ' only sees a single value. For checks that compare fields against each other (like “confirm password must match password”), handle the logic directly in your update function where you have access to the full model.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationCrossFieldHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationCrossFieldRaw,
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
        'Required-ness is not a rule. It’s a ',
        inlineCode('makeRules'),
        ' option: pass ',
        inlineCode('required: message'),
        ' to make the field required, omit it for an optional field. It treats an empty string or empty array as missing; any other value, including a boolean ',
        inlineCode('false'),
        ', counts as present, so to require that a checkbox is checked, use a custom rule like ',
        inlineCode('[(checked) => checked, message]'),
        '.',
      ),
      comparisonTable(
        ['Rule', 'Description'],
        [
          [
            [plainCode('Rule.minLength(min, message?)')],
            ['Minimum character count'],
          ],
          [
            [plainCode('Rule.maxLength(max, message?)')],
            ['Maximum character count'],
          ],
          [
            [plainCode('Rule.pattern(regex, message?)')],
            ['Matches a regular expression'],
          ],
          [[plainCode('Rule.email(message?)')], ['Valid email format']],
          [[plainCode('Rule.url(options?)')], ['Valid URL format']],
          [
            [plainCode('Rule.startsWith(prefix, message?)')],
            ['Begins with a prefix'],
          ],
          [
            [plainCode('Rule.endsWith(suffix, message?)')],
            ['Ends with a suffix'],
          ],
          [
            [plainCode('Rule.includes(substring, message?)')],
            ['Contains a substring'],
          ],
          [
            [plainCode('Rule.equals(expected, message?)')],
            ['Exact string match'],
          ],
          [
            [plainCode('Rule.oneOf(values, message?)')],
            ['Value is in a set of allowed strings'],
          ],
        ],
      ),
      para(
        'For array-valued fields like a multi-select, validate with ',
        inlineCode('Rule.minItems(min, message?)'),
        ' and ',
        inlineCode('Rule.maxItems(max, message?)'),
        '. A required array field already treats the empty array as missing, so reach for these when you need a specific count.',
      ),

      tableOfContentsEntryToHeader(rulesFromSchemaHeader),
      para(
        'When a value is already modeled by a Schema, a domain codec, or a refined or branded type, ',
        inlineCode('Rule.fromSchema(schema, message)'),
        ' turns it into a rule, so the field stays in sync with that Schema instead of duplicating its checks. It does nothing a custom rule can’t, so reach for it only when you already maintain the Schema; for plain checks the dedicated rules above are clearer.',
      ),
      para(
        'Its sweet spot is values where “valid” means “decodes”. The Schema can transform a string into a different type, like a ',
        inlineCode('Calendar.CalendarDateFromIsoString'),
        ' codec that parses a date the string-shaped rules can’t check, or refine and brand it, like a ',
        inlineCode('Slug'),
        '. Either way the field reuses the one Schema as its rule, so the check can’t drift from the type you already maintain:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.fieldValidationSchemaHighlighted),
          ],
          [],
        ),
        Snippet.fieldValidationSchemaRaw,
        'Copy schema rule example to clipboard',
        copiedSnippets,
        'mb-8',
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
}
