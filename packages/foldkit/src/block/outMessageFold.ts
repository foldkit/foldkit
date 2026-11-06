import { Predicate } from 'effect'

import type * as Update from '../update/index.js'
import type { AnyBlock, ValidateDefinitionStepOutput } from './definition.js'
import {
  assertChildOutMessageHandlers,
  registerOutMessageHandler,
} from './outMessageHandlers.js'
import type { OutMessageHelperEvidence } from './outMessageHelperEvidence.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type ChildOutMessageContract = AnyBlock &
  Readonly<{
    Message: Readonly<{ Type: any }>
    OutMessage: Readonly<{
      Type: Readonly<{ _tag: string }>
      match: AnyFunction
    }>
  }>

type ChildMessage<Child extends ChildOutMessageContract> =
  Child['Message']['Type']

type ChildOutMessage<Child extends ChildOutMessageContract> =
  Child['OutMessage']['Type']

type OutMessageTag<Child extends ChildOutMessageContract> =
  ChildOutMessage<Child> extends Readonly<{
    _tag: infer Tag extends string
  }>
    ? Tag
    : never

type ContextualOutMessageStep<Model> = {
  bivarianceHack(
    model: Model,
  ):
    | Readonly<{ model: Model; commands?: unknown; outMessage?: unknown }>
    | Update.AnyResultRecipe
}['bivarianceHack']

export type OutMessageFoldCases<
  Model,
  Message,
  Child extends ChildOutMessageContract,
> = {
  readonly [Tag in OutMessageTag<Child>]: (
    outMessage: Extract<ChildOutMessage<Child>, { readonly _tag: Tag }>,
    context: Update.FoldContext<ChildMessage<Child>, Message, Model>,
  ) => NoInfer<ContextualOutMessageStep<Model>>
}

type CaseStep<Case> = Case extends AnyFunction ? ReturnType<Case> : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? unknown : never

type ValidateChild<Child extends ChildOutMessageContract> =
  IsAny<Child> extends true
    ? never
    : IsAny<ChildMessage<Child>> extends true
      ? never
      : IsAny<ChildOutMessage<Child>> extends true
        ? never
        : IsUnknown<ChildMessage<Child>> extends true
          ? never
          : IsUnknown<ChildOutMessage<Child>> extends true
            ? never
            : string extends OutMessageTag<Child>
              ? never
              : unknown

type ValidateCaseStepInputMember<Model, Step> = Step extends AnyFunction
  ? Parameters<Step> extends readonly [infer Input]
    ? IsAny<Input> extends true
      ? never
      : IsUnknown<Input> extends true
        ? never
        : Update.GraphRequirementOf<Step> extends infer GraphRequirements
          ? IsAny<GraphRequirements> extends true
            ? never
            : IsUnknown<GraphRequirements> extends true
              ? never
              : Equal<Update.GraphModelOf<Step>, Model> &
                  Equal<Input, Update.GraphInput<Model, GraphRequirements>>
          : never
    : never
  : never

type InvalidCaseStepInputMembers<Model, Step> = Step extends unknown
  ? ValidateCaseStepInputMember<Model, Step> extends never
    ? true
    : never
  : never

type ValidateCaseStepInput<Model, Step> =
  IsAny<Step> extends true
    ? never
    : IsUnknown<Step> extends true
      ? never
      : [Step] extends [never]
        ? never
        : [InvalidCaseStepInputMembers<Model, Step>] extends [never]
          ? unknown
          : never

type ValidateCommandCollection<Output> = 'commands' extends keyof Output
  ? Output extends Readonly<{ commands?: infer Commands }>
    ? IsAny<Commands> extends true
      ? never
      : IsUnknown<Commands> extends true
        ? never
        : Output extends Readonly<{
              commands?: Update.Commands<any, any> | undefined
            }>
          ? unknown
          : never
    : never
  : unknown

type InvalidDefinitionOutputMembers<Model, Message, OutMessage, Output> =
  IsAny<Output> extends true
    ? true
    : IsUnknown<Output> extends true
      ? true
      : [Output] extends [never]
        ? true
        : Output extends unknown
          ? Output extends AnyFunction
            ? true
            : Output extends
                  | Update.AnyResultRecipe
                  | Readonly<{ model: unknown }>
              ? ValidateDefinitionStepOutput<
                  Model,
                  Message,
                  OutMessage,
                  Output
                > &
                  ValidateCommandCollection<Output> extends infer Validation
                ? unknown extends Validation
                  ? never
                  : true
                : true
              : true
          : never

type InvalidCaseStepOutputMembers<Model, Message, OutMessage, Step> =
  Step extends AnyFunction
    ? InvalidDefinitionOutputMembers<
        Model,
        Message,
        OutMessage,
        ReturnType<Step>
      >
    : true

type ValidateCaseStepOutput<Model, Message, OutMessage, Step> =
  IsAny<Step> extends true
    ? never
    : IsUnknown<Step> extends true
      ? never
      : [Step] extends [never]
        ? never
        : [
              InvalidCaseStepOutputMembers<Model, Message, OutMessage, Step>,
            ] extends [never]
          ? unknown
          : never

type InvalidCaseTags<Model, Message, OutMessage, Cases> = {
  [Tag in keyof Cases]: ValidateCaseStepInput<Model, CaseStep<Cases[Tag]>> &
    ValidateCaseStepOutput<
      Model,
      Message,
      OutMessage,
      CaseStep<Cases[Tag]>
    > extends never
    ? Tag
    : never
}[keyof Cases]

type ValidateCases<
  Model,
  Message,
  OutMessage,
  Child extends ChildOutMessageContract,
  Cases,
> = [
  | InvalidCaseTags<Model, Message, OutMessage, Cases>
  | Exclude<keyof Cases, OutMessageTag<Child>>,
] extends [never]
  ? readonly []
  : readonly [
      error: Readonly<
        Record<
          | InvalidCaseTags<Model, Message, OutMessage, Cases>
          | Exclude<keyof Cases, OutMessageTag<Child>>,
          never
        >
      >,
    ]

export type CaseValidation<
  Model,
  Message,
  OutMessage,
  Child extends ChildOutMessageContract,
  Cases,
> =
  ValidateCases<Model, Message, OutMessage, Child, Cases> extends readonly [
    error: infer Error,
  ]
    ? Error
    : unknown

/** A parent Step inferred from one child OutMessage variant handler. */
export interface OutMessageFoldStep<Model, Output, GraphRequirements> {
  (
    model: Update.GraphInput<Model, GraphRequirements>,
  ): Output extends Update.AnyResultRecipe
    ? Output
    : Output extends Readonly<{ model: unknown }>
      ? Output &
          ('commands' extends keyof Output
            ? unknown
            : Readonly<{ commands?: never }>) &
          ('outMessage' extends keyof Output
            ? unknown
            : Readonly<{ outMessage?: never }>)
      : Output
}

export type DefinedCaseSteps<Model, Cases> = {
  [Tag in keyof Cases]: CaseStep<Cases[Tag]> extends infer Step extends
    AnyFunction
    ? OutMessageFoldStep<
        Model,
        ReturnType<Step>,
        Update.GraphRequirementOf<Step>
      >
    : never
}[keyof Cases]

type CasesUsingContext<Cases> = {
  [Tag in keyof Cases]: Cases[Tag] extends AnyFunction
    ? 2 extends Parameters<Cases[Tag]>['length']
      ? Tag
      : never
    : never
}[keyof Cases]

export type OutMessageFoldContext<
  Model,
  Message,
  Child extends ChildOutMessageContract,
  Cases,
> = [CasesUsingContext<Cases>] extends [never]
  ? readonly []
  : readonly [context: Update.FoldContext<ChildMessage<Child>, Message, Model>]

/** An exhaustive child OutMessage fold authored against its owning Definition. */
export interface OutMessageFold<
  ChildOutMessage,
  Step,
  Context extends ReadonlyArray<unknown>,
  ChildMessage = Context extends readonly [
    Update.FoldContext<infer ContextChildMessage, infer _ParentMessage, any>,
  ]
    ? ContextChildMessage
    : never,
> extends OutMessageHelperEvidence<ChildOutMessage, 'fold', ChildMessage> {
  (outMessage: ChildOutMessage, ...context: Context): Step
}

/**
 * Authors exhaustive child OutMessage handlers against the owning Definition's
 * Model, Message, and optional OutMessage contracts. Each handler returns a
 * parent Step; its Commands and connected Binding requirements remain inferred.
 *
 * Pass the completed child Block so refined OutMessage payloads and the child
 * Message type used by FoldContext remain available. The resulting fold
 * requires FoldContext only when a handler declares it.
 *
 * Keyed `Binding.withOutMessagePolicy` accepts the fold directly when handlers
 * do not use the occurrence key. Otherwise return it from `fold: key => ...`;
 * the Binding supplies the actual OutMessage and FoldContext during delivery.
 */
export interface MakeOutMessageFold<Model, Message, OutMessage> {
  /**
   * @param child The completed child Block whose OutMessages are handled.
   * @param cases One named handler for every child OutMessage variant.
   */
  <const Child extends ChildOutMessageContract, const Cases>(
    child: Child & ValidateChild<Child>,
    cases: Cases &
      OutMessageFoldCases<Model, Message, Child> &
      CaseValidation<Model, Message, OutMessage, Child, NoInfer<Cases>>,
  ): OutMessageFold<
    ChildOutMessage<Child>,
    DefinedCaseSteps<Model, Cases>,
    OutMessageFoldContext<Model, Message, Child, Cases>,
    ChildMessage<Child>
  >
}

/** @internal Creates a Definition-owned OutMessage fold authoring helper. */
export function makeOutMessageFold(): MakeOutMessageFold<any, any, any>
export function makeOutMessageFold(): AnyFunction {
  return (child: unknown, cases: unknown) => {
    if (cases === undefined) {
      throw new Error(
        '[foldkit] Definition.makeOutMessageFold requires a completed child Block followed by a record of variant handlers.',
      )
    }

    assertChildOutMessageHandlers(child, cases, 'makeOutMessageFold')

    const handler = (
      outMessage: Readonly<{ _tag: string }>,
      context?: unknown,
    ) => {
      const handle = Reflect.get(cases, outMessage._tag)
      if (
        !Object.hasOwn(cases, outMessage._tag) ||
        !Predicate.isFunction(handle)
      ) {
        throw new Error(
          `[foldkit] Definition.makeOutMessageFold has no handler for child OutMessage "${outMessage._tag}".`,
        )
      }

      return handle(outMessage, context)
    }

    registerOutMessageHandler(handler, child, cases, 'makeOutMessageFold')

    return handler
  }
}
