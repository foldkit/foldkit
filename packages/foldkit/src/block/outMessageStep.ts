import type {
  ContextualMessageProducer,
  ContextualModelMessageProducer,
  FocusedMessageOf,
  FocusedStepValidation,
  ValidateMessageProducer,
  ValidateModelMessageProducer,
} from './focusedStep.js'

/**
 * A Step that returns the identical incoming Model and the supplied OutMessage,
 * retaining their exact types without Commands or Service requirements.
 */
export type OutMessageStep<Model, OutMessage> = <Current extends Model>(
  model: Current,
) => Readonly<{ model: Current; outMessage: OutMessage; commands?: never }>

type OutMessageHandler<Model, Message, OutMessage> = <Current extends Model>(
  model: Current,
  message: Message,
) => Readonly<{ model: Current; outMessage: OutMessage; commands?: never }>

type OutMessageProducer<Model, Message, OutMessage> = (
  model: Model,
  message: Message,
) => OutMessage

type FocusedOutMessageStep<
  Model,
  OwnerMessage,
  ExactMessage,
  Producer extends OutMessageProducer<Model, ExactMessage, unknown>,
> = [OwnerMessage] extends [never]
  ? OutMessageStep<Model, ReturnType<Producer>>
  : Parameters<NoInfer<Producer>>['length'] extends 0 | 1
    ? OutMessageStep<Model, ReturnType<Producer>>
    : OutMessageHandler<
        Model,
        FocusedMessageOf<OwnerMessage, ExactMessage, Producer, 1>,
        ReturnType<Producer>
      >

type MessageOnlyOutMessageHandler<
  Model,
  OwnerMessage,
  ExactMessage,
  Producer extends (...args: ReadonlyArray<never>) => unknown,
> = OutMessageHandler<
  Model,
  Parameters<Producer>['length'] extends 0
    ? ExactMessage
    : FocusedMessageOf<OwnerMessage, ExactMessage, Producer, 0>,
  ReturnType<Producer>
>

type ValidateOutMessageOutput<
  OutMessage,
  Producer extends (...args: ReadonlyArray<never>) => unknown,
> = 0 extends 1 & ReturnType<Producer>
  ? Readonly<{ 'OutMessage callbacks cannot return any': never }>
  : [ReturnType<Producer>] extends [never]
    ? Readonly<{ 'OutMessage callbacks cannot return never': never }>
    : [ReturnType<Producer>] extends [OutMessage]
      ? unknown
      : Readonly<{
          'OutMessage callbacks must return the owning OutMessage': ReturnType<Producer>
        }>

/**
 * Creates a Step that preserves the incoming Model and emits the callback's
 * value from the owning Block's declared OutMessage contract. The callback
 * receives the current Model and, in a `makeUpdate` handler, that entry's exact
 * Message. `.fromMessage` omits the Model parameter. Zero-argument and
 * Model-only callbacks produce reusable unary Steps. Construction is passive.
 *
 * Use `Update.withOutMessage` to attach an OutMessage to an existing plain
 * result, preserving its Model and Commands, or when the OutMessage may be
 * undefined.
 */
interface FocusedMakeOutMessageStep<Model, Message, OutMessage> {
  <
    const ProducedOutMessage extends OutMessage,
    ExactMessage extends Message,
    const Producer extends ContextualModelMessageProducer<
      Model,
      ExactMessage,
      ProducedOutMessage
    >,
  >(
    toOutMessage: Producer,
    ...validation: FocusedStepValidation<
      ValidateOutMessageOutput<OutMessage, NoInfer<Producer>> &
        ValidateModelMessageProducer<
          Model,
          Message,
          ExactMessage,
          NoInfer<Producer>
        >
    >
  ): FocusedOutMessageStep<Model, Message, ExactMessage, Producer>

  readonly fromMessage: <
    const ProducedOutMessage extends OutMessage,
    ExactMessage extends Message,
    const Producer extends ContextualMessageProducer<
      ExactMessage,
      ProducedOutMessage
    >,
  >(
    toOutMessage: Producer,
    ...validation: FocusedStepValidation<
      ValidateOutMessageOutput<OutMessage, NoInfer<Producer>> &
        ValidateMessageProducer<Message, ExactMessage, NoInfer<Producer>>
    >
  ) => MessageOnlyOutMessageHandler<Model, Message, ExactMessage, Producer>
}

interface MessageFreeMakeOutMessageStep<Model, OutMessage> {
  <
    const ProducedOutMessage extends OutMessage,
    const Producer extends (model: Model) => ProducedOutMessage,
  >(
    toOutMessage: Producer,
    ...validation: FocusedStepValidation<
      ValidateOutMessageOutput<OutMessage, NoInfer<Producer>> &
        ValidateModelMessageProducer<Model, never, never, NoInfer<Producer>>
    >
  ): OutMessageStep<Model, ReturnType<Producer>>

  readonly fromMessage: FocusedMakeOutMessageStep<
    Model,
    never,
    OutMessage
  >['fromMessage']
}

/** The focused OutMessage Step producer owned by a Definition. */
export type MakeOutMessageStep<Model, Message, OutMessage> = [Message] extends [
  never,
]
  ? MessageFreeMakeOutMessageStep<Model, OutMessage>
  : FocusedMakeOutMessageStep<Model, Message, OutMessage>

/** @internal Creates the OutMessage-only Step authoring helper. */
export function makeOutMessageStep<
  Model,
  Message,
  OutMessage,
>(): MakeOutMessageStep<Model, Message, OutMessage>
export function makeOutMessageStep(): unknown {
  function outMessageStep(
    toOutMessage: (model: unknown, message: unknown) => unknown,
  ): unknown {
    return (model: unknown, message: unknown) => ({
      model,
      outMessage: toOutMessage(model, message),
    })
  }

  const fromMessage =
    (toOutMessage: (message: unknown) => unknown) =>
    (model: unknown, message: unknown) => ({
      model,
      outMessage: toOutMessage(message),
    })

  return Object.assign(outMessageStep, { fromMessage })
}
