import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'

import {
  LoaderBlock,
  StatusClientLayer,
  makeLoaderParts,
} from './generic-service-factory.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Assert<Value extends true> = Value

const City = Schema.Literals(['London', 'Berlin'])
class CityClient extends Context.Service<
  CityClient,
  Readonly<{ load: Effect.Effect<typeof City.Type> }>
>()('DeclarationGenericCityClient') {}

export const cityLoader = makeLoaderParts(City, CityClient)

const CityEffectsLayer = cityLoader.Load.toLayer(
  Effect.gen(function* () {
    const client = yield* cityLoader.Client

    return () =>
      Effect.map(client.load, value =>
        cityLoader.Message.CompletedLoad({ value }),
      )
  }),
)

const prepare = () =>
  cityLoader.composition.prepareBlock({
    init: cityLoader.init,
    update: cityLoader.update,
    view: cityLoader.view,
    EffectsLayer: CityEffectsLayer,
  })
export const CityBlock: Block.FromAssemblyWithView<
  typeof cityLoader.composition.Model,
  typeof prepare
> = Block.assemble(prepare)

export type EmittedFactoryRetainsValue = Assert<
  Equal<
    Extract<typeof cityLoader.Message.Type, { _tag: 'CompletedLoad' }>['value'],
    typeof City.Type
  >
>
export type EmittedBlockRetainsRequirement = Assert<
  Equal<
    Layer.Services<typeof LoaderBlock.EffectsLayer>,
    Layer.Success<typeof StatusClientLayer>
  >
>
export type EmittedCallerBlockRetainsRequirement = Assert<
  Equal<Layer.Services<typeof CityBlock.EffectsLayer>, CityClient>
>

export const CityClientLayer = Layer.succeed(CityClient, {
  load: Effect.succeed(City.make('London')),
})

export const ProvidedCityEffectsLayer = Layer.provide(
  CityBlock.EffectsLayer,
  CityClientLayer,
)

export type EmittedCallerProviderClosesRequirement = Assert<
  Equal<Layer.Services<typeof ProvidedCityEffectsLayer>, never>
>

export const verifyCityProviderRequirements = () => {
  // @ts-expect-error The factory's caller must provide the concrete CityClient.
  Effect.runFork(Layer.launch(CityBlock.EffectsLayer))
  Effect.runFork(Layer.launch(ProvidedCityEffectsLayer))
}
