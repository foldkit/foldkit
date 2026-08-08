import { Array, Schema as S } from 'effect'

// FIELD VALIDATION

/**
 * A struct schema describing a flat record of string values, the shape shared
 * by island attribute definitions and frontmatter definitions.
 */
export type FieldsSchema = S.Struct<S.Struct.Fields> &
  Readonly<{ DecodingServices: never; EncodingServices: never }>

/**
 * Validates a parsed string record against its schema: names outside the
 * schema and values the schema rejects both fail with an error the caller
 * phrases. One implementation serves island attributes and frontmatter fields,
 * so unknown-name detection and decode-error wrapping cannot drift between the
 * two.
 */
export const validateFields = (
  config: Readonly<{
    schema: FieldsSchema
    values: Readonly<Record<string, string>>
    memberNounPlural: string
    unknownField: (fieldName: string, allowedDescription: string) => string
    invalidValues: (detail: string) => string
  }>,
): void => {
  const allowedFieldNames = Object.keys(config.schema.fields)
  const unknownFieldNames = Object.keys(config.values).filter(
    fieldName => !allowedFieldNames.includes(fieldName),
  )
  if (Array.isArrayNonEmpty(unknownFieldNames)) {
    const allowedDescription = Array.match(allowedFieldNames, {
      onEmpty: () => `It takes no ${config.memberNounPlural}.`,
      onNonEmpty: names =>
        `Allowed ${config.memberNounPlural}: ${names.join(', ')}.`,
    })
    throw new Error(
      config.unknownField(
        Array.headNonEmpty(unknownFieldNames),
        allowedDescription,
      ),
    )
  }

  try {
    S.decodeUnknownSync(config.schema)(config.values)
  } catch (error) {
    throw new Error(
      config.invalidValues(
        error instanceof Error ? error.message : String(error),
      ),
    )
  }
}
