/** @internal Carries contextual arguments without inferring result channels. */
export type StepContextHint<Context extends ReadonlyArray<unknown>> =
  Context extends readonly [unknown, ...ReadonlyArray<unknown>]
    ? Readonly<{ __blockStepContext?: (...context: Context) => void }>
    : unknown

type AnyFunction = (...args: ReadonlyArray<any>) => any

type IsAny<Value> = 0 extends 1 & Value ? true : false

type ModelParameter<Producer extends AnyFunction> = Parameters<Producer>[0]

type MessageParameter<
  Producer extends AnyFunction,
  Position extends 0 | 1,
> = Parameters<Producer>[Position]

type MessageCandidate<OwnerMessage, ExactMessage, DeclaredMessage> =
  DeclaredMessage extends Readonly<{
    _tag: infer Tag
  }>
    ? Extract<Extract<OwnerMessage, Readonly<{ _tag: Tag }>>, ExactMessage>
    : never

type InvalidModelCallback<
  Model,
  Producer extends AnyFunction,
> = Parameters<Producer>['length'] extends 0
  ? never
  : IsAny<ModelParameter<Producer>> extends true
    ? ModelParameter<Producer>
    : [Model] extends [ModelParameter<Producer>]
      ? never
      : ModelParameter<Producer>

type InvalidMessageCallback<
  OwnerMessage,
  ExactMessage,
  Producer extends AnyFunction,
  Position extends 0 | 1,
> =
  IsAny<MessageParameter<Producer, Position>> extends true
    ? MessageParameter<Producer, Position>
    : FocusedMessageOf<
          OwnerMessage,
          ExactMessage,
          Producer,
          Position
        > extends infer Candidate
      ? [Candidate] extends [never]
        ? MessageParameter<Producer, Position>
        : [Candidate] extends [MessageParameter<Producer, Position>]
          ? never
          : MessageParameter<Producer, Position>
      : never

/** @internal Supplies contextual callback parameters while final validation
 * retains the ordinary contravariant Model and Message contract. */
export type ContextualModelMessageProducer<Model, Message, Output> = {
  bivarianceHack(model: Model, message: Message): Output
}['bivarianceHack']

/** @internal Supplies a contextual Message-only callback parameter while final
 * validation retains the ordinary contravariant Message contract. */
export type ContextualMessageProducer<Message, Output> = {
  bivarianceHack(message: Message): Output
}['bivarianceHack']

/** @internal Resolves an annotated callback's tag back to the complete owning
 * Message variant instead of retaining an unsafe payload refinement. */
export type FocusedMessageOf<
  OwnerMessage,
  ExactMessage,
  Producer extends AnyFunction,
  Position extends 0 | 1,
> =
  IsAny<MessageParameter<Producer, Position>> extends true
    ? never
    : MessageCandidate<
        OwnerMessage,
        ExactMessage,
        MessageParameter<Producer, Position>
      >

/** @internal Validates ordinary producer callback inputs after contextual
 * inference, rejecting narrowed or erased Model and Message parameters. */
export type ValidateModelMessageProducer<
  Model,
  OwnerMessage,
  ExactMessage,
  Producer extends AnyFunction,
> =
  InvalidModelCallback<Model, Producer> extends infer InvalidModel
    ? InvalidMessageCallback<
        OwnerMessage,
        ExactMessage,
        Producer,
        1
      > extends infer InvalidMessage
      ? ([InvalidModel] extends [never]
          ? unknown
          : Readonly<{
              'A focused Step callback must accept the owning Model': InvalidModel
            }>) &
          (IsAny<ExactMessage> extends true
            ? unknown
            : [ExactMessage] extends [never]
              ? unknown
              : Parameters<Producer>['length'] extends 0 | 1
                ? unknown
                : [InvalidMessage] extends [never]
                  ? unknown
                  : Readonly<{
                      'A focused Step callback must accept its complete Message variant': InvalidMessage
                    }>)
      : never
    : never

/** @internal Validates Message-only producer callback inputs after contextual
 * inference, rejecting narrowed or erased Message parameters. */
export type ValidateMessageProducer<
  OwnerMessage,
  ExactMessage,
  Producer extends AnyFunction,
> = Parameters<Producer>['length'] extends 0
  ? unknown
  : InvalidMessageCallback<
        OwnerMessage,
        ExactMessage,
        Producer,
        0
      > extends infer InvalidMessage
    ? [InvalidMessage] extends [never]
      ? unknown
      : Readonly<{
          'A focused Step callback must accept its complete Message variant': InvalidMessage
        }>
    : never

/** @internal Requires a diagnostic rest argument only when focused callback or
 * output validation reports an error. */
export type FocusedStepValidation<Validation> = unknown extends Validation
  ? readonly []
  : readonly [error: Validation]
