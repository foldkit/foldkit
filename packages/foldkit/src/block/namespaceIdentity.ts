declare const NamespaceIdentityTypeId: unique symbol

/** @internal Retains a shared namespace's readable identity without its authoring graph. */
export interface NamespaceIdentity<Id extends string> {
  readonly [NamespaceIdentityTypeId]: Id
}

type NamespaceSource = Readonly<{
  id: string
  makeDefinition: (contracts: object) => object
}>

const namespaces = new WeakMap<object, NamespaceSource>()

/** @internal Retains the original native owner used by a public namespace. */
export const registerNamespace = (
  namespace: object,
  source: NamespaceSource,
): void => {
  namespaces.set(namespace, source)
}

/** @internal Requires an original namespace before forwarding its shared owner. */
export const namespaceSourceOf = (namespace: object): NamespaceSource => {
  const source = namespaces.get(namespace)

  if (source === undefined) {
    throw new Error(
      '[foldkit] Family contracts require an original Block namespace.',
    )
  }

  return source
}
