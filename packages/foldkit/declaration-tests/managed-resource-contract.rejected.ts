import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'

import {
  InMessage,
  Message,
  Model,
  Namespace,
  Session,
  Store,
  inspect,
  layer,
} from './managed-resource-contract.accepted.js'

const config = { Model, Message, InMessage, InitArgs: Schema.Tuple([]) }
const LegacyEffectsKey = Symbol('LegacyEffects')
const LegacyOperationKey = Symbol('LegacyOperation')
const LegacyInputKey = Symbol('LegacyInput')
const LegacyNamespaceEffectsKey = Symbol('LegacyNamespaceEffects')
const LegacyOperationUnionKey = Symbol('LegacyOperationUnion')
const LegacyInputUnionKey = Symbol('LegacyInputUnion')
const LegacyOptionalEffectsKey = Symbol('LegacyOptionalEffects')
const LegacyOptionalOperationKey = Symbol('LegacyOptionalOperation')
const LegacyOptionalInputKey = Symbol('LegacyOptionalInput')
const DifferentSessionKey = Symbol('DifferentSession')
const DifferentSessionBlock = Block.make('DifferentSession', {
  ...config,
  key: DifferentSessionKey,
})

// @ts-expect-error ManagedResource requirements use effects.managedResources.
Block.make('LegacyEffects', {
  ...config,
  key: LegacyEffectsKey,
  effects: { services: [Store], resources: [Session] },
})

// @ts-expect-error Operation ManagedResource requirements use managedResources.
Block.make('LegacyOperation', {
  ...config,
  key: LegacyOperationKey,
  operations: {
    read: { message: Message.RequestedRead, resources: [Session] },
  },
})

const readOperations = {
  read: { message: Message.RequestedRead, resources: [Session] },
}
const refreshOperations = { refresh: Message.RequestedRead }
declare const operationAlternatives:
  | typeof readOperations
  | typeof refreshOperations

// @ts-expect-error Every operation-record alternative rejects the removed requirement key.
Block.make('LegacyOperationUnion', {
  ...config,
  key: LegacyOperationUnionKey,
  operations: operationAlternatives,
})

const UnionInMessage = defineInMessageUnion({
  RequestedRefresh: {},
  RequestedClear: {},
})
const refreshOutput = {
  RequestedRefresh: { services: [Store], resources: [Session] },
}
const clearOutput = { RequestedClear: {} }
declare const inputOutputAlternatives: typeof refreshOutput | typeof clearOutput

// @ts-expect-error Every InMessage-output record alternative rejects the removed requirement key.
Block.make('LegacyInputUnion', {
  ...config,
  key: LegacyInputUnionKey,
  InMessage: UnionInMessage,
  inMessageOutputs: inputOutputAlternatives,
})

const managedReadOperations = {
  read: { message: Message.RequestedRead, managedResources: [Session] },
}
declare const managedOperationAlternatives:
  | typeof managedReadOperations
  | typeof refreshOperations
const ManagedOperationUnionKey = Symbol('ManagedOperationUnion')
Block.make('ManagedOperationUnion', {
  ...config,
  key: ManagedOperationUnionKey,
  operations: managedOperationAlternatives,
})

const managedRefreshOutput = {
  RequestedRefresh: { services: [Store], managedResources: [Session] },
}
declare const managedInputOutputAlternatives:
  | typeof managedRefreshOutput
  | typeof clearOutput
const ManagedInputUnionKey = Symbol('ManagedInputUnion')
Block.make('ManagedInputUnion', {
  ...config,
  key: ManagedInputUnionKey,
  InMessage: UnionInMessage,
  inMessageOutputs: managedInputOutputAlternatives,
})

declare const optionalEffects: {
  readonly effects?: {
    readonly services: readonly []
    readonly resources: readonly [typeof Session]
  }
}

// @ts-expect-error Optional effects declarations reject the removed requirement key when present.
Block.make('LegacyOptionalEffects', {
  ...config,
  ...optionalEffects,
  key: LegacyOptionalEffectsKey,
})

declare const optionalOperations: {
  readonly operations?: typeof readOperations
}

// @ts-expect-error Optional operation declarations reject the removed requirement key when present.
Block.make('LegacyOptionalOperation', {
  ...config,
  ...optionalOperations,
  key: LegacyOptionalOperationKey,
})

declare const optionalInputOutputs: {
  readonly inMessageOutputs?: typeof refreshOutput
}

// @ts-expect-error Optional InMessage-output declarations reject the removed requirement key when present.
Block.make('LegacyOptionalInput', {
  ...config,
  ...optionalInputOutputs,
  key: LegacyOptionalInputKey,
})

declare const optionalManagedEffects: {
  readonly effects?: {
    readonly managedResources: readonly [typeof Session]
  }
}
const ManagedOptionalEffectsKey = Symbol('ManagedOptionalEffects')
Block.make('ManagedOptionalEffects', {
  ...config,
  ...optionalManagedEffects,
  key: ManagedOptionalEffectsKey,
})

declare const optionalManagedOperations: {
  readonly operations?: typeof managedReadOperations
}
const ManagedOptionalOperationKey = Symbol('ManagedOptionalOperation')
Block.make('ManagedOptionalOperation', {
  ...config,
  ...optionalManagedOperations,
  key: ManagedOptionalOperationKey,
})

declare const optionalManagedInputOutputs: {
  readonly inMessageOutputs?: typeof managedRefreshOutput
}
const ManagedOptionalInputKey = Symbol('ManagedOptionalInput')
Block.make('ManagedOptionalInput', {
  ...config,
  ...optionalManagedInputOutputs,
  key: ManagedOptionalInputKey,
})

Block.make('LegacyInput', {
  ...config,
  key: LegacyInputKey,
  inMessageOutputs: {
    // @ts-expect-error InMessage result ManagedResource requirements use managedResources.
    RequestedRefresh: { resources: [Session] },
  },
})

// @ts-expect-error The Namespace overload rejects legacy ManagedResource requirements too.
Block.make(Namespace, {
  ...config,
  key: LegacyNamespaceEffectsKey,
  effects: { services: [Store], resources: [Session] },
})

// @ts-expect-error Graph construction Services remain required by pure acquisition.
Effect.runPromise(inspect)

// @ts-expect-error The selected Layer must retain its original Block identity.
Story.withBlock({ block: DifferentSessionBlock, layer }, () => undefined)
