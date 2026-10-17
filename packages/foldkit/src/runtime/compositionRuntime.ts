import {
  Cause,
  Context,
  Effect,
  Exit,
  Fiber,
  Option,
  Predicate,
  PubSub,
  Ref,
  Scope,
} from 'effect'

import type { BindableBlock } from '../block/binding.js'
import { runtimeBindingOf } from '../block/composition.js'
import { localChannelsOf } from '../block/definition.js'
import {
  type ActiveInstance,
  CurrentInstance,
  type InstanceFrame,
  type InstanceKey,
  commandInstances,
} from '../block/instanceContext.js'
import { invocationContextWithCursor } from '../block/scope.js'
import * as Subscription from '../subscription/subscription.js'
import { forkManagedResourceFibers } from './managedResourceFibers.js'
import type { ManagedResourceRef } from './resourceProvider.js'
import type {
  ResolvedSlowPhaseConfig,
  SlowSubscriptionDependenciesContext,
} from './slowPhase.js'
import { forkSubscriptionFibers } from './subscriptionFibers.js'

type ModelSnapshot = Readonly<{ model: any; parentModel: any; rootModel: any }>

type InstanceNode = Omit<ActiveInstance, 'children'> & {
  block: BindableBlock
  model: any
  scope: Scope.Closeable
  modelPubSub: PubSub.PubSub<any>
  context: Context.Context<never>
  resources: Context.Context<never>
  managedResourceRefs: ReadonlyArray<ManagedResourceRef<any, any>>
  children: Map<object, Map<InstanceKey | undefined, InstanceNode>>
  toRootMessage: (message: any) => any
  parent?: InstanceNode
  placement: string
  label: string
  isStarted: boolean
  retiringChildren: Set<InstanceNode>
  closing?: Fiber.Fiber<void>
}

/** @internal The resources and validity captured when a Command is returned. */
export type CapturedInvocation = Readonly<{
  context: Context.Context<never>
  scope: Scope.Scope
  isCurrent: () => boolean
}>

/** @internal Reconciles occurrence-owned lifecycles without rebuilding handler Layers. */
export type CompositionRuntime<Model> = Readonly<{
  context: Context.Context<never>
  synchronize: (model: Model) => void
  capture: (command: object) => CapturedInvocation | undefined
  start: Effect.Effect<void>
}>

/** @internal Owns one active lifecycle scope and resource slot set per occurrence. */
export const makeCompositionRuntime = <Model, Message>({
  block,
  initModel,
  context,
  runtimeScope,
  enqueueMessage,
  crashWith,
  maybeSlowSubscriptionDependencies,
}: Readonly<{
  block: BindableBlock
  initModel: Model
  context: Context.Context<never>
  runtimeScope: Scope.Scope
  enqueueMessage: (message: Message, isCurrent?: () => boolean) => void
  crashWith: (
    cause: Cause.Cause<never>,
    message: Option.Option<Message>,
  ) => Effect.Effect<void>
  maybeSlowSubscriptionDependencies: Option.Option<
    ResolvedSlowPhaseConfig<SlowSubscriptionDependenciesContext<Model>>
  >
}>): Effect.Effect<CompositionRuntime<Model>, never, Scope.Scope> =>
  Effect.gen(function* () {
    let generation = 0
    let isStarted = false
    const retired = new Set<InstanceNode>()
    const retiringOccurrences = new WeakMap<
      InstanceNode,
      Map<object, Map<InstanceKey | undefined, InstanceNode>>
    >()

    const retiringOccurrenceAt = (
      parent: InstanceNode,
      binding: object,
      key: InstanceKey | undefined,
    ): InstanceNode | undefined =>
      retiringOccurrences.get(parent)?.get(binding)?.get(key)

    const recordRetiringOccurrence = (node: InstanceNode): void => {
      if (node.parent === undefined || node.binding === undefined) {
        return
      }

      const byBinding = retiringOccurrences.get(node.parent) ?? new Map()
      const byKey = byBinding.get(node.binding) ?? new Map()
      byKey.set(node.key, node)
      byBinding.set(node.binding, byKey)
      retiringOccurrences.set(node.parent, byBinding)
    }

    const clearRetiringOccurrence = (node: InstanceNode): void => {
      if (node.parent === undefined || node.binding === undefined) {
        return
      }

      const byBinding = retiringOccurrences.get(node.parent)
      const byKey = byBinding?.get(node.binding)
      if (
        byBinding === undefined ||
        byKey === undefined ||
        byKey.get(node.key) !== node
      ) {
        return
      }

      byKey.delete(node.key)
      if (byKey.size === 0) {
        byBinding.delete(node.binding)
      }
      if (byBinding.size === 0) {
        retiringOccurrences.delete(node.parent)
      }
    }

    const makeNode = (
      childBlock: BindableBlock,
      model: any,
      placement: string,
      parentContext: Context.Context<never>,
      toRootMessage: (message: any) => any,
      parent?: InstanceNode,
      binding?: object,
      key?: InstanceKey,
    ): InstanceNode => {
      const channels = localChannelsOf(childBlock)
      const managedResourceRefs = Object.values(channels.managedResources).map(
        config => ({
          config: {
            ...config,
            modelToMaybeRequirements: (snapshot: ModelSnapshot) =>
              config.modelToMaybeRequirements(snapshot.model),
          },
          ref: Ref.makeUnsafe(Option.none<unknown>()),
        }),
      )
      const resources = managedResourceRefs.reduce(
        (resources, { config, ref }) =>
          Context.add(resources, config.resource._tag, ref),
        Context.empty(),
      )
      const previousGeneration =
        parent === undefined || binding === undefined
          ? undefined
          : retiringOccurrenceAt(parent, binding, key)
      const node: InstanceNode = {
        block: childBlock,
        model,
        placement,
        label:
          parent === undefined
            ? placement
            : `${parent.label}/${placement}${key === undefined ? '' : `[${JSON.stringify(key)}]`}`,
        isActive: true,
        isStarted: false,
        generation: generation++,
        ...(parent === undefined ? {} : { parent }),
        ...(binding === undefined ? {} : { binding }),
        ...(key === undefined ? {} : { key }),
        resources,
        mounts: new Set(),
        context: Context.empty(),
        managedResourceRefs,
        children: new Map(),
        retiringChildren: new Set(),
        scope: Scope.makeUnsafe(),
        modelPubSub: Effect.runSync(PubSub.unbounded<any>({ replay: 1 })),
        toRootMessage,
      }
      node.context = invocationContextWithCursor(
        placement,
        parentContext,
        parent === undefined
          ? { node }
          : { node: parent, capturedChildren: [node] },
        binding === undefined
          ? undefined
          : { binding, ...(key === undefined ? {} : { key }) },
      )
      const inheritedStartBarrier = parent?.startBarrier
      if (
        inheritedStartBarrier !== undefined ||
        previousGeneration !== undefined
      ) {
        const startBarrier = Effect.all(
          [
            inheritedStartBarrier ?? Effect.void,
            previousGeneration === undefined
              ? Effect.void
              : Effect.suspend(() => closeNode(previousGeneration)),
          ],
          { concurrency: 'unbounded', discard: true },
        ).pipe(
          Effect.andThen(
            Effect.sync(() => {
              delete node.startBarrier
            }),
          ),
        )
        node.startBarrier = startBarrier
      }
      return node
    }

    const root = makeNode(
      block,
      initModel,
      block.owner.id,
      context,
      message => message,
    )

    const closeNode = (node: InstanceNode): Effect.Effect<void> =>
      Effect.suspend(() => {
        const lifecycleChildren = new Set(node.retiringChildren)
        for (const children of node.children.values()) {
          for (const child of children.values()) {
            lifecycleChildren.add(child)
          }
        }
        const closeChildren = Effect.forEach(lifecycleChildren, closeNode, {
          concurrency: 'unbounded',
          discard: true,
        })
        const closeCurrentGeneration = closeChildren.pipe(
          Effect.andThen(
            Effect.forEach(node.mounts, Fiber.interrupt, {
              concurrency: 'unbounded',
              discard: true,
            }),
          ),
          Effect.andThen(Scope.close(node.scope, Exit.void)),
        )
        node.closing ??= Effect.runForkWith(context)(
          Effect.all(
            [node.startBarrier ?? Effect.void, closeCurrentGeneration],
            {
              concurrency: 'unbounded',
              discard: true,
            },
          ).pipe(
            Effect.ensuring(PubSub.shutdown(node.modelPubSub)),
            Effect.ensuring(
              Effect.sync(() => {
                retired.delete(node)
                clearRetiringOccurrence(node)
                node.parent?.retiringChildren.delete(node)
              }),
            ),
          ),
        )
        return Fiber.join(node.closing)
      })

    const retire = (node: InstanceNode): void => {
      node.isActive = false
      for (const children of node.children.values()) {
        for (const child of children.values()) {
          retire(child)
        }
      }
      if (node.parent?.isActive) {
        node.parent.retiringChildren.add(node)
      }
      recordRetiringOccurrence(node)
      retired.add(node)
    }

    const startNode = (node: InstanceNode): Effect.Effect<void> =>
      Effect.suspend(() => {
        return (node.startBarrier ?? Effect.void).pipe(
          Effect.andThen(
            Effect.suspend(() => {
              if (!node.isActive || node.isStarted) {
                return Effect.void
              }
              node.isStarted = true
              const channels = localChannelsOf(node.block)
              const subscriptions = Subscription.lift(channels.subscriptions)<
                ModelSnapshot,
                any
              >({
                read: snapshot => Option.some(snapshot.model),
                toParentMessage: message => message,
                when: Object.fromEntries(
                  Object.keys(channels.subscriptions).map(name => [
                    name,
                    (snapshot: ModelSnapshot) =>
                      node.parent === undefined ||
                      runtimeBindingOf(node.binding!).subscriptionWhen(
                        snapshot.parentModel,
                        node.key,
                        name,
                      ),
                  ]),
                ),
              })
              const provideAllResources = <A, Requirements>(
                effect: Effect.Effect<A, never, Requirements>,
              ): Effect.Effect<A> =>
                Effect.provideContext(
                  effect,
                  Context.makeUnsafe<Requirements>(node.context.mapUnsafe),
                )
              const enqueueMessageEffect = (message: any) =>
                Effect.sync(() => {
                  if (node.isActive) {
                    enqueueMessage(
                      node.toRootMessage(message),
                      () => node.isActive,
                    )
                  }
                })
              return Effect.gen(function* () {
                yield* forkManagedResourceFibers({
                  managedResourceRefs: node.managedResourceRefs,
                  initModel: snapshot(node),
                  modelPubSub: node.modelPubSub,
                  runtimeScope: node.scope,
                  enqueueMessageEffect,
                  provideAllResources,
                  crashWith,
                })
                yield* forkSubscriptionFibers<any, any, any>({
                  subscriptions,
                  initModel: snapshot(node),
                  modelPubSub: node.modelPubSub,
                  runtimeScope: node.scope,
                  maybeSlowSubscriptionDependencies: Option.map(
                    maybeSlowSubscriptionDependencies,
                    slow => ({
                      thresholdMs: slow.thresholdMs,
                      onSlow: context =>
                        slow.onSlow({
                          ...context,
                          subscriptionKey: `${node.label}/${context.subscriptionKey}`,
                          model: context.model.rootModel,
                        }),
                    }),
                  ),
                  enqueueMessageEffect,
                  provideAllResources,
                  crashWith,
                })
                yield* Effect.forEach(
                  node.children.values(),
                  children =>
                    Effect.forEach(children.values(), startNode, {
                      concurrency: 'unbounded',
                      discard: true,
                    }),
                  { concurrency: 'unbounded', discard: true },
                )
              })
            }),
          ),
        )
      })

    const snapshot = (node: InstanceNode): ModelSnapshot => ({
      model: node.model,
      parentModel: node.parent?.model,
      rootModel: root.model,
    })

    type ReconciliationPlan = Readonly<{
      model: any
      childBindings: ReadonlyArray<
        Readonly<{
          binding: BindableBlock['childBindings'][number]
          occurrences: ReadonlyArray<
            Readonly<{
              key?: InstanceKey
              plan: ReconciliationPlan
            }>
          >
        }>
      >
    }>

    const planReconciliation = (
      block: BindableBlock,
      model: any,
    ): ReconciliationPlan => ({
      model,
      childBindings: block.childBindings.map(binding => {
        const policy = runtimeBindingOf(binding)
        const keys = new Set<InstanceKey | undefined>()
        const occurrences = policy.select(model).map(child => {
          if (
            Object.hasOwn(child, 'key') &&
            !Predicate.isString(child.key) &&
            (typeof child.key !== 'number' ||
              !globalThis.Number.isFinite(child.key))
          ) {
            throw new Error(
              `[foldkit] Block placement "${binding.placement}" requires string or finite number keys.`,
            )
          }

          if (keys.has(child.key)) {
            throw new Error(
              `[foldkit] Block placement "${binding.placement}" has duplicate key "${child.key}".`,
            )
          }

          keys.add(child.key)

          return {
            ...(child.key === undefined ? {} : { key: child.key }),
            plan: planReconciliation(policy.block, child.model),
          }
        })
        return { binding, occurrences }
      }),
    })

    const reconcile = (model: Model): void => {
      const plan = planReconciliation(block, model)
      const updated: Array<InstanceNode> = []
      const created: Array<InstanceNode> = []
      const applyPlan = (
        node: InstanceNode,
        plan: ReconciliationPlan,
      ): void => {
        node.model = plan.model
        updated.push(node)
        for (const { binding, occurrences } of plan.childBindings) {
          const policy = runtimeBindingOf(binding)
          const previous =
            node.children.get(binding) ??
            new Map<InstanceKey | undefined, InstanceNode>()
          const next = new Map<InstanceKey | undefined, InstanceNode>()
          for (const { key, plan: childPlan } of occurrences) {
            let occurrence = previous.get(key)
            if (occurrence === undefined) {
              occurrence = makeNode(
                policy.block,
                childPlan.model,
                binding.placement,
                node.context,
                message =>
                  node.toRootMessage(policy.toParentMessage(key, message)),
                node,
                binding,
                key,
              )
              created.push(occurrence)
            }
            next.set(key, occurrence)
            applyPlan(occurrence, childPlan)
          }
          node.children.set(binding, next)
          for (const [key, occurrence] of previous) {
            if (!next.has(key)) {
              retire(occurrence)
            }
          }
        }
      }
      applyPlan(root, plan)
      for (const node of updated) {
        PubSub.publishUnsafe(node.modelPubSub, snapshot(node))
      }
      if (isStarted) {
        for (const node of retired) {
          Effect.runForkWith(context)(closeNode(node))
        }
        const createdSet = new Set(created)
        for (const node of created) {
          if (node.parent !== undefined && createdSet.has(node.parent)) {
            continue
          }

          Effect.runForkWith(context)(
            Effect.forkIn(runtimeScope)(startNode(node)),
          )
        }
      }
    }

    reconcile(initModel)

    yield* Effect.addFinalizer(() =>
      Effect.suspend(() => {
        retire(root)
        return Effect.forEach(globalThis.Array.from(retired), closeNode, {
          concurrency: 'unbounded',
          discard: true,
        })
      }),
    )

    const makeHistoricalNode = (
      historicalDefinition: BindableBlock,
      binding?: object,
      key?: InstanceKey,
    ): ActiveInstance => {
      const resources = Object.values(
        localChannelsOf(historicalDefinition).managedResources,
      ).reduce(
        (resources, entry) =>
          Context.add(
            resources,
            entry.resource._tag,
            Ref.makeUnsafe(Option.none()),
          ),
        Context.empty(),
      )
      return {
        isActive: false,
        generation: -1,
        ...(binding === undefined ? {} : { binding }),
        ...(key === undefined ? {} : { key }),
        resources,
        mounts: new Set(),
        children: new Map(),
      }
    }
    const historicalChild = (
      parent: ActiveInstance,
      frame: InstanceFrame,
    ): ActiveInstance => {
      const byKey = parent.children.get(frame.binding) ?? new Map()
      const existing = byKey.get(frame.key)
      if (existing !== undefined) {
        return existing
      }
      const childBlock = runtimeBindingOf(frame.binding).block
      const historical = makeHistoricalNode(
        childBlock,
        frame.binding,
        frame.key,
      )
      byKey.set(frame.key, historical)
      parent.children.set(frame.binding, byKey)
      return historical
    }
    const rootContext = Context.add(context, CurrentInstance, {
      node: root,
      historicalRoot: () => makeHistoricalNode(block),
      historicalChild,
    })
    return {
      context: rootContext,
      synchronize: reconcile,
      capture: command => {
        const nodes: Array<InstanceNode> = []
        let node = root
        for (const frame of commandInstances(command)) {
          const child = node.children.get(frame.binding)?.get(frame.key)
          if (child === undefined || !child.isActive) {
            return undefined
          }
          nodes.push(child)
          node = child
        }
        const target = node
        return {
          context: Context.add(rootContext, CurrentInstance, {
            node: root,
            capturedChildren: nodes,
          }),
          scope: runtimeScope,
          isCurrent: () => target.isActive,
        }
      },
      start: Effect.suspend(() => {
        isStarted = true
        return startNode(root)
      }),
    }
  })
