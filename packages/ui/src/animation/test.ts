import { Array, Option, Predicate, Schema } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import { Message } from './schema.js'
import { WaitForAnimationSettled, WaitForPaint } from './update.js'

type Simulation<Model, Message, OutMessage> =
  | Story.StorySimulation<Model, Message, OutMessage>
  | Scene.SceneSimulation<Model, Message, OutMessage>

/** A simulation transform accepted by both Story and Scene. */
export type Step = {
  <Model, Message, OutMessage>(
    simulation: Scene.SceneSimulation<Model, Message, OutMessage>,
  ): Scene.SceneSimulation<Model, Message, OutMessage>
  <Model, Message, OutMessage>(
    simulation: Story.StorySimulation<Model, Message, OutMessage>,
  ): Story.StorySimulation<Model, Message, OutMessage>
}

/** A Story or Scene step that reads a pending Animation Command's arguments.
 * Each entry resolves one dispatch when passed to {@link resolveAll}. */
type GenerationResolver = Readonly<{
  commandName: string
  toResolver: (command: Story.AnyCommand) => Story.Resolver
}>

/** A generation-aware step that can also be passed to resolveAll. */
export type GenerationStep = Step & GenerationResolver

type CheckedEntry<Entry> = Entry extends GenerationStep
  ? GenerationStep
  : Entry extends readonly [infer Matcher extends Story.Resolver[0], unknown]
    ? Story.Resolver<Matcher>
    : never

const PaintArgs = Schema.Struct({ generation: Schema.Number })
const SettledArgs = Schema.Struct({
  id: Schema.String,
  generation: Schema.Number,
})

const formatCommand = ({ name, args }: Story.AnyCommand): string =>
  args === undefined ? name : `${name} ${JSON.stringify(args)}`

const pendingCommands = (commands: ReadonlyArray<Story.AnyCommand>): string =>
  Array.match(commands, {
    onEmpty: () => '    (none)',
    onNonEmpty: commands => commands.map(formatCommand).join('\n'),
  })

const resolveCommands = <Model, Message, OutMessage>(
  simulation: Simulation<Model, Message, OutMessage>,
  ...resolvers: ReadonlyArray<Story.Resolver>
): Simulation<Model, Message, OutMessage> => {
  if ('html' in simulation) {
    return Scene.Command.resolveAll(...resolvers)(simulation)
  } else {
    return Story.Command.resolveAll(...resolvers)(simulation)
  }
}

const isGenerationStep = (
  entry: GenerationResolver | Story.Resolver,
): entry is GenerationResolver => Predicate.hasProperty(entry, 'commandName')

const createStep = (
  entries: ReadonlyArray<GenerationResolver | Story.Resolver>,
  strictCommandName?: string,
): Step => {
  function step<Model, Message, OutMessage>(
    simulation: Scene.SceneSimulation<Model, Message, OutMessage>,
  ): Scene.SceneSimulation<Model, Message, OutMessage>
  function step<Model, Message, OutMessage>(
    simulation: Story.StorySimulation<Model, Message, OutMessage>,
  ): Story.StorySimulation<Model, Message, OutMessage>
  function step<Model, Message, OutMessage>(
    simulation: Simulation<Model, Message, OutMessage>,
  ): Simulation<Model, Message, OutMessage> {
    const maybeInitialCommand = Option.map(
      Array.findFirstWithIndex(
        simulation.commands,
        command => command.name === strictCommandName,
      ),
      ([command, index]) => ({ command: { ...command }, index }),
    )

    if (strictCommandName !== undefined && Option.isNone(maybeInitialCommand)) {
      throw new Error(
        `I tried to resolve "${strictCommandName}" but no matching pending Animation Command was found.\n\n` +
          `Pending Commands:\n${pendingCommands(simulation.commands)}\n\n` +
          'Make sure the previous Message produced this Command.',
      )
    }

    const generationSteps = entries.filter(isGenerationStep)
    const resolvers = entries.filter(
      (entry): entry is Story.Resolver => !isGenerationStep(entry),
    )
    let remaining = generationSteps
    const initialSimulation = Option.match(maybeInitialCommand, {
      onNone: () => simulation,
      onSome: ({ command, index }) => ({
        ...simulation,
        commands: Array.map(simulation.commands, (pending, pendingIndex) =>
          pendingIndex === index ? command : pending,
        ),
      }),
    })
    let current = resolveCommands(initialSimulation, ...resolvers)

    if (
      Option.isSome(maybeInitialCommand) &&
      !current.commands.includes(maybeInitialCommand.value.command)
    ) {
      return current
    }

    for (let depth = 0; depth < generationSteps.length; depth++) {
      const maybeMatch = Array.findFirst(current.commands, command =>
        Option.map(
          Array.findFirstWithIndex(
            remaining,
            entry => entry.commandName === command.name,
          ),
          ([entry, index]) => ({ command, entry, index }),
        ),
      )

      if (Option.isNone(maybeMatch)) {
        break
      }

      const { command, entry, index } = maybeMatch.value
      remaining = Array.remove(remaining, index)
      current = resolveCommands(current, entry.toResolver(command))
    }

    return current
  }

  return step
}

const generationStep = (
  commandName: string,
  toResolver: (command: Story.AnyCommand) => Story.Resolver,
): GenerationStep =>
  Object.assign(createStep([{ commandName, toResolver }], commandName), {
    commandName,
    toResolver,
  })

/** Resolves the first pending `WaitForPaint` with its captured generation.
 * Carried ordinary resolvers run first. Throws with the pending Commands when
 * no paint Command exists at the start of the step. */
export const paint: GenerationStep = generationStep(
  WaitForPaint.name,
  command => {
    if (!Schema.is(PaintArgs)(command.args)) {
      throw new Error(
        `Animation.test.paint expected a numeric generation: ${formatCommand(command)}.`,
      )
    }

    return [
      WaitForPaint(command.args),
      Message.CompletedWaitForPaint(command.args),
    ]
  },
)

/** Resolves the first pending `WaitForAnimationSettled` with its captured
 * generation. Carried ordinary resolvers run first. Throws with the pending
 * Commands when no settlement Command exists at the start of the step. */
export const settled: GenerationStep = generationStep(
  WaitForAnimationSettled.name,
  command => {
    if (!Schema.is(SettledArgs)(command.args)) {
      throw new Error(
        `Animation.test.settled expected an id and numeric generation: ${formatCommand(command)}.`,
      )
    }

    return [
      WaitForAnimationSettled(command.args),
      Message.EndedAnimation({ generation: command.args.generation }),
    ]
  },
)

/** Resolves ordinary Command resolvers, then consumes generation steps as
 * their Commands become pending. Each generation entry resolves one dispatch;
 * unmatched generation entries are skipped and do not carry to later calls.
 * Ordinary resolvers retain Story and Scene's cascade and carry behavior. */
export const resolveAll = <
  Entries extends ReadonlyArray<GenerationStep | Story.Resolver>,
>(
  ...entries: Entries & {
    [K in keyof Entries]: CheckedEntry<Entries[K]>
  }
): Step => createStep(entries)
