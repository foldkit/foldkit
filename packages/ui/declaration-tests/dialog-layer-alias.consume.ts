import type { Layer } from 'effect'

import { DatePickerLayer } from './date-picker-layer-alias.accepted.js'
import { DialogLayer } from './dialog-layer-alias.accepted.js'
import { ListboxLayer } from './listbox-layer-alias.accepted.js'
import { MenuLayer } from './menu-layer-alias.accepted.js'
import { PopoverLayer } from './popover-layer-alias.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type DialogLayerRequirements = Expect<
  Equal<Layer.Services<typeof DialogLayer>, never>
>
export type DialogLayerErrors = Expect<
  Equal<Layer.Error<typeof DialogLayer>, never>
>

export type DatePickerLayerRequirements = Expect<
  Equal<Layer.Services<typeof DatePickerLayer>, never>
>
export type DatePickerLayerErrors = Expect<
  Equal<Layer.Error<typeof DatePickerLayer>, never>
>

export type ListboxLayerRequirements = Expect<
  Equal<Layer.Services<typeof ListboxLayer>, never>
>
export type ListboxLayerErrors = Expect<
  Equal<Layer.Error<typeof ListboxLayer>, never>
>

export type MenuLayerRequirements = Expect<
  Equal<Layer.Services<typeof MenuLayer>, never>
>
export type MenuLayerErrors = Expect<
  Equal<Layer.Error<typeof MenuLayer>, never>
>

export type PopoverLayerRequirements = Expect<
  Equal<Layer.Services<typeof PopoverLayer>, never>
>
export type PopoverLayerErrors = Expect<
  Equal<Layer.Error<typeof PopoverLayer>, never>
>
