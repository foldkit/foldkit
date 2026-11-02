import { Array, Context, Effect, Layer, type Scope } from 'effect'

import { registerExecutableHandle } from '../../block/bindingConnection.js'
import { defaultViewOf, registerDefaultView } from '../../block/defaultView.js'
import { registerDeclaredDescriptor } from '../constructed/runtime.js'
import { acquisitionOf, registerAcquisition } from '../constructed/symbolic.js'
import { makeDefinitionRuntime, selectContractHandlers } from './runtime.js'

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
    'Message',
    'InMessage',
    'OutMessage',
    'get',
    'layer',
    'then',
    'provideHandlers',
  ])

  for (const name of Object.keys(members)) {
    if (reservedMembers.has(name)) {
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
  const specialization = Layer.effect(
    Result,
    Effect.gen(function* () {
      const implementation = yield* implementationKey
      const recipe = recipes.get(toRecipe(implementation))

      if (recipe === undefined || recipe.definition !== definition) {
        throw new Error(
          '[foldkit] A family provider returned a foreign specialization recipe.',
        )
      }

      const block =
        selectedHandlers === undefined
          ? recipe.block
          : selectContractHandlers(recipe.block, selectedHandlers, hostHandlers)
      const context = yield* Layer.buildWithMemoMap(
        block.layer,
        implementation.memoMap,
        implementation.scope,
      )
      const executable = yield* block.get.pipe(Effect.provideContext(context))
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
      registerAcquisition(alias, contract, acquiredBlock)
      registerDefaultView(alias, defaultViewOf(executable))

      return alias
    }),
  )
  const get = Effect.flatMap(implementationKey, implementation =>
    Layer.buildWithMemoMap(
      specialization,
      implementation.memoMap,
      implementation.scope,
    ).pipe(
      Effect.provideService(Layer.CurrentMemoMap, implementation.memoMap),
      Effect.map(context => Context.get(context, Result)),
    ),
  )
  const contract: object = Object.freeze({
    ...members,
    owner: declared.contract.owner,
    Model: declared.contract.Model,
    Message: declared.contract.Message,
    InMessage: declared.contract.InMessage,
    OutMessage: declared.contract.OutMessage,
    get,
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
            )
          },
        }),
  })
  registerDeclaredDescriptor(contract, () => get)

  return contract
}
