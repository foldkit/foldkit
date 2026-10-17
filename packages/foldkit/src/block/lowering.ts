import { Context, Record } from 'effect'

import type { AnyAuthoredView } from '../html/block.js'
import type { BindableBlock } from './binding.js'
import { runtimeBindingOf } from './composition.js'
import { requireDefaultView } from './defaultView.js'
import type { AnyBlock } from './definition.js'
import {
  LocalMountsTypeId,
  copyIdentity,
  definitionsOf,
  hostIdentitiesOf,
} from './identity.js'
import { withOperationGraph } from './operationGraph.js'
import {
  qualifyCommand,
  qualifyEffect,
  qualifyEntry,
  qualifyKey,
  qualifyStream,
} from './scope.js'
import { scopeView } from './viewScope.js'

/** @internal Lowers a completed root's operations into its derived application path. */
export const lowerBlock = (
  block: AnyBlock,
): Pick<
  AnyBlock,
  'Model' | 'init' | 'update' | 'mounts' | 'subscriptions' | 'managedResources'
> &
  Readonly<{ view: AnyAuthoredView }> => {
  const segment = block.owner.id
  const allowedIdentities = hostIdentitiesOf(block)
  const lowerReturn = (output: any) =>
    output.commands === undefined
      ? output
      : {
          model: output.model,
          commands: output.commands.map((command: any) =>
            qualifyCommand(
              segment,
              command,
              block.owner,
              undefined,
              allowedIdentities,
            ),
          ),
        }
  const subscriptions = Record.map(block.subscriptions, entry => {
    const lowered = {
      ...qualifyEntry(segment, entry),
      dependenciesToStream: (dependencies: any, readDependencies?: any) =>
        qualifyStream(
          segment,
          entry.dependenciesToStream(dependencies, readDependencies),
        ),
    }
    copyIdentity(entry, lowered)
    return lowered
  })
  const managedResources = Record.map(block.managedResources, entry => {
    const lowered = {
      ...qualifyEntry(segment, entry),
      resource: {
        ...entry.resource,
        key: `${segment}/${entry.resource.key}`,
        _tag: Context.Service(qualifyKey(segment, entry.resource._tag.key)),
      },
      // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
      acquire: (params: any) => qualifyEffect(segment, entry.acquire(params)),
      // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
      release: (value: any) => qualifyEffect(segment, entry.release(value)),
    }
    copyIdentity(entry, lowered)
    return lowered
  })
  return {
    Model: block.Model,
    init: (...args: ReadonlyArray<any>) =>
      withOperationGraph(block.childBindings, () =>
        lowerReturn(block.init(...args)),
      ),
    update: (...args: ReadonlyArray<any>) =>
      withOperationGraph(block.childBindings, () =>
        lowerReturn(block.update(...args)),
      ),
    view: scopeView(segment, requireDefaultView(block), {
      owner: block.owner,
      mounts: block[LocalMountsTypeId],
      childBindings: block.childBindings,
    }),
    mounts: block.mounts,
    subscriptions,
    managedResources,
  }
}

/** @internal Rejects a mismatched host provider before Flags or init can run. */
export const assertComposedHandlers = (
  block: BindableBlock,
  context: Context.Context<never>,
): void => {
  const check = (block: BindableBlock, path: ReadonlyArray<string>): void => {
    for (const { identity, localName } of definitionsOf(block.owner)) {
      const key = path.reduceRight(
        (key, segment) => qualifyKey(segment, key),
        identity.service.key,
      )
      const handler = context.mapUnsafe.get(key)
      if (
        handler !== undefined &&
        Reflect.get(handler, 'identity') !== identity.token
      ) {
        throw new Error(
          `[foldkit] The handler for "${path.join('/')}/${localName}" belongs to a different definition.`,
        )
      }
    }
    for (const binding of block.childBindings) {
      check(runtimeBindingOf(binding).block, [...path, binding.placement])
    }
  }
  check(block, [block.owner.id])
}
