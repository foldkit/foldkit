import type { ContractNamespaceMakeDefinition } from '../experimental/contracted/runtime.js'
import {
  type Namespace as NativeNamespace,
  type NamespaceMakeDefinition as NativeNamespaceMakeDefinition,
  makeNamespace as makeNativeNamespace,
} from './define.js'
import { defineWithNamespace } from './makeDefinition.js'
import {
  type NamespaceIdentity,
  registerNamespace,
} from './namespaceIdentity.js'

/** Establishes native or independent contracts under one existing owner. */
export type NamespaceMakeDefinition<
  Id extends string,
  Concrete extends boolean = true,
> = ContractNamespaceMakeDefinition<Id> &
  NativeNamespaceMakeDefinition<Id, Concrete>

/** A shared owner for effects declared before a Block's Schema contracts. */
export type Namespace<
  Id extends string,
  Concrete extends boolean = true,
> = Omit<NativeNamespace<Id, Concrete>, 'makeDefinition'> &
  Readonly<{ makeDefinition: NamespaceMakeDefinition<Id, Concrete> }> &
  NamespaceIdentity<Id>

/** Declares an owner shared by effects and subsequently authored Block contracts. */
export function makeNamespace(
  id: '' | `${string}/${string}` | `${string}::${string}`,
): never
export function makeNamespace<const Id extends string>(
  id: Id & (string extends Id ? never : unknown),
): Namespace<Id, true>
export function makeNamespace<const Id extends string>(
  id: Id,
): Namespace<Id, false>
export function makeNamespace(id: string): any {
  const namespace = makeNativeNamespace(id)

  const shared = {
    ...namespace,
    makeDefinition: (config: unknown) =>
      defineWithNamespace(id, config, contracts =>
        Reflect.apply(namespace.makeDefinition, undefined, [contracts]),
      ),
  }
  registerNamespace(shared, {
    id,
    makeDefinition: contracts =>
      Reflect.apply(namespace.makeDefinition, undefined, [contracts]),
  })

  return shared
}
