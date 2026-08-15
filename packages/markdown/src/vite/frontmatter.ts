import { Array, Option, String as String_, pipe } from 'effect'
import type { Position } from 'unist'

import type { FieldsSchema } from './validateFields.js'
import { validateFields } from './validateFields.js'

// FRONTMATTER

/**
 * Schema for a document's frontmatter: a struct that validates the flat string
 * fields at build time. Values stay the raw strings the block declares; where
 * an app needs typed values, decode the exported `frontmatter` object with the
 * same schema at runtime.
 */
export type FrontmatterDefinition = FieldsSchema

const FRONTMATTER_ENTRY_PATTERN = /^([A-Za-z][A-Za-z0-9_-]*):(.*)$/

const sourceLocation = (
  maybePosition: Position | undefined,
  lineOffset: number,
): string => {
  const startLine = maybePosition?.start.line
  if (startLine === undefined) {
    return ''
  } else {
    return ` (line ${startLine + lineOffset})`
  }
}

const isWrappedIn = (value: string, quote: string): boolean =>
  value.length >= 2 && value.startsWith(quote) && value.endsWith(quote)

const unquote = (value: string): string =>
  isWrappedIn(value, '"') || isWrappedIn(value, "'")
    ? value.slice(1, -1)
    : value

/**
 * A frontmatter block's parsed string fields, alongside each field's line
 * offset within the block so validation errors can point at the offending
 * line rather than the opening fence.
 */
export type ParsedFrontmatterFields = Readonly<{
  fields: Readonly<Record<string, string>>
  fieldLineOffsets: ReadonlyMap<string, number>
}>

/**
 * Parses a frontmatter block's raw text into its string fields. The supported
 * shape is deliberately flat: one `key: value` pair per line, every value a
 * string, with optional surrounding quotes for values that contain special
 * characters. Nesting, lists, and multi-line values all fail with guidance.
 */
export const parseFrontmatterFields = (
  value: string,
  maybePosition: Position | undefined,
): ParsedFrontmatterFields => {
  // NOTE: collected in a Map so field names inherited from Object.prototype
  // (`toString`, `constructor`) neither trip the duplicate check nor land
  // anywhere but an own property of the returned record.
  const fieldValues = new Map<string, string>()
  const fieldLineOffsets = new Map<string, number>()

  const entryLines = pipe(
    String_.split(value, '\n'),
    Array.map((line, lineIndex) => ({ line, lineIndex })),
    Array.filter(({ line }) => String_.isNonEmpty(line.trim())),
  )

  for (const { line, lineIndex } of entryLines) {
    const location = sourceLocation(maybePosition, lineIndex + 1)
    const [fieldName, rawFieldValue] = Option.match(
      String_.match(FRONTMATTER_ENTRY_PATTERN)(line),
      {
        onNone: (): readonly [string, string] => {
          throw new Error(
            `Invalid frontmatter entry${location}. ` +
              'Frontmatter supports flat `key: value` pairs of strings only. ' +
              'Nesting, lists, and multi-line values are not supported.',
          )
        },
        onSome: ([, name = '', fieldValue = '']): readonly [string, string] => [
          name,
          fieldValue,
        ],
      },
    )
    if (fieldValues.has(fieldName)) {
      throw new Error(`Duplicate frontmatter field "${fieldName}"${location}.`)
    }
    fieldValues.set(fieldName, unquote(rawFieldValue.trim()))
    fieldLineOffsets.set(fieldName, lineIndex + 1)
  }

  return { fields: Object.fromEntries(fieldValues), fieldLineOffsets }
}

/**
 * Validates parsed frontmatter fields against the plugin's frontmatter schema.
 * Unknown fields and values outside the schema both fail with an error naming
 * the offender and its line, mirroring how island attributes are validated.
 */
export const validateFrontmatterFields = (
  definition: FrontmatterDefinition,
  parsed: ParsedFrontmatterFields,
  maybePosition: Position | undefined,
): void => {
  const fieldLocation = (fieldName: string): string =>
    Option.match(Option.fromNullishOr(parsed.fieldLineOffsets.get(fieldName)), {
      onNone: () => sourceLocation(maybePosition, 0),
      onSome: lineOffset => sourceLocation(maybePosition, lineOffset),
    })

  validateFields({
    schema: definition,
    values: parsed.fields,
    memberNounPlural: 'fields',
    unknownField: (fieldName, allowedDescription) =>
      `Unknown frontmatter field "${fieldName}"${fieldLocation(fieldName)}. ` +
      allowedDescription,
    invalidValues: (detail, maybeFieldName) =>
      `Invalid frontmatter${Option.match(maybeFieldName, {
        onNone: () => sourceLocation(maybePosition, 0),
        onSome: fieldLocation,
      })}. ${detail}`,
  })
}
