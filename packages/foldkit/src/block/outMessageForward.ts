import { Predicate } from 'effect'

import type { AnyBlock } from './definition.js'
import {
  assertChildOutMessageHandlers,
  assertOutMessageHandlerRecord,
  registerOutMessageHandler,
} from './outMessageHandlers.js'
import type { OutMessageHelperEvidence } from './outMessageHelperEvidence.js'

type ChildOutMessageTypes = Readonly<{
  OutMessage: Readonly<{ Type: Readonly<{ _tag: string }> }>
}>

type ContextualChild<ChildOutMessage> = Readonly<{
  OutMessage: Readonly<{ Type: ChildOutMessage }>
}>

type AnyFunction = (...args: ReadonlyArray<any>) => any

type ChildOutMessageContract = AnyBlock &
  Readonly<{
    OutMessage: Readonly<{
      Type: Readonly<{ _tag: string }>
      match: AnyFunction
    }>
  }>

type ChildOutMessage<Child extends ChildOutMessageTypes> =
  Child['OutMessage']['Type']

type OutMessageTag<Child extends ChildOutMessageTypes> =
  ChildOutMessage<Child> extends Readonly<{
    _tag: infer Tag extends string
  }>
    ? Tag
    : never

/** @internal The canonical exhaustive forward callback record. */
export type OutMessageForwardCases<
  ParentOutMessage,
  Child extends ChildOutMessageTypes,
> = {
  readonly [Tag in OutMessageTag<Child>]: (
    outMessage: Extract<ChildOutMessage<Child>, { readonly _tag: Tag }>,
  ) => NoInfer<ParentOutMessage> | undefined
}

type CaseOutput<Case> = Case extends AnyFunction ? ReturnType<Case> : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

/** @internal Rejects erased or open child OutMessage payload contracts. */
export type ValidateChild<Child extends ChildOutMessageTypes> =
  IsAny<Child> extends true
    ? never
    : IsAny<ChildOutMessage<Child>> extends true
      ? never
      : IsUnknown<ChildOutMessage<Child>> extends true
        ? never
        : string extends OutMessageTag<Child>
          ? never
          : unknown

type ValidateCaseOutput<ParentOutMessage, Output> =
  IsAny<Output> extends true
    ? never
    : IsUnknown<Output> extends true
      ? never
      : [Output] extends [never]
        ? never
        : [Exclude<Output, ParentOutMessage | undefined>] extends [never]
          ? unknown
          : never

type InvalidCaseTags<ParentOutMessage, Cases> = {
  [Tag in keyof Cases]: ValidateCaseOutput<
    ParentOutMessage,
    CaseOutput<Cases[Tag]>
  > extends never
    ? Tag
    : never
}[keyof Cases]

type ForwardedOutMessage<Cases> = Exclude<
  {
    [Tag in keyof Cases]: CaseOutput<Cases[Tag]>
  }[keyof Cases],
  undefined
>

type InvalidCaseKeys<
  ParentOutMessage,
  Child extends ChildOutMessageTypes,
  Cases,
> =
  | InvalidCaseTags<ParentOutMessage, Cases>
  | Exclude<keyof Cases, OutMessageTag<Child>>

/** @internal Rejects undeclared branches and incompatible parent OutMessages. */
export type CaseValidation<
  ParentOutMessage,
  Child extends ChildOutMessageTypes,
  Cases,
> = [InvalidCaseKeys<ParentOutMessage, Child, Cases>] extends [never]
  ? unknown
  : Readonly<Record<InvalidCaseKeys<ParentOutMessage, Child, Cases>, never>>

/** @internal Requires at least one actual parent OutMessage forwarding branch. */
export type ValidateForwardedCases<Cases> = [
  ForwardedOutMessage<Cases>,
] extends [never]
  ? readonly [
      error: 'At least one child OutMessage variant must forward a parent OutMessage',
    ]
  : readonly []

/** An exhaustive child OutMessage forward authored against its owning Definition. */
export interface OutMessageForward<
  ChildOutMessage,
  ParentOutMessage,
> extends OutMessageHelperEvidence<ChildOutMessage, 'forward'> {
  (outMessage: ChildOutMessage): ParentOutMessage | undefined
}

/**
 * Authors an exhaustive child OutMessage mapper against the owning Definition's
 * declared parent OutMessage contract. Each named handler forwards one parent
 * OutMessage or returns `undefined` for that child variant.
 *
 * Inside `Binding.withOutMessagePolicy`, omit the child Block; the Binding
 * supplies its refined OutMessage payloads. Pass the completed child Block when
 * extracting a forward. At least one handler must forward a parent OutMessage.
 */
export interface MakeOutMessageForward<ParentOutMessage> {
  /**
   * Authors handlers inline where a child Binding supplies the child
   * OutMessage contract contextually.
   *
   * @param cases One named handler for every child OutMessage variant.
   */
  <
    const ChildOutMessage extends Readonly<{ _tag: string }>,
    const Cases extends OutMessageForwardCases<
      ParentOutMessage,
      ContextualChild<ChildOutMessage>
    >,
  >(
    cases: Cases &
      ValidateChild<ContextualChild<ChildOutMessage>> &
      CaseValidation<
        ParentOutMessage,
        ContextualChild<ChildOutMessage>,
        NoInfer<Cases>
      >,
    ...validation: ValidateForwardedCases<Cases>
  ): OutMessageForward<ChildOutMessage, ParentOutMessage>

  /**
   * @param child The completed child Block whose OutMessages are forwarded.
   * @param cases One named handler for every child OutMessage variant.
   */
  <
    const Child extends ChildOutMessageContract,
    const Cases extends OutMessageForwardCases<ParentOutMessage, Child>,
  >(
    child: Child & ValidateChild<Child>,
    cases: Cases & CaseValidation<ParentOutMessage, Child, NoInfer<Cases>>,
    ...validation: ValidateForwardedCases<Cases>
  ): OutMessageForward<ChildOutMessage<Child>, ParentOutMessage>
}

/** @internal Creates a Definition-owned OutMessage forward authoring helper. */
export function makeOutMessageForward(): MakeOutMessageForward<any>
export function makeOutMessageForward(): AnyFunction {
  return (...input: ReadonlyArray<unknown>) => {
    const [childOrCases, providedCases] = input
    const isContextual = input.length === 1
    const cases = isContextual ? childOrCases : providedCases

    if (isContextual) {
      assertOutMessageHandlerRecord(cases, 'makeOutMessageForward')
    } else {
      assertChildOutMessageHandlers(
        childOrCases,
        cases,
        'makeOutMessageForward',
      )
    }

    const handler = (outMessage: Readonly<{ _tag: string }>) => {
      const handle = Reflect.get(cases, outMessage._tag)
      if (
        !Object.hasOwn(cases, outMessage._tag) ||
        !Predicate.isFunction(handle)
      ) {
        throw new Error(
          `[foldkit] Definition.makeOutMessageForward has no handler for child OutMessage "${outMessage._tag}".`,
        )
      }

      return handle(outMessage)
    }

    registerOutMessageHandler(
      handler,
      isContextual ? undefined : childOrCases,
      cases,
      'makeOutMessageForward',
    )

    return handler
  }
}
