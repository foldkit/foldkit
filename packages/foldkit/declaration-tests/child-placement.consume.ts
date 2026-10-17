import {
  DeclarationChildPlacementParentComposition,
  DefaultAccessorBinding,
  DefaultPlacementComposition,
  EntriesBinding,
  EntriesByIdBinding,
  EntriesByIdLengthBinding,
  OptionalBinding,
  PrimaryBinding,
  SecondaryBinding,
  composeDynamicChildren,
} from './child-placement.accepted.js'

const primaryPlacement: 'primary' = PrimaryBinding.placement
const secondaryPlacement: 'secondaryPlacement' = SecondaryBinding.placement
const optionalPlacement: 'optional' = OptionalBinding.placement
const entriesPlacement: 'entries' = EntriesBinding.placement
const defaultAccessorPlacement: 'DeclarationChildPlacementChild' =
  DefaultAccessorBinding.placement
const entriesByIdPlacement: 'entriesById' = EntriesByIdBinding.placement
const entriesByIdLengthPlacement: 'entriesByIdLength' =
  EntriesByIdLengthBinding.placement

const childBindings: readonly [
  typeof PrimaryBinding,
  typeof SecondaryBinding,
  typeof OptionalBinding,
  typeof EntriesBinding,
] = DeclarationChildPlacementParentComposition.childBindings

const defaultPlacementChildren: readonly [
  typeof DefaultAccessorBinding,
  typeof EntriesByIdBinding,
  typeof EntriesByIdLengthBinding,
] = DefaultPlacementComposition.childBindings

composeDynamicChildren([PrimaryBinding, PrimaryBinding])

void primaryPlacement
void secondaryPlacement
void optionalPlacement
void entriesPlacement
void defaultAccessorPlacement
void entriesByIdPlacement
void entriesByIdLengthPlacement
void childBindings
void defaultPlacementChildren
