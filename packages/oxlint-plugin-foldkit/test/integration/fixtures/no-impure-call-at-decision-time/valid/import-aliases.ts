import { Effect as Fx } from 'effect'
import * as EffectApi from 'effect/Effect'
import { Command as C } from 'foldkit'
import * as CommandApi from 'foldkit/command'
import * as MountApi from 'foldkit/mount'

export const firstEffect = Fx.sync(() => Date.now())
export const secondEffect = EffectApi.sync(() => Math.random())

export const FirstCommand = C.define('FirstCommand', {
  messages: [CompletedFirstCommand],
  execute: () => Fx.succeed(CompletedFirstCommand({ timestamp: Date.now() })),
})

export const SecondCommand = CommandApi.define('SecondCommand', {
  messages: [CompletedSecondCommand],
  execute: () =>
    Fx.succeed(CompletedSecondCommand({ id: crypto.randomUUID() })),
})

export const Measure = MountApi.define('Measure', {
  messages: [CompletedMeasure],
  execute: () => Fx.succeed(CompletedMeasure({ now: performance.now() })),
})
