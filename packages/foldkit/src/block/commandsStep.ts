import type { Command } from '../command/index.js'
import type * as Update from '../update/update.js'
import type {
  ContextualMessageProducer,
  ContextualModelMessageProducer,
  FocusedMessageOf,
  FocusedStepValidation,
  ValidateMessageProducer,
  ValidateModelMessageProducer,
} from './focusedStep.js'

/**
 * A Model-preserving Step retaining its Command types and Binding graph
 * obligations, without an OutMessage.
 */
export type CommandsStep<
  Model,
  CommandValue extends Command<any, never, any>,
  Evidence,
> = (model: Update.GraphInput<Model, Evidence>) => Readonly<{
  model: Model
  outMessage?: never
  commands: ReadonlyArray<CommandValue> &
    ([Evidence] extends [never]
      ? unknown
      : Update.RegistrationEvidence<Evidence>)
}>

type CommandsHandler<
  Model,
  Message,
  CommandValue extends Command<any, never, any>,
  Evidence,
> = (
  model: Update.GraphInput<Model, Evidence>,
  message: Message,
) => Readonly<{
  model: Model
  outMessage?: never
  commands: ReadonlyArray<CommandValue> &
    ([Evidence] extends [never]
      ? unknown
      : Update.RegistrationEvidence<Evidence>)
}>

type FocusedCommandsStep<
  Model,
  OwnerMessage,
  ExactMessage,
  Producer extends (...args: ReadonlyArray<never>) => Update.Commands<any, any>,
> = [OwnerMessage] extends [never]
  ? CommandsStep<
      Model,
      ReturnType<Producer>[number],
      Update.ResultEvidenceChannelOf<ReturnType<Producer>>
    >
  : Parameters<NoInfer<Producer>>['length'] extends 0 | 1
    ? CommandsStep<
        Model,
        ReturnType<Producer>[number],
        Update.ResultEvidenceChannelOf<ReturnType<Producer>>
      >
    : CommandsHandler<
        Model,
        FocusedMessageOf<OwnerMessage, ExactMessage, Producer, 1>,
        ReturnType<Producer>[number],
        Update.ResultEvidenceChannelOf<ReturnType<Producer>>
      >

type MessageOnlyCommandsHandler<
  Model,
  OwnerMessage,
  ExactMessage,
  Producer extends (...args: ReadonlyArray<never>) => Update.Commands<any, any>,
> = CommandsHandler<
  Model,
  Parameters<Producer>['length'] extends 0
    ? ExactMessage
    : FocusedMessageOf<OwnerMessage, ExactMessage, Producer, 0>,
  ReturnType<Producer>[number],
  Update.ResultEvidenceChannelOf<ReturnType<Producer>>
>

type ValidateCommandsOutput<
  Producer extends (...args: ReadonlyArray<never>) => Update.Commands<any, any>,
> = 0 extends 1 & ReturnType<Producer>
  ? Readonly<{ 'Command callbacks cannot return any': never }>
  : [ReturnType<Producer>] extends [never]
    ? Readonly<{ 'Command callbacks cannot return never': never }>
    : Update.ValidateConcreteResultEvidence<ReturnType<Producer>>

/**
 * Creates a reusable Step that preserves the incoming Model and produces
 * Commands from it for Runtime execution. The callback receives the current
 * Model and, in a `makeUpdate` handler, that entry's exact Message.
 * `.fromMessage` omits the Model parameter. Zero-argument and Model-only
 * callbacks produce reusable unary Steps. Construction does not run the
 * callback, and applying the Step does not execute Effects.
 *
 * Result Messages must belong to the owning Block. Command types retain their
 * Service requirements and child Binding registration evidence.
 * Use the general Step helper when the transition also changes fields or
 * produces an OutMessage.
 */
interface FocusedMakeCommandsStep<Model, Message> {
  <
    ExactMessage extends Message,
    const Producer extends ContextualModelMessageProducer<
      Model,
      ExactMessage,
      Update.Commands<Message, any>
    >,
  >(
    toCommands: Producer,
    ...validation: FocusedStepValidation<
      ValidateCommandsOutput<NoInfer<Producer>> &
        ValidateModelMessageProducer<
          Model,
          Message,
          ExactMessage,
          NoInfer<Producer>
        >
    >
  ): FocusedCommandsStep<Model, Message, ExactMessage, Producer>

  readonly fromMessage: <
    ExactMessage extends Message,
    const Producer extends ContextualMessageProducer<
      ExactMessage,
      Update.Commands<Message, any>
    >,
  >(
    toCommands: Producer,
    ...validation: FocusedStepValidation<
      ValidateCommandsOutput<NoInfer<Producer>> &
        ValidateMessageProducer<Message, ExactMessage, NoInfer<Producer>>
    >
  ) => MessageOnlyCommandsHandler<Model, Message, ExactMessage, Producer>
}

interface MessageFreeMakeCommandsStep<Model> {
  <const Producer extends (model: Model) => Update.Commands<never, any>>(
    toCommands: Producer,
    ...validation: FocusedStepValidation<
      ValidateCommandsOutput<NoInfer<Producer>> &
        ValidateModelMessageProducer<Model, never, never, NoInfer<Producer>>
    >
  ): CommandsStep<
    Model,
    ReturnType<Producer>[number],
    Update.ResultEvidenceChannelOf<ReturnType<Producer>>
  >

  readonly fromMessage: FocusedMakeCommandsStep<Model, never>['fromMessage']
}

/** The focused Command Step producer owned by a Definition. */
export type MakeCommandsStep<Model, Message> = [Message] extends [never]
  ? MessageFreeMakeCommandsStep<Model>
  : FocusedMakeCommandsStep<Model, Message>

/** @internal Creates the Command-only Step authoring helper. */
export function makeCommandsStep<Model, Message>(): MakeCommandsStep<
  Model,
  Message
>
export function makeCommandsStep(): unknown {
  function commandsStep(
    toCommands: (model: unknown, message: unknown) => ReadonlyArray<unknown>,
  ): unknown {
    return (model: unknown, message: unknown) => ({
      model,
      commands: toCommands(model, message),
    })
  }

  const fromMessage =
    (toCommands: (message: unknown) => ReadonlyArray<unknown>) =>
    (model: unknown, message: unknown) => ({
      model,
      commands: toCommands(message),
    })

  return Object.assign(commandsStep, { fromMessage })
}
