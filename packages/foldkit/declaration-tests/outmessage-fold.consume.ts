import { Effect, Layer } from 'effect'
import { Command, Runtime, Update } from 'foldkit'

import {
  ChildMessage,
  ChildOutMessage,
  ChoiceStore,
  Model,
  ObserveChoice,
  ParentMessage,
  RecordChoice,
  foldChoice,
  foldLiftedChildCommand,
  foldLiteralModel,
  foldToSibling,
  literalMatcherUpdate,
  literalModelUpdate,
  program,
  runnable,
} from './outmessage-fold.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type Inference = readonly [
  Expect<
    Equal<
      ReturnType<typeof literalMatcherUpdate>['model']['phase'],
      'Idle' | 'Done'
    >
  >,
  Expect<
    Equal<
      ReturnType<ReturnType<typeof foldLiteralModel>>['model']['phase'],
      'Idle' | 'Done'
    >
  >,
  Expect<
    Equal<
      ReturnType<typeof literalModelUpdate>['model']['phase'],
      'Idle' | 'Done'
    >
  >,
  Expect<Equal<Parameters<typeof foldChoice>[0], typeof ChildOutMessage.Type>>,
  Expect<
    Equal<
      Parameters<typeof foldLiftedChildCommand>[1],
      Update.FoldContext<
        typeof ChildMessage.Type,
        typeof ParentMessage.Type,
        typeof Model.Type
      >
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<ReturnType<typeof foldLiftedChildCommand>>,
      Command.HandlerOf<typeof ObserveChoice>
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<ReturnType<typeof foldChoice>>,
      Command.HandlerOf<typeof RecordChoice>
    >
  >,
  Expect<
    Equal<
      [
        Update.RegistrationEvidenceOf<
          ReturnType<ReturnType<typeof foldToSibling>>
        >,
      ] extends [never]
        ? true
        : false,
      false
    >
  >,
]

declare const parentModel: typeof Model.Type
// @ts-expect-error The emitted fold retains its required lifters and previous Model context.
foldLiftedChildCommand(ChildOutMessage.Chose({ value: 'Pear' }))
// @ts-expect-error An emitted connected fold still requires its registered graph capability.
foldToSibling(ChildOutMessage.Chose({ value: 'Pear' }))(parentModel)

Runtime.run(runnable)
Runtime.run(
  program.provide(
    Layer.succeed(ChoiceStore)({
      init: Effect.void,
      record: () => Effect.void,
    }),
  ),
)
