import { Array, Option, Predicate, Schema, SchemaAST } from 'effect'

import { directFieldRelationshipOf } from './directConnection.js'
import {
  type KeyedFieldRelationshipStorage,
  isInstanceKeySchema,
  keyedFieldRelationshipOf,
} from './keyedFieldConnection.js'
import { keyedMapFieldRelationshipOf } from './keyedMapFieldConnection.js'

/** @internal The storage relationship selected by an explicit Binding helper. */
export type BindingRelationshipKind =
  | 'Required'
  | 'Optional'
  | 'OptionalKeyed'
  | 'KeyedArray'
  | 'Record'
  | 'HashMap'
  | 'Custom'
  | 'CustomKeyed'

const methodOf = (kind: BindingRelationshipKind): string => {
  if (kind === 'Required' || kind === 'Optional') {
    return `make${kind}FieldBinding`
  }
  if (kind === 'OptionalKeyed') {
    return 'makeOptionalKeyedFieldBinding'
  }

  return `make${kind}Binding`
}

const fail = (kind: BindingRelationshipKind, detail: string): never => {
  throw new Error(`[foldkit] ${methodOf(kind)} ${detail}`)
}

const configOf = (kind: BindingRelationshipKind, config: unknown): object => {
  if (Predicate.isObject(config) && !globalThis.Array.isArray(config)) {
    return config
  }

  return fail(kind, 'requires a configuration object.')
}

const assertAbsent = (
  kind: BindingRelationshipKind,
  config: object,
  fields: ReadonlyArray<string>,
): void => {
  const field = Array.findFirst(fields, candidate =>
    Object.hasOwn(config, candidate),
  )
  if (Option.isSome(field)) {
    fail(kind, `does not support the ${field.value} configuration field.`)
  }
}

const fieldOf = (kind: BindingRelationshipKind, config: object): string => {
  const field = Reflect.get(config, 'field')
  if (Predicate.isString(field)) {
    return field
  }

  return fail(kind, 'must select a declared parent Struct Model field.')
}

const isOptionalField = (fieldSchema: unknown): boolean =>
  Schema.isSchema(fieldSchema) && SchemaAST.isOptional(fieldSchema.ast)

const assertKey = (
  kind: 'KeyedArray' | 'OptionalKeyed',
  config: object,
  storage: KeyedFieldRelationshipStorage,
): void => {
  const key = ((): string => {
    const candidate = Reflect.get(config, 'key')
    if (Predicate.isString(candidate)) {
      return candidate
    }

    return fail(kind, 'must select a declared required key field.')
  })()
  const keyFields = ((): object => {
    const candidate = storage.keyFields
    if (Predicate.isObject(candidate)) {
      return candidate
    }

    return fail(kind, 'must select a declared required key field.')
  })()
  if (!Object.hasOwn(keyFields, key)) {
    fail(kind, 'must select a declared required key field.')
  }

  if (storage.childField !== undefined && storage.childField === key) {
    fail(kind, 'requires distinct key and childField fields.')
  }

  const keySchema = Reflect.get(keyFields, key)
  if (isOptionalField(keySchema)) {
    fail(kind, 'requires a required key field.')
  }
  if (!isInstanceKeySchema(keySchema)) {
    fail(kind, 'requires a key Schema that decodes to a string or number.')
  }
}

const assertDirect = (
  kind: 'Optional' | 'Required',
  parentModel: unknown,
  childModel: unknown,
  config: object,
): void => {
  assertAbsent(kind, config, [
    'childField',
    'key',
    'keySchema',
    'read',
    'readAll',
    'write',
    'writeAt',
  ])

  const field = fieldOf(kind, config)
  const relationship = directFieldRelationshipOf(parentModel, childModel, field)
  if (relationship !== kind) {
    fail(
      kind,
      kind === 'Required'
        ? 'requires a required field with exactly the child Model decoded shape.'
        : 'requires a required field storing Schema.Option of exactly the child Model decoded shape.',
    )
  }
}

const assertKeyedField = (
  kind: 'KeyedArray' | 'OptionalKeyed',
  parentModel: unknown,
  childModel: unknown,
  config: object,
): void => {
  assertAbsent(kind, config, [
    'keySchema',
    'activeWhen',
    'read',
    'readAll',
    'write',
    'writeAt',
  ])
  if (kind === 'OptionalKeyed' && Object.hasOwn(config, 'init')) {
    fail(
      kind,
      'cannot use init because the parent owns the optional occurrence presence.',
    )
  }

  const field = fieldOf(kind, config)
  const hasChildField = Object.hasOwn(config, 'childField')
  const childField = Reflect.get(config, 'childField')
  if (kind === 'OptionalKeyed' && !Predicate.isString(childField)) {
    fail(kind, 'requires a declared childField on its optional Struct wrapper.')
  }
  if (hasChildField && !Predicate.isString(childField)) {
    fail(kind, 'requires childField to name a declared Struct wrapper field.')
  }

  const storage: KeyedFieldRelationshipStorage = (() => {
    try {
      return keyedFieldRelationshipOf(
        parentModel,
        childModel,
        field,
        hasChildField ? childField : undefined,
      )
    } catch (cause) {
      return fail(
        kind,
        `does not match its declared storage relationship. ${cause instanceof Error ? cause.message : globalThis.String(cause)}`,
      )
    }
  })()

  const expectedStorage = kind === 'OptionalKeyed' ? 'Option' : 'Array'
  if (storage.kind !== expectedStorage) {
    fail(
      kind,
      `requires ${expectedStorage === 'Option' ? 'Schema.Option wrapper' : 'Schema.Array'} storage.`,
    )
  }

  assertKey(kind, config, storage)
}

const assertKeyedMap = (
  kind: 'HashMap' | 'Record',
  parentModel: unknown,
  childModel: unknown,
  config: object,
): void => {
  assertAbsent(kind, config, [
    'init',
    'key',
    'keySchema',
    'activeWhen',
    'read',
    'readAll',
    'write',
    'writeAt',
  ])

  const field = fieldOf(kind, config)
  const hasChildField = Object.hasOwn(config, 'childField')
  const childField = Reflect.get(config, 'childField')
  if (hasChildField && !Predicate.isString(childField)) {
    fail(kind, 'requires childField to name a declared Struct map value field.')
  }

  try {
    const storage = keyedMapFieldRelationshipOf(
      parentModel,
      childModel,
      field,
      hasChildField ? childField : undefined,
    )
    if (storage.kind !== kind) {
      fail(kind, `requires a required Schema.${kind} parent field.`)
    }
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message.startsWith(`[foldkit] ${methodOf(kind)}`)
    ) {
      throw cause
    }

    fail(
      kind,
      `does not match its declared storage relationship. ${cause instanceof Error ? cause.message : globalThis.String(cause)}`,
    )
  }
}

const assertCustom = (kind: 'Custom' | 'CustomKeyed', config: object): void => {
  if (kind === 'Custom') {
    assertAbsent(kind, config, [
      'childField',
      'field',
      'key',
      'keySchema',
      'activeWhen',
      'readAll',
      'writeAt',
    ])
    if (
      !Predicate.isFunction(Reflect.get(config, 'read')) ||
      !Predicate.isFunction(Reflect.get(config, 'write'))
    ) {
      fail(kind, 'requires read and write functions.')
    }

    return
  }

  assertAbsent(kind, config, [
    'childField',
    'field',
    'init',
    'activeWhen',
    'write',
  ])
  for (const field of ['readAll', 'key', 'read', 'writeAt']) {
    if (!Predicate.isFunction(Reflect.get(config, field))) {
      fail(kind, `requires a ${field} function.`)
    }
  }

  const keySchema = Reflect.get(config, 'keySchema')
  if (keySchema !== undefined && !isInstanceKeySchema(keySchema)) {
    fail(
      kind,
      'requires keySchema to decode to a string or finite number occurrence key.',
    )
  }
}

/** @internal Passively validates that one explicit Binding helper's config and
 * declared Schemas describe the selected storage relationship. */
export const assertBindingRelationship = (
  kind: BindingRelationshipKind,
  parentModel: unknown,
  childModel: unknown,
  input: unknown,
): void => {
  const config = configOf(kind, input)

  if (kind === 'Required' || kind === 'Optional') {
    assertDirect(kind, parentModel, childModel, config)
  } else if (kind === 'KeyedArray' || kind === 'OptionalKeyed') {
    assertKeyedField(kind, parentModel, childModel, config)
  } else if (kind === 'Record' || kind === 'HashMap') {
    assertKeyedMap(kind, parentModel, childModel, config)
  } else {
    assertCustom(kind, config)
  }
}
