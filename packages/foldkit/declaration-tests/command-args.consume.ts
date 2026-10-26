import { Array, Option } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import {
  Choose,
  Defaulted,
  type ErasedDefinition,
  Paint,
  Ping,
  type QualifiedPending,
  parentPending,
} from './command-args.accepted.js'
import {
  extractPaintArgs,
  resolveScenePaint,
  resolveStoryPaint,
} from './command-args.helper.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const inspectRelocated = () => {
  const maybeArgs = Scene.Command.argsOf(Paint)(parentPending)
  if (Option.isSome(maybeArgs)) {
    const generation: number = maybeArgs.value.generation
    const effect: QualifiedPending['effect'] = parentPending.effect
    const key: 'retained-key' = parentPending.key
    const interruptsKey: 'retained-interrupt-key' = parentPending.interruptsKey
    const detail: 'retained-detail' = parentPending.detail
    return { generation, effect, key, interruptsKey, detail }
  }
  return undefined
}
export const inspectRefined = (metadata: Story.AnyCommand) =>
  Story.Command.argsOf(Choose)(metadata)
export const inspectDefaulted = (metadata: Scene.AnyCommand) =>
  Scene.Command.argsOf(Defaulted)(metadata)
export const inspectArgless = (metadata: Story.AnyCommand) =>
  Story.Command.argsOf(Ping)(metadata)
export const inspectArglessInterrupt = (metadata: Scene.AnyCommand) =>
  Scene.Command.argsOf(Ping.Interrupt)(metadata)
export const inspectErased = (
  definition: ErasedDefinition,
  metadata: Story.AnyCommand,
) => Story.Command.argsOf(definition)(metadata)
export const inspectUnion = (
  definition: typeof Paint | typeof Ping,
  metadata: Scene.AnyCommand,
) => Scene.Command.argsOf(definition)(metadata)
export const selectAll = (commands: ReadonlyArray<Story.AnyCommand>) =>
  Array.getSomes(Array.map(commands, Story.Command.argsOf(Paint)))

export declare const storySimulation: Story.StorySimulation<
  { count: number },
  'ParentMessage',
  'Saved'
>
export declare const sceneSimulation: Scene.SceneSimulation<
  { count: number },
  'ParentMessage',
  'Saved'
>
export const resolvedStory = resolveStoryPaint(storySimulation.commands)(
  storySimulation,
)
export const resolvedScene = resolveScenePaint(sceneSimulation.commands)(
  sceneSimulation,
)
export const extracted = extractPaintArgs(storySimulation.commands)
export type StoryChannelsRetained = Expect<
  Equal<typeof resolvedStory, typeof storySimulation>
>
export type SceneChannelsRetained = Expect<
  Equal<typeof resolvedScene, typeof sceneSimulation>
>
export type ExactExtractedArgs = Expect<
  Equal<typeof extracted, Array<Readonly<{ generation: number }>>>
>
export type EffectRetained = Expect<
  Equal<
    NonNullable<ReturnType<typeof inspectRelocated>>['effect'],
    QualifiedPending['effect']
  >
>
export type ArglessStaysUndefined = Expect<
  Equal<ReturnType<typeof inspectArgless>, Option.Option<undefined>>
>
export type ArglessInterruptStaysUndefined = Expect<
  Equal<ReturnType<typeof inspectArglessInterrupt>, Option.Option<undefined>>
>
export type RefinedStaysExact = Expect<
  Equal<
    Option.Option.Value<ReturnType<typeof inspectRefined>>['value'],
    'Alpha' | 'Beta'
  >
>
export type DefaultedStaysExact = Expect<
  Equal<
    Option.Option.Value<ReturnType<typeof inspectDefaulted>>['generation'],
    number
  >
>
export type ErasedStaysUnknown = Expect<
  Equal<
    ReturnType<typeof inspectErased>,
    Option.Option<Record<string, unknown> | undefined>
  >
>
export type UnionStaysDistributed = Expect<
  Equal<
    ReturnType<typeof inspectUnion>,
    Option.Option<Readonly<{ generation: number }> | undefined>
  >
>
