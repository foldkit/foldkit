import { Array, Option, Predicate, Schema } from 'effect'

import { resolveOperationOutput } from '../update/operationRecipe.js'
import { runtimeBindingOf } from './composition.js'
import { isBindingInitRecipe, runBindingInitRecipe } from './initRecipe.js'
import type { InstanceKey } from './instanceContext.js'
import { withOperationGraph } from './operationGraph.js'

type RuntimeReturn = Readonly<{
  model: any
  commands?: ReadonlyArray<any> | undefined
}>

type RuntimeStep = (model: any) => RuntimeReturn

type RuntimeInitializationPlan = Readonly<{
  childInitContext?: unknown
  model: any
  commands?: ReadonlyArray<any> | undefined
  steps?: ReadonlyArray<RuntimeStep> | undefined
}>

type RuntimeBindingValue = Readonly<{
  placement: string
}>

type RuntimeModelSchema = Readonly<{
  make: (input: any) => any
}>

type PreflightedPlan =
  | Readonly<{
      kind: 'Direct'
      binding: RuntimeBindingValue
      initial: Extract<
        NonNullable<ReturnType<typeof runtimeBindingOf>['initial']>,
        Readonly<{ kind: 'Direct' }>
      >
      maybeArguments: Option.Option<ReadonlyArray<unknown>>
    }>
  | Readonly<{
      kind: 'WrappedKeyed'
      binding: RuntimeBindingValue
      initial: Extract<
        NonNullable<ReturnType<typeof runtimeBindingOf>['initial']>,
        Readonly<{ kind: 'WrappedKeyed' }>
      >
      occurrences: ReadonlyArray<
        Readonly<{
          occurrence: unknown
          key: InstanceKey
          args: ReadonlyArray<unknown>
        }>
      >
    }>
  | Readonly<{
      kind: 'Projected'
      binding: RuntimeBindingValue
      initial: Extract<
        NonNullable<ReturnType<typeof runtimeBindingOf>['initial']>,
        Readonly<{ kind: 'Projected' }>
      >
      arguments: ReadonlyArray<unknown>
    }>

type InitializedOccurrence = Readonly<{
  binding: RuntimeBindingValue
  key: InstanceKey | undefined
  field?: string
  model: unknown
  commands: ReadonlyArray<any>
}>

type IndexedSelectedChild = Readonly<{
  count: number
  model: unknown
}>

type WrappedKeyedSelectionIndex = Map<
  InstanceKey | undefined,
  IndexedSelectedChild
>

const indexWrappedKeyedSelection = (
  runtime: ReturnType<typeof runtimeBindingOf>,
  model: unknown,
): WrappedKeyedSelectionIndex => {
  const selectedByKey: WrappedKeyedSelectionIndex = new Map()

  for (const selected of runtime.select(model)) {
    const key = selected.key
    const previous = selectedByKey.get(key)
    selectedByKey.set(key, {
      count: (previous?.count ?? 0) + 1,
      model: previous === undefined ? selected.model : previous.model,
    })
  }

  return selectedByKey
}

const wrappedKeyedSelectionOf = (
  selectionsByBinding: Map<RuntimeBindingValue, WrappedKeyedSelectionIndex>,
  binding: RuntimeBindingValue,
  runtime: ReturnType<typeof runtimeBindingOf>,
  model: unknown,
): WrappedKeyedSelectionIndex => {
  const existing = selectionsByBinding.get(binding)
  if (existing !== undefined) {
    return existing
  }

  const selectedByKey = indexWrappedKeyedSelection(runtime, model)
  selectionsByBinding.set(binding, selectedByKey)
  return selectedByKey
}

const assertCommands = (commands: unknown, source: string): void => {
  if (commands !== undefined && !globalThis.Array.isArray(commands)) {
    throw new Error(
      `[foldkit] ${source} commands must be an array when present.`,
    )
  }
}

const assertInitializationPlan: (
  value: unknown,
) => asserts value is RuntimeInitializationPlan = value => {
  if (!Predicate.isObject(value) || !Object.hasOwn(value, 'model')) {
    throw new Error(
      '[foldkit] Composition.makeInit callback must return an object with a model field.',
    )
  }

  assertCommands(
    Reflect.get(value, 'commands'),
    'Composition.makeInit callback',
  )

  const steps = Reflect.get(value, 'steps')
  if (
    steps !== undefined &&
    (!globalThis.Array.isArray(steps) ||
      globalThis.Array.from(steps).some(step => !Predicate.isFunction(step)))
  ) {
    throw new Error(
      '[foldkit] Composition.makeInit callback steps must be an array of functions when present.',
    )
  }

  if (Object.hasOwn(value, 'outMessage')) {
    throw new Error(
      '[foldkit] Composition.makeInit callback cannot return an OutMessage.',
    )
  }

  for (const field of Object.getOwnPropertyNames(value)) {
    if (
      field !== 'model' &&
      field !== 'commands' &&
      field !== 'steps' &&
      field !== 'childInitContext'
    ) {
      throw new Error(
        `[foldkit] Composition.makeInit callback returned unknown field "${field}". Return model, commands, steps, and childInitContext only.`,
      )
    }
  }
}

const assertStepReturn: (
  value: unknown,
) => asserts value is RuntimeReturn = value => {
  if (!Predicate.isObject(value) || !Object.hasOwn(value, 'model')) {
    throw new Error(
      '[foldkit] Composition.makeInit Step must return an object with a model field.',
    )
  }

  assertCommands(Reflect.get(value, 'commands'), 'Composition.makeInit Step')

  if (Object.hasOwn(value, 'outMessage')) {
    throw new Error(
      '[foldkit] Composition.makeInit Step cannot return an OutMessage.',
    )
  }
}

const duplicateFieldError = (
  field: string,
  firstPlacement: string,
  secondPlacement: string,
): Error =>
  new Error(
    `[foldkit] Child Bindings at placements "${firstPlacement}" and "${secondPlacement}" both initialize field "${field}". Give each initialized child its own Model field.`,
  )

const registerInitialField = (
  initializedFields: Map<string, string>,
  field: string,
  placement: string,
): void => {
  const previousPlacement = initializedFields.get(field)
  if (previousPlacement !== undefined) {
    throw duplicateFieldError(field, previousPlacement, placement)
  }

  initializedFields.set(field, placement)
}

const assertParentDoesNotOwnInitialField = (
  parentOwnedModel: unknown,
  field: string,
): void => {
  if (
    Predicate.isObject(parentOwnedModel) &&
    Object.hasOwn(parentOwnedModel, field)
  ) {
    throw new Error(
      `[foldkit] Composition.makeInit parent-owned model cannot supply child-initialized field "${field}". Remove that field from the initializer plan model.`,
    )
  }
}

const preflightPlans = (
  bindings: ReadonlyArray<RuntimeBindingValue>,
  childInitContext: unknown,
): Readonly<{
  plans: ReadonlyArray<PreflightedPlan>
  initializedFields: Map<string, string>
}> => {
  const plans: globalThis.Array<PreflightedPlan> = []
  const initializedFields = new Map<string, string>()

  for (const binding of bindings) {
    const initial = runtimeBindingOf(binding).initial
    if (initial === undefined) {
      continue
    }

    if (initial.kind === 'Direct') {
      registerInitialField(initializedFields, initial.field, binding.placement)
      plans.push({
        kind: 'Direct',
        binding,
        initial,
        maybeArguments: initial.resolveArguments(childInitContext),
      })
      continue
    }

    if (initial.kind === 'WrappedKeyed') {
      registerInitialField(initializedFields, initial.field, binding.placement)
      plans.push({
        kind: 'WrappedKeyed',
        binding,
        initial,
        occurrences: initial.resolveOccurrences(childInitContext),
      })
      continue
    }

    plans.push({
      kind: 'Projected',
      binding,
      initial,
      arguments: initial.resolveArguments(childInitContext),
    })
  }

  return { plans, initializedFields }
}

const assertProjectedChildBeforeConstruction = (
  plan: Extract<PreflightedPlan, Readonly<{ kind: 'Projected' }>>,
  assembledInput: unknown,
  initializedChild: unknown,
): void => {
  const selected = runtimeBindingOf(plan.binding).select(assembledInput)
  const maybeSelectedChild = Array.head(selected)

  if (
    selected.length !== 1 ||
    Option.isNone(maybeSelectedChild) ||
    !Object.is(maybeSelectedChild.value.model, initializedChild)
  ) {
    throw new Error(
      `[foldkit] Projected initial Model for Binding "${plan.binding.placement}" must select the exact initialized child before constructing the parent Model.`,
    )
  }
}

const assertProjectedChildAfterConstruction = (
  plan: Extract<PreflightedPlan, Readonly<{ kind: 'Projected' }>>,
  model: unknown,
  initializedChild: unknown,
): void => {
  const runtime = runtimeBindingOf(plan.binding)
  const selected = runtime.select(model)
  const maybeSelectedChild = Array.head(selected)
  const equivalent = Reflect.apply(Schema.toEquivalence, undefined, [
    runtime.block.Model,
  ])

  if (
    selected.length !== 1 ||
    Option.isNone(maybeSelectedChild) ||
    !equivalent(maybeSelectedChild.value.model, initializedChild)
  ) {
    throw new Error(
      `[foldkit] Projected initial Model for Binding "${plan.binding.placement}" must preserve the initialized child through the parent Model Schema.`,
    )
  }
}

const assertWrappedKeyedChildBeforeConstruction = (
  occurrence: InitializedOccurrence,
  assembledInput: unknown,
  selectionsByBinding: Map<RuntimeBindingValue, WrappedKeyedSelectionIndex>,
): void => {
  const runtime = runtimeBindingOf(occurrence.binding)
  if (runtime.initial?.kind !== 'WrappedKeyed') {
    return
  }

  const selected = wrappedKeyedSelectionOf(
    selectionsByBinding,
    occurrence.binding,
    runtime,
    assembledInput,
  ).get(occurrence.key)

  if (
    selected === undefined ||
    selected.count !== 1 ||
    !Object.is(selected.model, occurrence.model)
  ) {
    throw new Error(
      `[foldkit] Keyed initial Model for Binding "${occurrence.binding.placement}" at key "${globalThis.String(occurrence.key)}" must select the exact initialized child before constructing the parent Model.`,
    )
  }
}

type WrappedKeyedPostconstructionSnapshot = Readonly<{
  selectedByKey: WrappedKeyedSelectionIndex
  equivalent: (left: unknown, right: unknown) => boolean
}>

const assertWrappedKeyedChildAfterConstruction = (
  occurrence: InitializedOccurrence,
  model: unknown,
  snapshotsByBinding: Map<
    RuntimeBindingValue,
    WrappedKeyedPostconstructionSnapshot
  >,
): void => {
  const runtime = runtimeBindingOf(occurrence.binding)
  if (runtime.initial?.kind !== 'WrappedKeyed') {
    return
  }

  const existing = snapshotsByBinding.get(occurrence.binding)
  const snapshot = existing ?? {
    selectedByKey: indexWrappedKeyedSelection(runtime, model),
    equivalent: Reflect.apply(Schema.toEquivalence, undefined, [
      runtime.block.Model,
    ]),
  }
  if (existing === undefined) {
    snapshotsByBinding.set(occurrence.binding, snapshot)
  }

  const selected = snapshot.selectedByKey.get(occurrence.key)

  if (
    selected === undefined ||
    selected.count !== 1 ||
    !snapshot.equivalent(selected.model, occurrence.model)
  ) {
    throw new Error(
      `[foldkit] Keyed initial Model for Binding "${occurrence.binding.placement}" at key "${globalThis.String(occurrence.key)}" must preserve the initialized child through the parent Model Schema.`,
    )
  }
}

const makeParentModel = (
  Model: RuntimeModelSchema,
  parentOwnedModel: unknown,
  initializedFields: Readonly<Record<string, unknown>>,
  hasInitialFields: boolean,
): unknown => {
  if (!hasInitialFields) {
    return Model.make(parentOwnedModel)
  }

  if (!Predicate.isObject(parentOwnedModel)) {
    throw new Error(
      '[foldkit] Composition.makeInit parent-owned model must be an object when child Bindings initialize Model fields.',
    )
  }

  return Model.make({ ...parentOwnedModel, ...initializedFields })
}

const occurrenceSurvives = (
  occurrence: InitializedOccurrence,
  model: unknown,
  wrappedSelectionsByBinding: Map<
    RuntimeBindingValue,
    WrappedKeyedSelectionIndex
  >,
): boolean => {
  const runtime = runtimeBindingOf(occurrence.binding)
  const initial = runtime.initial

  if (initial?.kind === 'Direct' && !initial.isStored(model)) {
    return false
  }

  if (
    initial?.kind === 'Projected' &&
    occurrence.field !== undefined &&
    !initial.isStored(model, occurrence.field)
  ) {
    return false
  }

  if (initial?.kind === 'WrappedKeyed') {
    return wrappedKeyedSelectionOf(
      wrappedSelectionsByBinding,
      occurrence.binding,
      runtime,
      model,
    ).has(occurrence.key)
  }

  for (const selected of runtime.select(model)) {
    if (selected.key === occurrence.key) {
      return true
    }
  }

  return false
}

const keepSurvivingOccurrences = (
  occurrences: ReadonlyArray<InitializedOccurrence>,
  model: unknown,
): ReadonlyArray<InitializedOccurrence> => {
  const wrappedSelectionsByBinding = new Map<
    RuntimeBindingValue,
    WrappedKeyedSelectionIndex
  >()

  return globalThis.Array.from(occurrences).filter(occurrence =>
    occurrenceSurvives(occurrence, model, wrappedSelectionsByBinding),
  )
}

/** @internal Creates the runtime authoring helper for one exact Composition. */
export const makeInit =
  (Model: RuntimeModelSchema, bindings: ReadonlyArray<RuntimeBindingValue>) =>
  (create: (...args: ReadonlyArray<any>) => unknown) =>
  (...args: ReadonlyArray<any>): RuntimeReturn =>
    withOperationGraph(bindings, () => {
      const created = create(...args)
      const planValue = isBindingInitRecipe(created)
        ? runBindingInitRecipe(created)
        : created
      assertInitializationPlan(planValue)

      const preflight = preflightPlans(bindings, planValue.childInitContext)
      const initializedFields: Record<string, unknown> = Object.create(null)
      const initializedOccurrences: globalThis.Array<InitializedOccurrence> = []
      const projectedChildren: globalThis.Array<
        Readonly<{
          plan: Extract<PreflightedPlan, Readonly<{ kind: 'Projected' }>>
          field: string
          childModel: unknown
        }>
      > = []

      for (const field of preflight.initializedFields.keys()) {
        assertParentDoesNotOwnInitialField(planValue.model, field)
      }

      for (const plan of preflight.plans) {
        if (plan.kind === 'Direct') {
          if (Option.isNone(plan.maybeArguments)) {
            initializedFields[plan.initial.field] = Option.none()
            continue
          }

          const childInit = runtimeBindingOf(plan.binding).init(
            undefined,
            plan.maybeArguments.value,
          )
          initializedFields[plan.initial.field] = plan.initial.isOptional
            ? Option.some(childInit.model)
            : childInit.model
          initializedOccurrences.push({
            binding: plan.binding,
            key: undefined,
            model: childInit.model,
            commands: childInit.commands ?? [],
          })
          continue
        }

        if (plan.kind === 'WrappedKeyed') {
          const items: globalThis.Array<unknown> = []

          for (const occurrence of plan.occurrences) {
            const childInit = runtimeBindingOf(plan.binding).init(
              occurrence.key,
              occurrence.args,
            )
            const item = plan.initial.toItem(
              occurrence.occurrence,
              childInit.model,
            )
            if (plan.initial.readItemKey(item) !== occurrence.key) {
              throw new Error(
                `[foldkit] Keyed Binding field "${plan.initial.field}" init.toItem must preserve planned key "${globalThis.String(occurrence.key)}".`,
              )
            }

            items.push(item)
            initializedOccurrences.push({
              binding: plan.binding,
              key: occurrence.key,
              model: childInit.model,
              commands: childInit.commands ?? [],
            })
          }

          initializedFields[plan.initial.field] = items
          continue
        }

        const childInit = runtimeBindingOf(plan.binding).init(
          undefined,
          plan.arguments,
        )
        const projection = plan.initial.project(childInit.model)
        registerInitialField(
          preflight.initializedFields,
          projection.field,
          plan.binding.placement,
        )
        assertParentDoesNotOwnInitialField(planValue.model, projection.field)
        initializedFields[projection.field] = projection.value
        initializedOccurrences.push({
          binding: plan.binding,
          key: undefined,
          field: projection.field,
          model: childInit.model,
          commands: childInit.commands ?? [],
        })
        projectedChildren.push({
          plan,
          field: projection.field,
          childModel: childInit.model,
        })
      }

      const hasInitialFields = preflight.initializedFields.size > 0
      const assembledInput = hasInitialFields
        ? { ...planValue.model, ...initializedFields }
        : planValue.model

      for (const projected of projectedChildren) {
        projected.plan.initial.isStored(assembledInput, projected.field)
        assertProjectedChildBeforeConstruction(
          projected.plan,
          assembledInput,
          projected.childModel,
        )
      }

      const wrappedSelectionsBeforeConstruction = new Map<
        RuntimeBindingValue,
        WrappedKeyedSelectionIndex
      >()
      for (const occurrence of initializedOccurrences) {
        assertWrappedKeyedChildBeforeConstruction(
          occurrence,
          assembledInput,
          wrappedSelectionsBeforeConstruction,
        )
      }

      let model = makeParentModel(
        Model,
        planValue.model,
        initializedFields,
        hasInitialFields,
      )

      for (const projected of projectedChildren) {
        projected.plan.initial.isStored(model, projected.field)
        assertProjectedChildAfterConstruction(
          projected.plan,
          model,
          projected.childModel,
        )
      }

      const wrappedSnapshotsAfterConstruction = new Map<
        RuntimeBindingValue,
        WrappedKeyedPostconstructionSnapshot
      >()
      for (const occurrence of initializedOccurrences) {
        assertWrappedKeyedChildAfterConstruction(
          occurrence,
          model,
          wrappedSnapshotsAfterConstruction,
        )
      }

      let survivingOccurrences = keepSurvivingOccurrences(
        initializedOccurrences,
        model,
      )
      const stepCommands: globalThis.Array<any> = []

      for (const step of planValue.steps ?? []) {
        const stepValue = resolveOperationOutput(step(model), model)
        assertStepReturn(stepValue)
        model = stepValue.model
        stepCommands.push(...(stepValue.commands ?? []))
        survivingOccurrences = keepSurvivingOccurrences(
          survivingOccurrences,
          model,
        )
      }

      return {
        model,
        commands: [
          ...(planValue.commands ?? []),
          ...survivingOccurrences.flatMap(occurrence => occurrence.commands),
          ...stepCommands,
        ],
      }
    })
