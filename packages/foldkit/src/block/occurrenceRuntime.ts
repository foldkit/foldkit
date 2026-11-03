import { Array, Predicate, Schema } from 'effect'

import type { OperationEnvironment } from '../update/operationRecipe.js'
import { bindingDeclarationOf } from './bindingConnection.js'
import { type RuntimeBinding, runtimeBindingOf } from './composition.js'
import { assertRegisteredInitialization } from './operationGraph.js'

type OccurrenceCreation = Readonly<{
  binding: object
  field: string
  key: string
  args: ReadonlyArray<unknown>
}>

type OccurrenceField = Readonly<{
  field: string
  entries: ReadonlyArray<unknown>
  creations: ReadonlyMap<object, OccurrenceCreation>
  runtime: RuntimeBinding
}>

const creations = new WeakMap<object, OccurrenceCreation>()

const creationOf = (value: unknown): OccurrenceCreation | undefined =>
  Predicate.isObject(value) ? creations.get(value) : undefined

const keyOf = (value: unknown): string => {
  const key = Predicate.isObject(value) ? Reflect.get(value, 'key') : undefined

  if (!Predicate.isString(key)) {
    throw new Error(
      '[foldkit] An occurrence array entry requires a string key.',
    )
  }

  return key
}

/** @internal Creates an inert request for one standard wrapped array occurrence. */
export const makeOccurrenceCreation = (
  originalBinding: object,
  field: string,
  config: unknown,
): object => {
  if (!Predicate.isObject(config) || globalThis.Array.isArray(config)) {
    throw new Error('[foldkit] Binding.create requires a key and args record.')
  }

  for (const name of Reflect.ownKeys(config)) {
    if (name !== 'key' && name !== 'args') {
      throw new Error('[foldkit] Binding.create accepts only key and args.')
    }
  }

  const key = Reflect.get(config, 'key')
  const args = Reflect.get(config, 'args')

  if (!Predicate.isString(key) || !globalThis.Array.isArray(args)) {
    throw new Error(
      '[foldkit] Binding.create requires a string key and an args tuple.',
    )
  }

  const token = Object.freeze({})
  creations.set(
    token,
    Object.freeze({
      binding: originalBinding,
      field,
      key,
      args: Object.freeze([...args]),
    }),
  )

  return token
}

/** @internal Detects authenticated creation requests in top-level array fields only. */
export const hasOccurrenceCreations = (
  model: unknown,
  fields: ReadonlyArray<PropertyKey>,
): boolean => {
  if (!Predicate.isObject(model)) {
    return false
  }

  for (const field of fields) {
    const entries = Reflect.get(model, field)

    if (!globalThis.Array.isArray(entries)) {
      continue
    }

    if (entries.some(entry => creationOf(entry) !== undefined)) {
      return true
    }
  }

  return false
}

const preflightField = (
  field: string,
  entries: ReadonlyArray<unknown>,
  previousModel: unknown,
  environment: OperationEnvironment | undefined,
): OccurrenceField | undefined => {
  const fieldCreations = new Map<object, OccurrenceCreation>()
  const keys = new Set<string>()
  let runtime: RuntimeBinding | undefined
  let original: object | undefined

  for (const entry of entries) {
    const creation = creationOf(entry)

    if (creation === undefined) {
      continue
    }

    if (creation.field !== field) {
      throw new Error(
        '[foldkit] A creation request belongs to another Model field.',
      )
    }

    const actual = environment?.get(creation.binding)

    if (
      actual === undefined ||
      bindingDeclarationOf(actual) !== creation.binding
    ) {
      throw new Error(
        '[foldkit] A creation request requires its original connected Binding.',
      )
    }

    if (original !== undefined && original !== creation.binding) {
      throw new Error(
        '[foldkit] An occurrence field cannot contain requests from different Bindings.',
      )
    }

    assertRegisteredInitialization(actual, field)
    original = creation.binding
    runtime = runtimeBindingOf(actual)
    if (Predicate.isObject(entry)) {
      fieldCreations.set(entry, creation)
    }
  }

  if (runtime === undefined) {
    return undefined
  }

  const childModel = runtime.block.Model

  if (!Schema.isSchema(childModel) || runtime.parentContract === undefined) {
    throw new Error(
      '[foldkit] Occurrence creation requires registered child and parent Model Schemas.',
    )
  }

  const isChildModel = Schema.is(childModel)
  const previousEntries = Predicate.isObject(previousModel)
    ? Reflect.get(previousModel, field)
    : undefined
  const previousKeys = new Set<string>()

  if (globalThis.Array.isArray(previousEntries)) {
    for (const entry of previousEntries) {
      previousKeys.add(keyOf(entry))
    }
  }

  for (const entry of entries) {
    const creation = creationOf(entry)
    const key = creation?.key ?? keyOf(entry)

    if (keys.has(key)) {
      throw new Error(
        '[foldkit] An occurrence array cannot contain duplicate keys.',
      )
    }

    keys.add(key)

    if (creation !== undefined) {
      if (previousKeys.has(key)) {
        throw new Error(
          '[foldkit] Binding.create cannot replace an existing occurrence key.',
        )
      }
    } else if (
      !Predicate.isObject(entry) ||
      !isChildModel(Reflect.get(entry, 'model'))
    ) {
      throw new Error(
        '[foldkit] An occurrence array requires ready child Models or original creation requests.',
      )
    }
  }

  return { field, entries, creations: fieldCreations, runtime }
}

/** @internal Resolves authenticated array requests in the currently active acquired graph. */
export const resolveOccurrenceFields = (
  candidateModel: unknown,
  previousModel: unknown,
  environment: OperationEnvironment | undefined,
  instanceFields: ReadonlyArray<PropertyKey>,
): Readonly<{ model: unknown; commands?: ReadonlyArray<unknown> }> => {
  if (!Predicate.isObject(candidateModel)) {
    throw new Error(
      '[foldkit] Occurrence creation requires a parent Model record.',
    )
  }

  const snapshot = { ...candidateModel }
  const fields: Array<OccurrenceField> = []

  for (const field of instanceFields) {
    if (!Predicate.isString(field)) {
      continue
    }
    const entries = Reflect.get(snapshot, field)

    if (!globalThis.Array.isArray(entries)) {
      continue
    }

    const occurrenceField = preflightField(
      field,
      entries,
      previousModel,
      environment,
    )

    if (occurrenceField !== undefined) {
      fields.push(occurrenceField)
    }
  }

  const pendingFields = new Set(fields.map(({ field }) => field))

  for (const { runtime } of fields) {
    const parentSchema = runtime.parentContract?.Model
    const parentFields = Schema.isSchema(parentSchema)
      ? Reflect.get(parentSchema, 'fields')
      : undefined

    if (!Predicate.isObject(parentFields)) {
      continue
    }

    for (const field of Object.keys(parentFields)) {
      const fieldSchema = Reflect.get(parentFields, field)

      if (
        !pendingFields.has(field) &&
        Schema.isSchema(fieldSchema) &&
        !Schema.is(fieldSchema)(Reflect.get(snapshot, field))
      ) {
        throw new Error(
          '[foldkit] Occurrence creation requires valid unchanged parent Model fields.',
        )
      }
    }
  }

  const commands: Array<unknown> = []

  for (const { field, entries, creations: fieldCreations, runtime } of fields) {
    const readyEntries = entries.map(entry => {
      const creation = Predicate.isObject(entry)
        ? fieldCreations.get(entry)
        : undefined

      if (creation === undefined) {
        return entry
      }

      const childInit = runtime.init(creation.key, creation.args)
      commands.push(...(childInit.commands ?? []))

      return { key: creation.key, model: childInit.model }
    })

    Reflect.set(snapshot, field, readyEntries)
  }

  for (const { runtime } of fields) {
    if (
      runtime.isParentModel === undefined ||
      !runtime.isParentModel(snapshot)
    ) {
      throw new Error(
        '[foldkit] Occurrence creation must produce a parent Model accepted by its Schema.',
      )
    }
  }

  const model = Array.isArrayEmpty(fields) ? candidateModel : snapshot

  return Array.isArrayEmpty(commands) ? { model } : { model, commands }
}
