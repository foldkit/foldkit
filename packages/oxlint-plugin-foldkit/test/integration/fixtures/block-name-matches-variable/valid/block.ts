import { Effect, Layer, Schema } from 'effect'
import { Block, Block as AliasedBlock } from 'foldkit'
import * as Foldkit from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ ClickedIncrement: {} })

export class Counter extends Block<Counter>()('Counter', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message,
}) {}

export const CounterLive = Counter.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },
      update: {
        ClickedIncrement: model => ({ model: { count: model.count + 1 } }),
      },
    }
  }),
)

export class Badge extends AliasedBlock<Badge, { readonly label: string }>()(
  'Badge',
  {},
) {}

export const BadgeLive = Badge.make(
  Effect.fn(function* () {
    return {}
  }),
).pipe(Layer.provide(CounterLive))

export class Panel extends Foldkit.Block<Panel>()('Panel', {}) {}

export const PanelLive = Panel.make(
  Effect.fn(function* () {
    return {}
  }),
)

export interface Tabs<Value> {
  readonly value?: Value
}

export const makeTabs = <Value>() => {
  const TabsClass = Block<Tabs<Value>>()('Tabs', {})
  const TabsLive = TabsClass.make(
    Effect.fn(function* () {
      return {}
    }),
  )
  return Object.assign(TabsClass, { Live: TabsLive })
}

const blockName = 'Dynamic'

export class DynamicName extends Block<DynamicName>()(blockName, {}) {}

const registry = {
  make: (build: unknown) => build,
}

export const unrelated = registry.make(() => ({}))

export class Unrelated extends Object {}
