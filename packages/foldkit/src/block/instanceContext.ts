import { Array, Context, type Fiber, Option } from 'effect'
import type { Effect as EffectType } from 'effect/Effect'

/** A stable keyed Binding occurrence identity. Runtime keys must be strings or
 * finite numbers. Numeric zero and negative zero identify the same occurrence,
 * matching JavaScript Map and Set key equality. */
export type InstanceKey = string | number

/** @internal A logical step in the declared composition graph. */
export type InstanceFrame = Readonly<{
  binding: object
  key?: InstanceKey
  isInitialization?: boolean
}>

/** @internal An active occurrence whose identity survives ordinary Model changes. */
export type ActiveInstance = {
  isActive: boolean
  generation: number
  key?: InstanceKey
  binding?: object
  startBarrier?: EffectType<void>
  resources: Context.Context<never>
  mounts: Set<Fiber.Fiber<void>>
  children: Map<object, Map<InstanceKey | undefined, ActiveInstance>>
}

/** @internal The occurrence used by an invocation or view boundary. */
export type InstanceCursor = Readonly<{
  node: ActiveInstance
  capturedChildren?: ReadonlyArray<ActiveInstance>
  historicalRoot?: () => ActiveInstance
  historicalChild?: (
    parent: ActiveInstance,
    frame: InstanceFrame,
  ) => ActiveInstance
}>

/** @internal Supplies generation-specific resources without rebuilding Services. */
export const CurrentInstance = Context.Reference<InstanceCursor | undefined>(
  'foldkit/Block/CurrentInstance',
  { defaultValue: () => undefined },
)

/** @internal Records binding occurrences before their Command results are lifted. */
export const CommandInstancesTypeId = Symbol('foldkit/Command/Instances')

/** @internal Captures the binding path attached to an invocation. */
export const commandInstances = (
  command: object,
): ReadonlyArray<InstanceFrame> =>
  Reflect.get(command, CommandInstancesTypeId) ?? []

/** @internal Enters an exact captured occurrence or the current rendered child. */
export const enterInstance = (
  context: Context.Context<never>,
  frame?: InstanceFrame,
  isHistorical = false,
): Context.Context<never> => {
  const cursor = Context.get(context, CurrentInstance)
  if (cursor === undefined) {
    return context
  }

  if (frame === undefined) {
    return Context.merge(context, cursor.node.resources)
  }

  const child = isHistorical
    ? cursor.historicalChild?.(cursor.node, frame)
    : ((cursor.capturedChildren === undefined
        ? undefined
        : Option.getOrUndefined(Array.head(cursor.capturedChildren))) ??
      cursor.node.children.get(frame.binding)?.get(frame.key))
  if (
    child === undefined ||
    child.binding !== frame.binding ||
    child.key !== frame.key
  ) {
    throw new Error(
      '[foldkit] This child occurrence is not active in the composed Model.',
    )
  }

  return Context.add(Context.merge(context, child.resources), CurrentInstance, {
    node: child,
    ...(cursor.historicalRoot === undefined
      ? {}
      : { historicalRoot: cursor.historicalRoot }),
    ...(cursor.historicalChild === undefined
      ? {}
      : { historicalChild: cursor.historicalChild }),
    ...(cursor.capturedChildren === undefined
      ? {}
      : {
          capturedChildren: cursor.capturedChildren.slice(1),
        }),
  })
}

/** @internal Starts one render-owned historical occurrence tree. */
export const enterHistoricalInstanceTree = (
  context: Context.Context<never>,
): Context.Context<never> => {
  const cursor = Context.get(context, CurrentInstance)
  if (cursor?.historicalRoot === undefined) {
    return context
  }

  const node = cursor.historicalRoot()
  return Context.add(Context.merge(context, node.resources), CurrentInstance, {
    node,
    historicalRoot: cursor.historicalRoot,
    ...(cursor.historicalChild === undefined
      ? {}
      : {
          historicalChild: cursor.historicalChild,
        }),
  })
}

type AnyDispatch = (message: any, isCurrent?: () => boolean) => void
const guardedDispatches = new WeakMap<
  ActiveInstance,
  Map<AnyDispatch, AnyDispatch>
>()

/** @internal Keeps stale view dispatches out of both immediate and buffered updates. */
export const guardInstanceDispatch = <Message>(
  context: Context.Context<never>,
  dispatch: (message: Message, isCurrent?: () => boolean) => void,
): ((message: Message) => void) => {
  const cursor = Context.get(context, CurrentInstance)
  if (cursor === undefined) {
    return dispatch
  }
  const { node } = cursor
  const dispatches =
    guardedDispatches.get(node) ?? new Map<AnyDispatch, AnyDispatch>()
  const existing = dispatches.get(dispatch)
  if (existing !== undefined) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return existing as (message: Message) => void
  }
  const guarded = (message: Message): void => {
    if (node.isActive) {
      dispatch(message, () => node.isActive)
    }
  }
  dispatches.set(dispatch, guarded)
  guardedDispatches.set(node, dispatches)
  return guarded
}
