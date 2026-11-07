import { Array, Context, Effect, Layer, Option, type Scope } from 'effect'

import { registerExecutableHandle } from '../../block/bindingConnection.js'
import { defaultViewOf, registerDefaultView } from '../../block/defaultView.js'
import { registerDeclaredDescriptor } from '../constructed/runtime.js'
import {
  acquisitionOf,
  registerAcquisitionAlias,
} from '../constructed/symbolic.js'
import {
  makeDefinitionRuntime,
  registerDeclaredLayerReader,
  registerDeclaredLayerSelection,
  selectContractHandlers,
  selectDeclaredLayerHandlers,
} from './runtime.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type RuntimeBlock = Readonly<{
  layer: Layer.Layer<any, any, any>
  get: Effect.Effect<object, any, any>
  provide: (dependencies: Layer.Any) => RuntimeBlock
}>
type Recipe = Readonly<{
  definition: object
  block: RuntimeBlock
}>

/** @internal One selected family's construction Scope and private specialization cache. */
export interface FamilyLifetime {
  readonly scope: Scope.Scope
  readonly memoMap: Layer.MemoMap
}

/** @internal Allocates specialization memoization once per family implementation Layer. */
export const familyLifetimeRuntime = Effect.gen(function* () {
  const scope = yield* Effect.scope
  const memoMap = yield* Layer.makeMemoMap

  return { scope, memoMap }
})

const definitions = new WeakMap<object, any>()
const recipes = new WeakMap<object, Recipe>()
let nextResult = 0

const makeRecipe = (definition: object, block: RuntimeBlock): object => {
  const recipe = Object.freeze({
    provide: (dependencies: Layer.Any) =>
      makeRecipe(definition, block.provide(dependencies)),
    provideHandlers: (handlers: Layer.Any) =>
      makeRecipe(definition, selectContractHandlers(block, handlers)),
  })
  recipes.set(recipe, { definition, block })

  return recipe
}

/** @internal Creates typed-authoring runtime methods without exposing private per-call capabilities. */
export const makeFamilyDefinitionRuntime = (
  id: string,
  config: Parameters<typeof makeDefinitionRuntime>[1],
  sourceDefinition?: object,
): object => {
  const definition = makeDefinitionRuntime(id, config, false, sourceDefinition)
  const {
    contract: _contract,
    makeBlock: _makeBlock,
    ...authoring
  } = definition
  const familyDefinition = Object.freeze({
    ...authoring,
    makeBlock: (constructor: Effect.Effect<any, any, any>) =>
      makeRecipe(familyDefinition, definition.makeBlock(constructor)),
  })
  definitions.set(familyDefinition, definition)

  return familyDefinition
}

/** @internal Declares a family Block with ordinary Layer completion. */
export const makeFamilyLayerDefinitionRuntime = (
  id: string,
  config: Parameters<typeof makeDefinitionRuntime>[1],
  sourceDefinition?: object,
): object => {
  const definition = makeDefinitionRuntime(id, config, false, sourceDefinition)
  const {
    contract: _contract,
    makeBlock: _makeBlock,
    provideHandlers: _provideHandlers,
    ...authoring
  } = definition
  const familyBlock = Object.freeze(authoring)
  definitions.set(familyBlock, definition)

  return familyBlock
}

/** @internal Acquires an authenticated specialization through one universal implementation provider. */
export const makeFamilyContractRuntime = (
  definition: object,
  implementationKey: Context.Service<any, FamilyLifetime>,
  toRecipe: AnyFunction,
  options: Readonly<{
    hostHandlers?: ReadonlyArray<unknown>
    members?: object
    handlers?: Layer.Any
  }> = {},
  transport: 'Recipe' | 'Layer' = 'Recipe',
): object => {
  const declared = definitions.get(definition)

  if (declared === undefined) {
    throw new Error(
      '[foldkit] A family contract requires an original family Definition.',
    )
  }

  const members = Object.freeze({ ...options.members })
  const reservedMembers = new Set([
    'owner',
    'Model',
    'Instance',
    'Message',
    'InMessage',
    'OutMessage',
    'get',
    'layer',
    'then',
    'provideHandlers',
  ])

  for (const name of Object.keys(members)) {
    if (
      reservedMembers.has(name) ||
      (transport === 'Layer' && Object.hasOwn(definition, name))
    ) {
      throw new Error(`[foldkit] Family member "${name}" is reserved.`)
    }
  }

  const hostHandlers = Object.freeze([...(options.hostHandlers ?? [])])
  const selectedHandlers = options.handlers

  if (selectedHandlers !== undefined && !Layer.isLayer(selectedHandlers)) {
    throw new Error(
      '[foldkit] Family handler selection requires an Effect Layer.',
    )
  }

  if (new Set(hostHandlers).size !== hostHandlers.length) {
    throw new Error(
      '[foldkit] Family host handler declarations must be distinct.',
    )
  }

  const Result = Context.Service<object>(`foldkit/FamilyResult/${nextResult++}`)
  const ImplementationFacts = Context.Service<object>(
    `foldkit/FamilyFacts/${nextResult++}`,
  )
  const authenticate = (executable: object): object => {
    const acquiredBlock = acquisitionOf(executable).block
    const expectedHosts = selectedHandlers === undefined ? hostHandlers : []

    if (
      acquiredBlock.hostHandlers.length !== expectedHosts.length ||
      Array.some(
        acquiredBlock.hostHandlers,
        handler => !expectedHosts.includes(handler),
      )
    ) {
      throw new Error(
        '[foldkit] A family specialization requires all host handlers before acquisition or their explicit original declarations.',
      )
    }

    const alias = Object.freeze({ ...executable })
    registerExecutableHandle(alias, acquiredBlock)
    registerAcquisitionAlias(
      alias,
      contract,
      acquiredBlock,
      acquisitionOf(executable),
    )
    registerDefaultView(alias, defaultViewOf(executable))

    return alias
  }
  const specialization = Layer.effect(
    Result,
    Effect.gen(function* () {
      const implementation = yield* implementationKey
      const result = toRecipe(implementation)
      const recipe = transport === 'Recipe' ? recipes.get(result) : undefined

      if (
        transport === 'Recipe' &&
        (recipe === undefined || recipe.definition !== definition)
      ) {
        throw new Error(
          '[foldkit] A family provider returned a foreign specialization recipe.',
        )
      }

      if (transport === 'Layer' && !Layer.isLayer(result)) {
        throw new Error(
          '[foldkit] A family provider must return an ordinary Effect Layer.',
        )
      }

      const block =
        transport === 'Recipe'
          ? selectedHandlers === undefined
            ? recipe!.block
            : selectContractHandlers(
                recipe!.block,
                selectedHandlers,
                hostHandlers,
              )
          : {
              get: declared.contract.get,
              layer:
                selectedHandlers === undefined
                  ? result
                  : selectDeclaredLayerHandlers(
                      declared,
                      result,
                      selectedHandlers,
                      hostHandlers,
                    ),
            }
      const context = yield* Layer.buildWithMemoMap(
        block.layer,
        implementation.memoMap,
        implementation.scope,
      )
      const executable = yield* block.get.pipe(Effect.provideContext(context))
      return authenticate(executable)
    }),
  )
  const constructDefault = Effect.flatMap(implementationKey, implementation =>
    Layer.buildWithMemoMap(
      specialization,
      implementation.memoMap,
      implementation.scope,
    ).pipe(
      Effect.provideService(Layer.CurrentMemoMap, implementation.memoMap),
      Effect.map(context => Context.get(context, Result)),
    ),
  )
  const get = Effect.flatMap(Effect.serviceOption(Result), maybeProvided =>
    Option.match(maybeProvided, {
      onSome: executable => Effect.succeed(executable),
      onNone: () => constructDefault,
    }),
  )
  const makeLayer = (
    constructor: Effect.Effect<any, any, any> | object,
  ): Layer.Layer<any, any, any> => {
    const rawLayer = declared.makeLayer(constructor)
    const graphLayer =
      selectedHandlers === undefined
        ? rawLayer
        : selectDeclaredLayerHandlers(
            declared,
            rawLayer,
            selectedHandlers,
            hostHandlers,
          )

    return Layer.fromBuildMemo((memoMap, scope) =>
      Effect.gen(function* () {
        const context = yield* Layer.buildWithMemoMap(
          graphLayer,
          memoMap,
          scope,
        )
        const executable = yield* declared.contract.get.pipe(
          Effect.provideContext(context),
        )
        const alias = authenticate(executable)

        return Context.add(
          Context.make(Result, alias),
          ImplementationFacts,
          alias,
        )
      }),
    )
  }
  const contract: object = Object.freeze({
    ...(transport === 'Layer' ? definition : {}),
    ...members,
    owner: declared.contract.owner,
    Model: declared.contract.Model,
    Instance: declared.contract.Instance,
    Message: declared.contract.Message,
    InMessage: declared.contract.InMessage,
    OutMessage: declared.contract.OutMessage,
    ...(transport === 'Recipe' ? { get } : {}),
    ...(transport === 'Layer' ? { makeLayer } : {}),
    ...(Array.isReadonlyArrayEmpty(hostHandlers)
      ? {}
      : {
          provideHandlers: (handlers: Layer.Any) => {
            if (!Layer.isLayer(handlers)) {
              throw new Error(
                '[foldkit] Family handler selection requires an Effect Layer.',
              )
            }

            return makeFamilyContractRuntime(
              definition,
              implementationKey,
              toRecipe,
              {
                members,
                hostHandlers,
                handlers,
              },
              transport,
            )
          },
        }),
  })
  if (transport === 'Layer') {
    registerDeclaredLayerReader(
      contract,
      Effect.map(Result, executable => acquisitionOf(executable).block),
      Result,
    )
    registerDeclaredLayerSelection(contract, selectedLayer => {
      const Selected = Context.Service<object>(
        `foldkit/FamilySelection/${nextResult++}`,
      )
      const selectedConstruction = Layer.fromBuildMemo((memoMap, scope) =>
        Effect.gen(function* () {
          const selectedContext = yield* Layer.buildWithMemoMap(
            selectedLayer,
            memoMap,
            scope,
          )
          const maybeExact = Context.getOption(selectedContext, Result)
          const maybeShared = Context.getOption(
            selectedContext,
            implementationKey,
          )
          const executable = yield* Option.match(maybeExact, {
            onSome: executable => Effect.succeed(executable),
            onNone: () =>
              Option.match(maybeShared, {
                onSome: implementation =>
                  Effect.provideService(
                    constructDefault,
                    implementationKey,
                    implementation,
                  ),
                onNone: () =>
                  Effect.die(
                    new Error(
                      '[foldkit] The selected family Layer does not provide this Block specialization or its universal implementation.',
                    ),
                  ),
              }),
          })
          const acquired = acquisitionOf(executable)

          if (acquired.descriptor !== contract || !acquired.isCurrent()) {
            throw new Error(
              '[foldkit] The selected family Layer must provide the current original Block specialization.',
            )
          }

          return Context.add(selectedContext, Selected, executable)
        }),
      )

      return {
        layer: selectedConstruction,
        read: Effect.map(
          Selected,
          executable => acquisitionOf(executable).block,
        ),
        readForTesting: Selected,
      }
    })
  }
  registerDeclaredDescriptor(
    contract,
    () => get,
    () =>
      Effect.flatMap(
        Effect.serviceOption(implementationKey),
        maybeImplementation =>
          Option.match(maybeImplementation, {
            onNone: () => Effect.succeed(Option.none()),
            onSome: implementation =>
              Effect.map(
                Effect.provideService(get, implementationKey, implementation),
                Option.some,
              ),
          }),
      ),
  )

  return contract
}
