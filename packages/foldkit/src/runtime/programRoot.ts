import { Array, Effect, Predicate, Schema } from 'effect'

import { defaultViewOf } from '../block/defaultView.js'
import type { AnyBlock, AnyProgramBlock, AnyRoot } from '../block/definition.js'
import type {
  DefaultViewEvidenceOfBlock,
  HandlerEvidenceOfBlock,
  HostHandlersOfBlock,
  OutMessageOfBlock,
  ValidateConcreteComposition,
  ValidateRootRequirementEvidence,
} from '../block/requirements.js'
import { requiresViewInputs } from '../block/viewScope.js'
import type { Document } from '../html/index.js'
import type { DevToolsConfig } from './devToolsConfig.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type BlockUpdate<BlockValue extends AnyProgramBlock> = BlockValue['update']
type BlockView<BlockValue extends AnyProgramBlock> =
  DefaultViewEvidenceOfBlock<BlockValue>

type RequiredUpdateContext<UpdateFunction extends AnyFunction> =
  UpdateFunction extends unknown
    ? Parameters<UpdateFunction> extends readonly [
        unknown,
        unknown,
        ...infer Context,
      ]
      ? [] extends Context
        ? never
        : Context
      : never
    : never

type ValidateRootChannels<BlockValue extends AnyProgramBlock> =
  RequiredUpdateContext<BlockUpdate<BlockValue>> extends infer Context
    ? [Context] extends [never]
      ? unknown
      : Readonly<{
          'Program root update must not require dispatch Context': Context
        }>
    : never

type RootOutMessage<BlockValue extends AnyProgramBlock> =
  OutMessageOfBlock<BlockValue>

type ValidateNoRootOutMessage<BlockValue extends AnyProgramBlock> = [
  RootOutMessage<BlockValue>,
] extends [never]
  ? unknown
  : Readonly<{
      'Program root Block must not declare an OutMessage': RootOutMessage<BlockValue>
    }>

type ValidateNoHostHandlers<BlockValue extends AnyProgramBlock> =
  HostHandlersOfBlock<BlockValue>[number] extends infer HostHandler
    ? [HostHandler] extends [never]
      ? unknown
      : Readonly<{
          'Program root Block must resolve every host handler': HostHandler
        }>
    : never

type RootHandlerEvidence<BlockValue extends AnyProgramBlock> =
  HandlerEvidenceOfBlock<BlockValue>

type ValidateRootHandlerEvidence<BlockValue extends AnyProgramBlock> =
  RootHandlerEvidence<BlockValue> extends infer Requirements
    ? unknown extends Requirements
      ? Readonly<{
          'Program root Block must resolve every handler contract': Requirements
        }>
      : [Requirements] extends [never]
        ? unknown
        : Readonly<{
            'Program root Block must resolve every handler contract': Requirements
          }>
    : Readonly<{
        'Program root Block must retain exact handler evidence': BlockValue
      }>

type ConcreteCompositionFailures<BlockValue extends AnyProgramBlock> =
  BlockValue extends unknown
    ? BlockValue extends AnyRoot
      ? never
      : BlockValue extends AnyBlock
        ? unknown extends ValidateConcreteComposition<BlockValue>
          ? never
          : ValidateConcreteComposition<BlockValue>
        : never
    : never

type ValidateDeferredComposition<BlockValue extends AnyProgramBlock> = [
  ConcreteCompositionFailures<BlockValue>,
] extends [never]
  ? unknown
  : ConcreteCompositionFailures<BlockValue>

type RootViewKind = 'Document' | 'Element'

type ValidateViewMember<View, Kind extends RootViewKind> = View extends (
  ...args: infer Args
) => infer Output
  ? [Args] extends [readonly [unknown, unknown]]
    ? Kind extends 'Document'
      ? [Output] extends [Document]
        ? unknown
        : Readonly<{
            'Program.make requires a Document view': View
          }>
      : [Output] extends [import('../vdom.js').VNode | null]
        ? unknown
        : Readonly<{
            'Program.makeElement requires an Html view': View
          }>
    : Readonly<{
        'Program root view must not require view inputs': View
      }>
  : Readonly<{
      'Program root Block must have a default view': View
    }>

type ViewMemberFailures<View, Kind extends RootViewKind> = View extends unknown
  ? unknown extends ValidateViewMember<View, Kind>
    ? never
    : ValidateViewMember<View, Kind>
  : never

type ValidateOneRootView<
  BlockValue extends AnyProgramBlock,
  Kind extends RootViewKind,
> =
  BlockView<BlockValue> extends infer View
    ? [View] extends [never]
      ? Readonly<{
          'Program root Block must have a default view': BlockValue
        }>
      : [ViewMemberFailures<View, Kind>] extends [never]
        ? unknown
        : ViewMemberFailures<View, Kind>
    : never

type RootViewFailures<
  BlockValue extends AnyProgramBlock,
  Kind extends RootViewKind,
> = BlockValue extends unknown
  ? unknown extends ValidateOneRootView<BlockValue, Kind>
    ? never
    : ValidateOneRootView<BlockValue, Kind>
  : never

type ValidateRootView<
  BlockValue extends AnyProgramBlock,
  Kind extends RootViewKind,
> = [RootViewFailures<BlockValue, Kind>] extends [never]
  ? unknown
  : RootViewFailures<BlockValue, Kind>

type ValidatePresentProgramBlock<BlockValue extends AnyProgramBlock> = [
  BlockValue,
] extends [never]
  ? Readonly<{
      'Program block must be a completed Block': BlockValue
    }>
  : unknown

/** @internal Validates the completed Block contract at a Program boundary. */
export type ValidateProgramBlock<
  BlockValue extends AnyProgramBlock,
  Kind extends RootViewKind,
> = ValidateRootHandlerEvidence<BlockValue> &
  ValidateRootRequirementEvidence<BlockValue> &
  ValidatePresentProgramBlock<BlockValue> &
  ValidateDeferredComposition<BlockValue> &
  ValidateNoHostHandlers<BlockValue> &
  ValidateNoRootOutMessage<BlockValue> &
  ValidateRootChannels<BlockValue> &
  ValidateRootView<BlockValue, Kind>

const blockImplementationFields = new Set([
  'Model',
  'init',
  'update',
  'view',
  'subscriptions',
  'managedResources',
  'EffectsLayer',
  'hostHandlers',
])

const commonHostFields = [
  'block',
  'container',
  'ports',
  'slow',
  'viewTransition',
  'freezeModel',
  'devTools',
  'crash',
]

const devToolsHostFields = new Set([
  'show',
  'position',
  'mode',
  'banner',
  'excludeFromHistory',
  'maxEntries',
  'keyframeInterval',
  'dispatch',
])

/** @internal Validates an erased Program boundary before Block lowering. */
export function assertProgramConfig(
  config: unknown,
  kind: RootViewKind,
): asserts config is Readonly<{ block: AnyBlock }> &
  Readonly<{ devTools?: DevToolsConfig }> &
  globalThis.Record<string, unknown> {
  if (!Predicate.isObject(config)) {
    throw new Error('[foldkit] Program configuration must be an object.')
  }

  for (const field of blockImplementationFields) {
    if (field in config) {
      throw new Error(
        `[foldkit] Program configuration cannot supply Block implementation field "${field}". Complete it with Composition.assembleBlock first and pass the result as block.`,
      )
    }
  }

  const devTools = Reflect.get(config, 'devTools')
  if (
    devTools !== undefined &&
    devTools !== false &&
    !Predicate.isObject(devTools)
  ) {
    throw new Error(
      '[foldkit] Program configuration field "devTools" must be false or an object.',
    )
  }

  if (Predicate.isObject(devTools)) {
    for (const field of globalThis.Object.keys(devTools)) {
      if (!devToolsHostFields.has(field)) {
        throw new Error(
          `[foldkit] Program DevTools configuration does not support "${field}".`,
        )
      }
    }

    const dispatch = Reflect.get(devTools, 'dispatch')
    if (dispatch !== undefined && !Predicate.isBoolean(dispatch)) {
      throw new Error(
        '[foldkit] Program DevTools configuration field "dispatch" must be a boolean.',
      )
    }
  }

  const hasFlagsSchema = 'Flags' in config
  const hasFlagsEffect = 'flags' in config

  if (hasFlagsSchema && !Schema.isSchema(Reflect.get(config, 'Flags'))) {
    throw new Error(
      '[foldkit] Program configuration field "Flags" must be a Schema.',
    )
  }

  if ('routing' in config) {
    const routing = Reflect.get(config, 'routing')
    if (
      !Predicate.isObject(routing) ||
      !Predicate.isFunction(Reflect.get(routing, 'onUrlRequest')) ||
      !Predicate.isFunction(Reflect.get(routing, 'onUrlChange'))
    ) {
      throw new Error(
        '[foldkit] Program routing must supply onUrlRequest and onUrlChange functions.',
      )
    }
  }

  if (kind === 'Document' && hasFlagsEffect) {
    throw new Error('[foldkit] Program.make does not support a flags Effect.')
  }

  if (kind === 'Element') {
    if ('routing' in config) {
      throw new Error('[foldkit] Program.makeElement does not support routing.')
    }

    if (hasFlagsSchema !== hasFlagsEffect) {
      throw new Error(
        '[foldkit] Program.makeElement requires Flags and flags together.',
      )
    }

    if (hasFlagsEffect && !Effect.isEffect(Reflect.get(config, 'flags'))) {
      throw new Error(
        '[foldkit] Program.makeElement field "flags" must be an Effect.',
      )
    }
  }

  const block = Reflect.get(config, 'block')
  if (
    !Predicate.isObject(block) ||
    !Schema.isSchema(Reflect.get(block, 'Model')) ||
    !Schema.isSchema(Reflect.get(block, 'Message')) ||
    !Predicate.isFunction(Reflect.get(block, 'init')) ||
    !Predicate.isFunction(Reflect.get(block, 'update')) ||
    !Array.isArray(Reflect.get(block, 'bindings')) ||
    !Array.isArray(Reflect.get(block, 'hostHandlers'))
  ) {
    throw new Error(
      '[foldkit] Program block must be a completed Block returned by Composition.assembleBlock.',
    )
  }

  if (Reflect.get(block, 'OutMessage') !== undefined) {
    throw new Error('[foldkit] A Program root Block cannot declare OutMessage.')
  }

  const hostHandlers = Reflect.get(block, 'hostHandlers')
  if (
    globalThis.Array.isArray(hostHandlers) &&
    Array.isArrayNonEmpty(hostHandlers)
  ) {
    throw new Error(
      '[foldkit] A Program root Block must resolve every host handler with block.provideHandlers before Program construction.',
    )
  }

  const view = defaultViewOf(block)
  if (view === undefined) {
    throw new Error('[foldkit] A Program root Block must have a default view.')
  }

  if (requiresViewInputs(view)) {
    throw new Error(
      '[foldkit] A Program root view must accept exactly its Model and Html builder.',
    )
  }

  if (kind === 'Element' && 'preserveScroll' in config) {
    throw new Error(
      '[foldkit] Program.makeElement does not support preserveScroll.',
    )
  }

  const allowedHostFields = new Set([
    ...commonHostFields,
    ...(kind === 'Document'
      ? ['Flags', 'routing', 'preserveScroll']
      : ['Flags', 'flags']),
  ])
  for (const field of globalThis.Object.keys(config)) {
    if (!allowedHostFields.has(field)) {
      const constructor =
        kind === 'Document' ? 'Program.make' : 'Program.makeElement'
      throw new Error(
        `[foldkit] ${constructor} configuration does not support "${field}".`,
      )
    }
  }
}

/** @internal Validates the page view output shared by browser and server hosts. */
export function assertDocument(output: unknown): asserts output is Document {
  if (
    !Predicate.isObject(output) ||
    !Predicate.isString(Reflect.get(output, 'title')) ||
    !Reflect.has(output, 'body')
  ) {
    throw new Error('[foldkit] Program.make requires a Document view.')
  }
}

/** @internal Validates a container-scoped root view output. */
export function assertElementHtml(output: unknown): void {
  if (output !== null && !Predicate.isObject(output)) {
    throw new Error('[foldkit] Program.makeElement requires an Html view.')
  }

  if (
    Predicate.isObject(output) &&
    Predicate.isString(Reflect.get(output, 'title')) &&
    Reflect.has(output, 'body')
  ) {
    throw new Error('[foldkit] Program.makeElement requires an Html view.')
  }
}
