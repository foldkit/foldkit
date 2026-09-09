import { Array, Option, Predicate, pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Animation from './animation/public.js'
import * as Button from './button/public.js'
import * as Calendar from './calendar/public.js'
import * as Checkbox from './checkbox/public.js'
import * as Combobox from './combobox/public.js'
import * as DatePicker from './datePicker/public.js'
import * as Dialog from './dialog/public.js'
import * as Disclosure from './disclosure/public.js'
import * as DragAndDrop from './dragAndDrop/public.js'
import * as Fieldset from './fieldset/public.js'
import * as FileDrop from './fileDrop/public.js'
import * as HoverIntent from './hoverIntent/public.js'
import * as Input from './input/public.js'
import * as Listbox from './listbox/public.js'
import * as Menu from './menu/public.js'
import * as Nav from './nav/public.js'
import * as Popover from './popover/public.js'
import * as RadioGroup from './radioGroup/public.js'
import * as Select from './select/public.js'
import * as Slider from './slider/public.js'
import * as Switch from './switch/public.js'
import * as Tabs from './tabs/public.js'
import * as Textarea from './textarea/public.js'
import * as Toast from './toast/public.js'
import * as Tooltip from './tooltip/public.js'
import * as VirtualList from './virtualList/public.js'

type BarrelAudit = Readonly<{
  component: string
  memberCount: number
  tags: ReadonlyArray<string>
  unreachableTags: ReadonlyArray<string>
  siblingConstructorTags: ReadonlyArray<string>
}>

const barrelsByComponent: Readonly<Record<string, Record<string, unknown>>> = {
  animation: Animation,
  button: Button,
  calendar: Calendar,
  checkbox: Checkbox,
  combobox: Combobox,
  datePicker: DatePicker,
  dialog: Dialog,
  disclosure: Disclosure,
  dragAndDrop: DragAndDrop,
  fieldset: Fieldset,
  fileDrop: FileDrop,
  hoverIntent: HoverIntent,
  input: Input,
  listbox: Listbox,
  menu: Menu,
  nav: Nav,
  popover: Popover,
  radioGroup: RadioGroup,
  select: Select,
  slider: Slider,
  switch: Switch,
  tabs: Tabs,
  textarea: Textarea,
  toast: Toast,
  tooltip: Tooltip,
  virtualList: VirtualList,
}

const COMPONENTS_WITH_A_MESSAGE_UNION = [
  'animation',
  'calendar',
  'combobox',
  'datePicker',
  'dialog',
  'dragAndDrop',
  'fileDrop',
  'hoverIntent',
  'listbox',
  'menu',
  'popover',
  'radioGroup',
  'slider',
  'tabs',
  'toast',
  'tooltip',
  'virtualList',
]

// NOTE: A Schema value is callable, so `Predicate.isObject` rejects it. Reading
// a property off one has to accept functions as well as plain objects.
const isIndexable = (
  value: unknown,
): value is Readonly<Record<PropertyKey, unknown>> =>
  Predicate.isObjectKeyword(value)

const maybeProperty = (value: unknown, key: string): Option.Option<unknown> =>
  isIndexable(value) ? Option.fromNullishOr(value[key]) : Option.none()

// NOTE: The tag literal sits on the `_tag` field's AST. Reading
// `fields._tag.literal` instead resolves for a payload-free Message and is
// undefined for every Message that carries fields, which reads as a union with
// no tags rather than as an error. The audit asserts a tag was read for every
// member so that misreading fails instead of passing vacuously.
const maybeTagOf = (member: unknown): Option.Option<string> =>
  pipe(
    maybeProperty(member, 'fields'),
    Option.flatMap(fields => maybeProperty(fields, '_tag')),
    Option.flatMap(tag => maybeProperty(tag, 'ast')),
    Option.flatMap(ast => maybeProperty(ast, 'literal')),
    Option.filter(Predicate.isString),
  )

const maybeMessageUnionMembers = (
  barrel: Record<string, unknown>,
): Option.Option<ReadonlyArray<unknown>> =>
  pipe(
    maybeProperty(barrel['Message'], 'cases'),
    Option.filter(isIndexable),
    Option.map(cases => Object.values(cases)),
  )

const toAudit = (
  component: string,
  members: ReadonlyArray<unknown>,
  barrel: Record<string, unknown>,
): BarrelAudit => {
  const tags = pipe(members, Array.map(maybeTagOf), Array.getSomes)
  const message = barrel['Message']

  return {
    component,
    memberCount: members.length,
    tags,
    unreachableTags: Array.filter(
      tags,
      tag => !isIndexable(message) || typeof message[tag] !== 'function',
    ),
    siblingConstructorTags: Array.filter(
      tags,
      tag => typeof barrel[tag] === 'function',
    ),
  }
}

const audits: ReadonlyArray<BarrelAudit> = pipe(
  Object.entries(barrelsByComponent),
  Array.map(([component, barrel]) =>
    Option.map(maybeMessageUnionMembers(barrel), members =>
      toAudit(component, members, barrel),
    ),
  ),
  Array.getSomes,
)

describe('public Message constructors', () => {
  it('finds a Message union in the components that declare one', () => {
    expect(Array.map(audits, ({ component }) => component)).toEqual(
      COMPONENTS_WITH_A_MESSAGE_UNION,
    )
  })

  it('reads a tag for every member of every Message union', () => {
    const incomplete = Array.filter(
      audits,
      ({ memberCount, tags }) => tags.length !== memberCount,
    )

    expect(incomplete).toEqual([])
  })

  it('exposes every callable constructor through its Message union', () => {
    const shortfalls = pipe(
      audits,
      Array.filter(({ unreachableTags }) =>
        Array.isReadonlyArrayNonEmpty(unreachableTags),
      ),
      Array.map(({ component, unreachableTags }) => ({
        component,
        unreachableTags,
      })),
    )

    expect(shortfalls).toEqual([])
  })

  it('does not export Message constructors as sibling bindings', () => {
    const leaks = pipe(
      audits,
      Array.filter(({ siblingConstructorTags }) =>
        Array.isReadonlyArrayNonEmpty(siblingConstructorTags),
      ),
      Array.map(({ component, siblingConstructorTags }) => ({
        component,
        siblingConstructorTags,
      })),
    )

    expect(leaks).toEqual([])
  })
})
