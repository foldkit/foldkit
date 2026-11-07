import { assertCompletedBlock } from './assemblyState.js'
import { assertBindingRelationship } from './bindingRelationship.js'
import { makeVariantBindingRuntime } from './variantBinding.js'

type Constructor = (child: object, config: object) => object

/** @internal Private executable lowerers behind the parent-owned constructors. */
export type BindingLowerers = Readonly<{
  direct: Constructor
  map: Constructor
}>

const lowerers = new WeakMap<object, BindingLowerers>()

/** @internal Resolves the original parent's private executable lowerers. */
export const bindingLowerersOf = (parent: object): BindingLowerers => {
  const value = lowerers.get(Reflect.get(parent, 'makeRequiredFieldBinding'))

  if (value === undefined) {
    throw new Error(
      '[foldkit] The parent has no registered Binding constructors.',
    )
  }

  return value
}

/** @internal Adds explicit relationship selection before the existing Binding lowerers. */
export const makeBindingConstructors = (
  parent: object,
  direct: Constructor,
  map: Constructor,
  assertChild: (child: object) => void = assertCompletedBlock,
) => {
  const make =
    (
      kind: Parameters<typeof assertBindingRelationship>[0],
      lower: Constructor,
    ) =>
    (child: object, config: object): unknown => {
      assertChild(child)

      assertBindingRelationship(
        kind,
        Reflect.get(parent, 'Model'),
        Reflect.get(child, 'Model'),
        config,
      )

      return lower(child, config)
    }

  const constructors = {
    makeRequiredFieldBinding: make('Required', direct),
    makeOptionalFieldBinding: make('Optional', direct),
    makeOptionalKeyedFieldBinding: make('OptionalKeyed', direct),
    makeKeyedArrayBinding: make('KeyedArray', direct),
    makeRecordBinding: make('Record', map),
    makeHashMapBinding: make('HashMap', map),
    makeCustomBinding: make('Custom', direct),
    makeCustomKeyedBinding: make('CustomKeyed', direct),
    makeVariantBinding: (child: object, config?: object): unknown => {
      assertChild(child)

      return makeVariantBindingRuntime(
        Reflect.get(parent, 'Model'),
        direct,
        child,
        config,
      )
    },
  }
  lowerers.set(
    constructors.makeRequiredFieldBinding,
    Object.freeze({ direct, map }),
  )

  return constructors
}
