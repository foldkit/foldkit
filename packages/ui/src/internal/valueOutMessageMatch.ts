type TaggedOutMessage<Tag extends string = string> = Readonly<{
  readonly _tag: Tag
}>

type OutMessageTags<OutMessage> =
  OutMessage extends TaggedOutMessage<infer Tag> ? Tag : never

type MatchCases<OutMessage, Output> = {
  readonly [Tag in OutMessageTags<OutMessage>]: (
    outMessage: Extract<OutMessage, TaggedOutMessage<Tag>>,
  ) => Output
}

type ValidateMatchCases<OutMessage, Cases> = {
  readonly [Tag in Exclude<keyof Cases, OutMessageTags<OutMessage>>]: never
}

type MatchCaseReturns<Cases> = {
  [Tag in keyof Cases]-?: Cases[Tag] extends (...args: never) => infer Output
    ? Output
    : never
}[keyof Cases]

/** Exhaustive `match` for a bundle's Value-typed OutMessage. Pass the result
 *  type, usually `Update.Step<Model, Message>`. Each handler receives the
 *  bundle's `Value`. With no result type argument, `match` returns the union
 *  of the handler results. */
export type ValueOutMessageMatch<OutMessage extends TaggedOutMessage> = {
  <const Cases extends MatchCases<OutMessage, unknown>>(
    outMessage: OutMessage,
    cases: Cases & ValidateMatchCases<OutMessage, Cases>,
  ): MatchCaseReturns<Cases>
  <const Cases extends MatchCases<OutMessage, unknown>>(
    cases: Cases & ValidateMatchCases<OutMessage, Cases>,
  ): (outMessage: OutMessage) => MatchCaseReturns<Cases>
  <Output>(
    cases: MatchCases<OutMessage, Output>,
  ): (outMessage: OutMessage) => Output
  <Output>(
    outMessage: OutMessage,
    cases: MatchCases<OutMessage, Output>,
  ): Output
}

type DirectMatch<OutMessage extends TaggedOutMessage> = <Output>(
  outMessage: OutMessage,
  cases: MatchCases<OutMessage, Output>,
) => Output

const isOutMessage = <OutMessage extends TaggedOutMessage>(
  value: OutMessage | MatchCases<OutMessage, unknown>,
): value is OutMessage => '_tag' in value

/** Returns a `match` whose handlers see one bundle's `Value`. `match` is the
 *  module-level `OutMessage.match`; each call is forwarded to it. */
export const bindValueOutMessageMatch = <OutMessage extends TaggedOutMessage>(
  match: DirectMatch<OutMessage>,
): ValueOutMessageMatch<OutMessage> => {
  function bound<const Cases extends MatchCases<OutMessage, unknown>>(
    outMessage: OutMessage,
    cases: Cases & ValidateMatchCases<OutMessage, Cases>,
  ): MatchCaseReturns<Cases>
  function bound<const Cases extends MatchCases<OutMessage, unknown>>(
    cases: Cases & ValidateMatchCases<OutMessage, Cases>,
  ): (outMessage: OutMessage) => MatchCaseReturns<Cases>
  function bound<Output>(
    cases: MatchCases<OutMessage, Output>,
  ): (outMessage: OutMessage) => Output
  function bound<Output>(
    outMessage: OutMessage,
    cases: MatchCases<OutMessage, Output>,
  ): Output
  function bound(
    first: OutMessage | MatchCases<OutMessage, unknown>,
    second?: MatchCases<OutMessage, unknown>,
  ): unknown {
    if (!isOutMessage(first)) {
      return (outMessage: OutMessage) => match(outMessage, first)
    }

    if (second === undefined) {
      throw new Error('OutMessage.match expected the variant handlers')
    }

    return match(first, second)
  }

  return bound
}
