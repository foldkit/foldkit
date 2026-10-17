import type { Effect } from 'effect'

import type * as Update from '../update/index.js'
import type { RequirementsOfBindings } from './binding.js'

declare const BindingPolicyTypeId: unique symbol

/** @internal Retains exact policy outputs until their Composition validates them. */
export interface BindingPolicyEvidence<Policy> {
  readonly [BindingPolicyTypeId]: Readonly<{
    policy: (policy: Policy) => Policy
    channels: (channels: PolicyChannels<Policy>) => PolicyChannels<Policy>
  }>
}

type AnyFunction = (...args: ReadonlyArray<any>) => any
type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false
type ReturnOf<Value> = Value extends AnyFunction ? ReturnType<Value> : never

type PolicyStepReturn<Model, Message, OutMessage> = Readonly<{
  model: Model
  commands?: Update.Commands<Message, any> | undefined
  outMessage?: OutMessage
}>

type FieldOf<Value, Key extends PropertyKey> = Value extends unknown
  ? Key extends keyof Value
    ? Exclude<Value[Key], undefined>
    : never
  : never

type FieldPresence<Value, Key extends PropertyKey> = Value extends unknown
  ? Key extends keyof Value
    ? {} extends Pick<Value, Key>
      ? 'Optional'
      : 'Required'
    : 'Absent'
  : never

type KeysOf<Value> = Value extends unknown ? keyof Value : never

type RegistrationKey = keyof Update.RegistrationEvidence<unknown>

type PolicyStep<Policy> = ReturnOf<FieldOf<Policy, 'fold'>>

type PolicyOutput<Policy> = Update.ResolvedOperationOutput<
  ReturnOf<PolicyStep<Policy>>
>

type PolicyRegistration<Policy> =
  | Update.RegistrationEvidenceOf<PolicyOutput<Policy>>
  | Update.GraphRequirementOf<PolicyStep<Policy>>

type CommandMessage<Output> =
  FieldOf<Output, 'commands'> extends ReadonlyArray<infer Invocation>
    ? Invocation extends Readonly<{ effect: infer CommandEffect }>
      ? CommandEffect extends Effect.Effect<infer Message, any, any>
        ? Message
        : never
      : never
    : never

type PolicyChannels<Policy> =
  IsAny<Policy> extends true
    ? any
    : Readonly<{
        keys: KeysOf<Policy>
        foldPresence: FieldPresence<Policy, 'fold'>
        forwardPresence: FieldPresence<Policy, 'forward'>
        commandsPresence: FieldPresence<PolicyOutput<Policy>, 'commands'>
        outMessagePresence: FieldPresence<PolicyOutput<Policy>, 'outMessage'>
        registrationPresence: FieldPresence<
          PolicyOutput<Policy>,
          RegistrationKey
        >
        commandRegistrationPresence: FieldPresence<
          FieldOf<PolicyOutput<Policy>, 'commands'>,
          RegistrationKey
        >
        commandMessage: CommandMessage<PolicyOutput<Policy>>
        requirements: Update.RequirementsOf<() => PolicyOutput<Policy>>
        outMessage: FieldOf<PolicyOutput<Policy>, 'outMessage'>
        registration: PolicyRegistration<Policy>
        forwardedOutMessage: ReturnOf<FieldOf<Policy, 'forward'>>
      }>

type ErasedCommands<Commands> =
  IsAny<Commands> extends true
    ? true
    : Commands extends ReadonlyArray<infer Invocation>
      ? IsAny<Invocation>
      : false

type HasErasedFields<Output> =
  Output extends Readonly<{ model: infer Model }>
    ? true extends
        | IsAny<Model>
        | ErasedCommands<FieldOf<Output, 'commands'>>
        | IsAny<FieldOf<Output, 'outMessage'>>
        | IsAny<CommandMessage<Output>>
        | IsAny<Update.RequirementsOf<() => Output>>
        | IsUnknown<Update.RequirementsOf<() => Output>>
        | IsAny<Update.RegistrationEvidenceOf<Output>>
        | IsUnknown<Update.RegistrationEvidenceOf<Output>>
      ? true
      : false
    : true

type ValidStep<Step, Model, Message, OutMessage> =
  IsAny<Step> extends true
    ? false
    : Step extends AnyFunction
      ? IsAny<Update.ResolvedOperationOutput<ReturnType<Step>>> extends true
        ? false
        : true extends HasErasedFields<
              Update.ResolvedOperationOutput<ReturnType<Step>>
            >
          ? false
          : Parameters<Step> extends readonly [infer Input]
            ? IsAny<Input> extends true
              ? false
              : IsUnknown<Input> extends true
                ? false
                : Update.GraphRequirementOf<Step> extends infer Requirement
                  ? IsAny<Requirement> extends true
                    ? false
                    : IsUnknown<Requirement> extends true
                      ? false
                      : [Input, Update.GraphInput<Model, Requirement>] extends [
                            Update.GraphInput<Model, Requirement>,
                            Input,
                          ]
                        ? Update.ResolvedOperationOutput<
                            ReturnType<Step>
                          > extends PolicyStepReturn<Model, Message, OutMessage>
                          ? true
                          : false
                        : false
                  : false
            : false
      : false

type ValidFold<Fold, Model, Message, OutMessage> =
  IsAny<Fold> extends true
    ? false
    : Fold extends AnyFunction
      ? false extends ValidStep<ReturnType<Fold>, Model, Message, OutMessage>
        ? false
        : true
      : false

type ValidForward<Forward, OutMessage> =
  IsAny<Forward> extends true
    ? false
    : Forward extends AnyFunction
      ? IsAny<ReturnType<Forward>> extends true
        ? false
        : [ReturnType<Forward>] extends [OutMessage | undefined]
          ? true
          : false
      : false

type InvalidPolicy<Policy, Model, Message, OutMessage> =
  IsAny<Policy> extends true
    ? 'Policy is any'
    : [Policy] extends [never]
      ? never
      : unknown extends Policy
        ? 'Policy is unknown'
        : Policy extends
              | Readonly<{ fold: unknown }>
              | Readonly<{ forward: unknown }>
          ?
              | ([FieldOf<Policy, 'fold'>] extends [never]
                  ? never
                  : ValidFold<
                        FieldOf<Policy, 'fold'>,
                        Model,
                        Message,
                        OutMessage
                      > extends true
                    ? never
                    : 'Invalid fold output')
              | ([FieldOf<Policy, 'forward'>] extends [never]
                  ? never
                  : ValidForward<
                        FieldOf<Policy, 'forward'>,
                        OutMessage
                      > extends true
                    ? never
                    : 'Invalid forwarded OutMessage')
          : 'Policy evidence is unavailable'

type InvalidPolicies<
  Children extends ReadonlyArray<unknown>,
  Model,
  Message,
  OutMessage,
> = Children[number] extends infer Binding
  ? Binding extends BindingPolicyEvidence<infer Policy>
    ? InvalidPolicy<Policy, Model, Message, OutMessage>
    : 'Policy evidence is unavailable'
  : never

type RegistrationsOfPolicies<Children extends ReadonlyArray<unknown>> =
  Children[number] extends infer Binding
    ? Binding extends BindingPolicyEvidence<infer Policy>
      ? PolicyRegistration<Policy>
      : never
    : never

type MissingPolicyRegistrations<Children extends ReadonlyArray<unknown>> =
  Exclude<RegistrationsOfPolicies<Children>, RequirementsOfBindings<Children>>

/** @internal Checks policy outputs and sibling registrations at Composition creation. */
export type ValidateBindingPolicies<
  Children extends ReadonlyArray<unknown>,
  Model,
  Message,
  OutMessage,
> = ([InvalidPolicies<Children, Model, Message, OutMessage>] extends [never]
  ? unknown
  : Readonly<{
      'Block child OutMessage policies must return parent Steps and declared OutMessages': InvalidPolicies<
        Children,
        Model,
        Message,
        OutMessage
      >
    }>) &
  ([MissingPolicyRegistrations<Children>] extends [never]
    ? unknown
    : Readonly<{
        'Block child OutMessage policies must use registered sibling Bindings': MissingPolicyRegistrations<Children>
      }>)
