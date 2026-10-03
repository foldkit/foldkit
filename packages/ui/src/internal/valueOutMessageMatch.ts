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

/** Retypes a module-level `OutMessage.match` so its handlers see one bundle's
 *  `Value`. The runtime function is unchanged. */
export const bindValueOutMessageMatch = <OutMessage extends TaggedOutMessage>(
  match: unknown,
): ValueOutMessageMatch<OutMessage> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  match as unknown as ValueOutMessageMatch<OutMessage>
