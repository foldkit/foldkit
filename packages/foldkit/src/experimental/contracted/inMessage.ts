import { Predicate, Schema, SchemaAST } from 'effect'

import type { AnyBinding } from '../../block/binding.js'
import {
  type CompiledOperation,
  makeCompiledOperation,
} from '../../block/compiledOperation.js'
import type {
  AuthoredMessageArguments,
  AuthoredMessageTag,
  AuthoredUpdateCases,
  CaseOutputChannels,
  ContextualUpdateCases,
  ContextualUpdateCasesFactory,
  ContextualUpdateOutputs,
  ResolvedAuthoredOutput,
  ValidateAnnotatedContext,
  ValidatedContextualUpdateCases,
} from '../../block/delivery.js'
import {
  isBindingInitRecipe,
  runBindingInitRecipe,
} from '../../block/initRecipe.js'
import { runtimeMessageSchemaContract } from '../../block/messageSchemaContract.js'
import {
  type OperationMessageConstructor,
  type OperationParameters,
  isOperationMessageConstructor,
  prepareOperation,
} from '../../block/operation.js'
import { withOperationGraph } from '../../block/operationGraph.js'
import { makeOperationMessageValidator } from '../../block/operationMessage.js'
import type { OperationOutputs } from '../../block/operationOutputs.js'
import * as Update from '../../update/index.js'
import {
  type OperationEnvironment,
  resolveOperationOutput,
} from '../../update/operationRecipe.js'
import type { AuthoringSource, Plan } from '../hybrid/authoring.js'
import { makePlan } from '../hybrid/authoring.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type AnySchema = Schema.Codec<any, any, any, any>
type IsAny<Value> = 0 extends 1 & Value ? true : false
type InputTag<SchemaValue extends AnySchema> = AuthoredMessageTag<
  SchemaValue['Type']
>
type InputConstructor<
  SchemaValue extends AnySchema,
  Tag extends PropertyKey,
> = Tag extends keyof SchemaValue
  ? Extract<SchemaValue[Tag], OperationMessageConstructor>
  : never

type InvalidConstructors<SchemaValue extends AnySchema> = {
  readonly [Tag in InputTag<SchemaValue>]: [InputOperationName<Tag>] extends [
    never,
  ]
    ? Tag
    : [InputConstructor<SchemaValue, Tag>] extends [never]
      ? Tag
      : [ReturnType<InputConstructor<SchemaValue, Tag>>] extends [
            Extract<SchemaValue['Type'], Readonly<{ _tag: Tag }>>,
          ]
        ? never
        : Tag
}[InputTag<SchemaValue>]

/** @internal Derives parent request names from the two explicit input fact prefixes. */
export type InputOperationName<Tag extends PropertyKey> =
  Tag extends `Requested${infer Operation}`
    ? Operation extends ''
      ? never
      : `request${Operation}`
    : Tag extends `InformedOf${infer Operation}`
      ? Operation extends ''
        ? never
        : `inform${Operation}`
      : never

/** @internal Enforces the same finite input protocol for erased declarations. */
export const inputOperationName = (tag: string): string => {
  if (tag.startsWith('Requested') && tag.length > 'Requested'.length) {
    return `request${tag.slice('Requested'.length)}`
  }

  if (tag.startsWith('InformedOf') && tag.length > 'InformedOf'.length) {
    return `inform${tag.slice('InformedOf'.length)}`
  }

  throw new Error(
    '[foldkit] InMessage variants must use Requested... or InformedOf... with a nonempty operation name.',
  )
}

/** @internal A generated input API requires finite, owned callable variants. */
export type ValidateInMessageSchema<SchemaValue extends AnySchema> =
  IsAny<SchemaValue['Type']> extends true
    ? Readonly<{ 'InMessage must preserve exact Schema contracts': never }>
    : AuthoredMessageArguments<SchemaValue['Type']> extends readonly []
      ? [InvalidConstructors<SchemaValue>] extends [never]
        ? unknown
        : Readonly<{
            'InMessage requires its union-owned callable variant constructors': InvalidConstructors<SchemaValue>
          }>
      : Readonly<{ 'InMessage requires finite tagged variants': never }>

type OutOf<Output> =
  Output extends Readonly<{ outMessage?: infer Out }>
    ? Exclude<Out, undefined>
    : never

type ReceiveResult<
  Model,
  Message,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> =
  ResolvedAuthoredOutput<Output, Bindings> extends infer Resolved
    ? Update.WithRegistrationEvidence<
        [OutOf<Resolved>] extends [never]
          ? Update.Return<Model, Message, Update.RequirementsOfResult<Resolved>>
          : Update.ReturnWithOutMessage<
              Model,
              Message,
              OutOf<Resolved>,
              Update.RequirementsOfResult<Resolved>
            >,
        Update.RegistrationEvidenceOf<Resolved>
      >
    : never

/** The pure receive function, with separate input and Command-result contracts. */
export interface ReceiveHandler<
  Model,
  InMessage,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> {
  (
    inMessage: InMessage,
  ): (
    model: Model,
    ...context: Context
  ) => ReceiveResult<Model, Message, Output, Bindings>
  (
    model: Model,
    inMessage: InMessage,
    ...context: Context
  ): ReceiveResult<Model, Message, Output, Bindings>
}

type ReceivePlan<
  Model,
  InMessage,
  Message,
  Context extends ReadonlyArray<unknown>,
  Outputs,
  Bindings extends ReadonlyArray<AnyBinding>,
  Source,
> = Plan<
  ReceiveHandler<
    Model,
    InMessage,
    Message,
    Context,
    Outputs[keyof Outputs],
    Bindings
  > &
    OperationOutputs<CaseOutputChannels<Bindings, Outputs>>,
  'Receive',
  Source
>

/** Authors exhaustive parent requests independently from local Message handlers. */
export interface MakeReceivePlan<
  Model,
  InMessage,
  Message,
  OutMessage,
  Bindings extends ReadonlyArray<AnyBinding>,
  Source,
  ContextConstraint extends ReadonlyArray<unknown> = readonly [],
> {
  <
    const Outputs extends Readonly<
      Record<AuthoredMessageTag<InMessage>, unknown>
    >,
  >(
    cases: AuthoredUpdateCases<
      Model,
      InMessage,
      Bindings,
      Outputs,
      Message,
      OutMessage
    > &
      Readonly<
        Record<Exclude<keyof Outputs, AuthoredMessageTag<InMessage>>, never>
      >,
    ...invalidInputContract: AuthoredMessageArguments<InMessage>
  ): ReceivePlan<
    Model,
    InMessage,
    Message,
    readonly [],
    Outputs,
    Bindings,
    Source
  >

  readonly withContext: <const Context extends ContextConstraint, const Cases>(
    createCases: ContextualUpdateCasesFactory<
      Context,
      Cases &
        ContextualUpdateCases<Model, InMessage, Bindings, Message, OutMessage> &
        ValidatedContextualUpdateCases<
          Model,
          InMessage,
          Bindings,
          ContextualUpdateOutputs<Model, InMessage, Bindings, NoInfer<Cases>>,
          Message,
          OutMessage
        > &
        Readonly<
          Record<
            Exclude<keyof NoInfer<Cases>, AuthoredMessageTag<InMessage>>,
            never
          >
        >
    > &
      ValidateAnnotatedContext<NoInfer<Context>>,
    ...invalidInputContract: AuthoredMessageArguments<InMessage>
  ) => ReceivePlan<
    Model,
    InMessage,
    Message,
    Context,
    ContextualUpdateOutputs<Model, InMessage, Bindings, Cases>,
    Bindings,
    Source
  >
}

type ResultFromChannels<Model, Message, Channels> = Channels extends readonly [
  unknown,
  infer OutMessage,
  infer Requirements,
  infer Registration,
]
  ? Update.WithRegistrationEvidence<
      [OutMessage] extends [never]
        ? Update.Return<Model, Message, Requirements>
        : Update.ReturnWithOutMessage<Model, Message, OutMessage, Requirements>,
      Registration
    >
  : never

/** @internal Selects a receive result without treating its input as a Command result. */
export type ReceiveOutputOf<Receive extends AnyFunction, Message, InMessage> =
  Receive extends OperationOutputs<infer Channels>
    ? InMessage extends Readonly<{ _tag: infer Tag }>
      ? ResultFromChannels<
          Parameters<Receive>[0],
          Message,
          Extract<Channels, readonly [Tag, unknown, unknown, unknown]>
        >
      : never
    : never

/** @internal The independent optional/default/rest context of one receiver. */
export type ReceiveContext<Receive extends AnyFunction> =
  Parameters<Receive> extends readonly [unknown, unknown, ...infer Context]
    ? Context
    : never

/** @internal Model-first input functions compiled for native Binding lowering. */
export type CompiledInputs<
  SchemaValue extends AnySchema,
  Receive extends AnyFunction,
  Message,
  Source extends object,
> = {
  readonly [
    Tag in InputTag<SchemaValue> as InputOperationName<Tag>
  ]: CompiledOperation<
    (
      model: Parameters<Receive>[0],
      ...args: readonly [
        ...OperationParameters<InputConstructor<SchemaValue, Tag>>,
        ...ReceiveContext<Receive>,
      ]
    ) => ReceiveOutputOf<
      Receive,
      Message,
      Extract<SchemaValue['Type'], Readonly<{ _tag: Tag }>>
    >,
    Source
  >
}

/** @internal The erased plan factory retained while input authorship is prototyped. */
export interface RuntimeMakeReceivePlan {
  (cases: object): Plan<unknown, 'Receive', AuthoringSource>
  readonly withContext: (
    createCases: AnyFunction,
  ) => Plan<unknown, 'Receive', AuthoringSource>
}

/** @internal Builds passive receive plans using the same contextual record convention as update. */
export const makeReceivePlan = (
  source: AuthoringSource,
): RuntimeMakeReceivePlan => {
  const make = (cases: object) =>
    makePlan(source, 'Receive', actual =>
      Reflect.apply(Reflect.get(actual, 'makeReceive'), actual, [cases]),
    )

  return Object.assign(make, {
    withContext: (createCases: AnyFunction) =>
      makePlan(source, 'Receive', actual => {
        const receive = Reflect.get(actual, 'makeReceive')

        return Reflect.apply(Reflect.get(receive, 'withContext'), receive, [
          createCases,
        ])
      }),
  })
}

/** @internal Validates and names the declared input constructors without invoking them. */
export const inputConstructors = (schema: Schema.Top) => {
  const visited = new Set<SchemaAST.AST>()
  const assertTagged = (source: SchemaAST.AST): void => {
    const ast = SchemaAST.toType(source)

    if (visited.has(ast) || SchemaAST.isNever(ast)) {
      return
    }

    visited.add(ast)

    if (SchemaAST.isSuspend(ast)) {
      assertTagged(ast.thunk())
      return
    }

    if (SchemaAST.isUnion(ast)) {
      ast.types.forEach(assertTagged)
      return
    }

    if (SchemaAST.isObjects(ast)) {
      const tag = ast.propertySignatures.find(
        property => property.name === '_tag',
      )
      const tagAst = tag === undefined ? undefined : SchemaAST.toType(tag.type)

      if (
        tag !== undefined &&
        !SchemaAST.isOptional(tag.type) &&
        tagAst !== undefined &&
        SchemaAST.isLiteral(tagAst) &&
        Predicate.isString(tagAst.literal)
      ) {
        return
      }
    }

    throw new Error('[foldkit] InMessage requires finite tagged variants.')
  }

  assertTagged(schema.ast)

  const validateConstructor = makeOperationMessageValidator(schema)
  const constructors = new Map<string, OperationMessageConstructor>()

  for (const tag of runtimeMessageSchemaContract(schema).tags) {
    const constructor = Reflect.get(schema, tag)

    if (!isOperationMessageConstructor(constructor)) {
      throw new Error(
        '[foldkit] InMessage requires union-owned callable constructors.',
      )
    }

    validateConstructor(constructor)

    const name = inputOperationName(tag)

    if (constructors.has(name)) {
      throw new Error(
        `[foldkit] InMessage variants produce duplicate input method "${name}".`,
      )
    }

    constructors.set(name, constructor)
  }

  return constructors
}

/** @internal Validates the separate input protocol before any implementation is constructed. */
export const assertInMessageConfiguration = (
  config: Readonly<{
    Message: AnySchema
    InMessage?: AnySchema
    InMessageContext?: unknown
    inMessageOutputs?: object
    operations?: object
  }>,
): void => {
  if (config.InMessage === undefined) {
    if (
      Object.hasOwn(config, 'inMessageOutputs') ||
      Object.hasOwn(config, 'InMessageContext')
    ) {
      throw new Error(
        '[foldkit] InMessage outputs and Context require an InMessage Schema.',
      )
    }

    return
  }

  if (!Schema.isSchema(config.InMessage)) {
    throw new Error('[foldkit] InMessage requires an owned tagged Schema.')
  }

  const constructors = inputConstructors(config.InMessage)
  const inputTags = runtimeMessageSchemaContract(config.InMessage).tags
  const localTags = runtimeMessageSchemaContract(config.Message).tags

  for (const tag of inputTags) {
    if (localTags.has(tag)) {
      throw new Error(
        '[foldkit] Local Message and InMessage tags must be distinct.',
      )
    }
  }

  for (const name of constructors.keys()) {
    if (
      config.operations !== undefined &&
      Object.hasOwn(config.operations, name)
    ) {
      throw new Error(
        `[foldkit] InMessage operation "${name}" conflicts with an explicit operation.`,
      )
    }
  }

  if (config.inMessageOutputs !== undefined) {
    if (
      !Predicate.isObject(config.inMessageOutputs) ||
      globalThis.Array.isArray(config.inMessageOutputs)
    ) {
      throw new Error(
        '[foldkit] inMessageOutputs requires a per-input result contract record.',
      )
    }

    for (const tag of Reflect.ownKeys(config.inMessageOutputs)) {
      if (!Predicate.isString(tag) || !inputTags.has(tag)) {
        throw new Error(
          '[foldkit] inMessageOutputs contains an undeclared input variant.',
        )
      }

      const output: unknown = Reflect.get(config.inMessageOutputs, tag)

      if (!Predicate.isObject(output) || globalThis.Array.isArray(output)) {
        throw new Error(
          '[foldkit] Each InMessage output contract must be a record.',
        )
      }

      for (const key of Reflect.ownKeys(output)) {
        if (key !== 'outMessage' && key !== 'services' && key !== 'resources') {
          throw new Error(
            '[foldkit] InMessage output contracts support only outMessage, services, and resources.',
          )
        }
      }

      if (
        Object.hasOwn(output, 'outMessage') &&
        !Schema.isSchema(Reflect.get(output, 'outMessage'))
      ) {
        throw new Error(
          '[foldkit] InMessage output contracts require an OutMessage Schema.',
        )
      }
    }
  }
}

/** @internal Compiles a pure input dispatcher without local or generated Message routing. */
export const makeReceiveDispatcher = (
  schema: Schema.Top,
  bindings: ReadonlyArray<object>,
  environment: OperationEnvironment,
) => {
  const tags = runtimeMessageSchemaContract(schema).tags
  const isInput = Schema.is(schema)
  const receivers = new WeakSet<object>()
  const assertCases = (
    cases: unknown,
  ): Readonly<Record<string, AnyFunction>> => {
    if (!Predicate.isObject(cases) || globalThis.Array.isArray(cases)) {
      throw new Error(
        '[foldkit] makeReceive requires an exhaustive handler record.',
      )
    }

    for (const tag of tags) {
      if (
        !Object.hasOwn(cases, tag) ||
        !Predicate.isFunction(Reflect.get(cases, tag))
      ) {
        throw new Error(
          `[foldkit] makeReceive has no handler for InMessage "${tag}".`,
        )
      }
    }

    for (const tag of Reflect.ownKeys(cases)) {
      if (!Predicate.isString(tag) || !tags.has(tag)) {
        throw new Error(
          '[foldkit] makeReceive declares a handler outside its InMessage Schema.',
        )
      }
    }

    // oxlint-disable-next-line typescript/consistent-type-assertions
    return cases as Readonly<Record<string, AnyFunction>>
  }
  const fromCases = (createCases: AnyFunction) => {
    const dispatch = (
      model: unknown,
      input: unknown,
      context: ReadonlyArray<unknown>,
    ) =>
      withOperationGraph(bindings, () => {
        if (!Predicate.isObject(input) || !isInput(input)) {
          throw new Error(
            "[foldkit] receive requires a decoded value from this Block's InMessage Schema.",
          )
        }

        const cases = assertCases(createCases(...context))
        const tag: unknown = Reflect.get(input, '_tag')
        const handler = Predicate.isString(tag) ? cases[tag] : undefined

        if (handler === undefined) {
          throw new Error(
            '[foldkit] receive has no handler for this InMessage.',
          )
        }

        const output = resolveOperationOutput(
          handler(model, input),
          model,
          environment,
        )

        return isBindingInitRecipe(output)
          ? runBindingInitRecipe(output, environment)
          : output
      })
    const receive = function (
      modelOrInput: unknown,
      input: unknown,
      ...context: ReadonlyArray<unknown>
    ): unknown {
      if (arguments.length === 1) {
        return (model: unknown, ...curriedContext: ReadonlyArray<unknown>) =>
          dispatch(model, modelOrInput, curriedContext)
      }

      return dispatch(modelOrInput, input, context)
    }

    receivers.add(receive)

    return receive
  }
  const make = (cases: unknown) => {
    const checked = assertCases(cases)

    return fromCases(() => checked)
  }

  return Object.assign(make, {
    withContext: (createCases: unknown) => {
      if (!Predicate.isFunction(createCases)) {
        throw new Error(
          '[foldkit] makeReceive.withContext requires a handler-record producer.',
        )
      }

      return fromCases((...context: ReadonlyArray<unknown>) =>
        Reflect.apply(createCases, undefined, context),
      )
    },
    complete: (receive: object) => {
      if (!receivers.has(receive)) {
        throw new Error(
          '[foldkit] receive must be authored by this Composition.makeReceive.',
        )
      }

      return receive
    },
  })
}

/** @internal Compiles generated input functions without evaluating any producer. */
export const compileInputs = (
  schema: Schema.Top,
  receive: AnyFunction,
  source: object,
) =>
  Object.fromEntries(
    [...inputConstructors(schema)].map(([name, constructor]) => {
      const prepare = prepareOperation(constructor)

      return [
        name,
        makeCompiledOperation(
          source,
          (model: unknown, ...args: ReadonlyArray<unknown>) =>
            receive(model, ...prepare(...args)),
        ),
      ]
    }),
  )
