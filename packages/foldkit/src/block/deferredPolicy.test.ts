import { expectTypeOf, it } from 'vitest'

import type { AnyBinding } from './binding.js'
import type { BindingAt } from './deferredPolicy.js'

declare enum PlacementEnum {
  Alpha = 'alpha',
  Gamma = 'gamma',
}

type BindingWithPlacement<
  Placement extends string,
  Id extends number,
> = AnyBinding & Readonly<{ placement: Placement; id: Id }>

type Alpha = BindingWithPlacement<'alpha', 1>
type Beta = BindingWithPlacement<'beta', 2>
type Widened = BindingWithPlacement<string, 3>
type Templated = BindingWithPlacement<`item-${string}`, 4>
type Either = BindingWithPlacement<'alpha' | 'beta', 5>
type Item = BindingWithPlacement<'item-1', 6>
type AlphaMember = BindingWithPlacement<PlacementEnum.Alpha, 7>
type GammaMember = BindingWithPlacement<PlacementEnum.Gamma, 8>
type Nil = BindingWithPlacement<never, 9>
type Wild = BindingWithPlacement<any, 10>

type Children = readonly [
  Alpha,
  Beta,
  Widened,
  Templated,
  Either,
  Item,
  AlphaMember,
  GammaMember,
]

it('resolves a literal placement to every Binding whose placement is assignable to it', () => {
  expectTypeOf<BindingAt<Children, 'alpha'>>().toEqualTypeOf<
    Alpha | AlphaMember
  >()
  expectTypeOf<BindingAt<Children, 'beta'>>().toEqualTypeOf<Beta>()
  expectTypeOf<BindingAt<Children, 'item-1'>>().toEqualTypeOf<Item>()
  expectTypeOf<BindingAt<Children, 'missing'>>().toEqualTypeOf<never>()
})

it('resolves enum member placements by their own type and by their value literal', () => {
  expectTypeOf<
    BindingAt<Children, PlacementEnum.Alpha>
  >().toEqualTypeOf<AlphaMember>()
  expectTypeOf<BindingAt<Children, 'gamma'>>().toEqualTypeOf<GammaMember>()
  expectTypeOf<BindingAt<Children, PlacementEnum>>().toEqualTypeOf<
    AlphaMember | GammaMember
  >()
})

it('scans every Binding for a widened, templated, or union placement', () => {
  expectTypeOf<BindingAt<Children, string>>().toEqualTypeOf<Children[number]>()
  expectTypeOf<BindingAt<Children, `item-${string}`>>().toEqualTypeOf<
    Templated | Item
  >()
  expectTypeOf<BindingAt<Children, 'alpha' | 'beta'>>().toEqualTypeOf<
    Alpha | Beta | Either | AlphaMember
  >()
})

it('resolves nothing for a never lookup and every Binding for an any lookup', () => {
  expectTypeOf<BindingAt<Children, never>>().toEqualTypeOf<never>()
  expectTypeOf<BindingAt<Children, any>>().toEqualTypeOf<Children[number]>()
})

it('resolves a never or any placement for every lookup', () => {
  type Degenerate = readonly [Alpha, Nil, Wild]

  expectTypeOf<BindingAt<Degenerate, 'alpha'>>().toEqualTypeOf<
    Alpha | Nil | Wild
  >()
  expectTypeOf<BindingAt<Degenerate, 'beta'>>().toEqualTypeOf<Nil | Wild>()
})

it('resolves nothing when no Binding is registered', () => {
  expectTypeOf<BindingAt<readonly [], 'alpha'>>().toEqualTypeOf<never>()
})
