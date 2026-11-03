import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import type * as Html from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { makeBlock as makeTabsBlock } from '@foldkit/ui/tabs'

const Tab = Schema.Literals(['Profile', 'Billing'])
type Tab = typeof Tab.Type

const SettingsTabsBlock = makeTabsBlock<Tab>()
const Model = Schema.Struct({
  count: Schema.Number,
  tabs: SettingsTabsBlock.Model,
})
type Model = typeof Model.Type
const Message = defineMessageUnion({ ChangedCount: { value: Schema.Number } })
type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')
const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const { makeNoopStep } = ApplicationDefinition
const TabsBinding = ApplicationDefinition.makeBinding(SettingsTabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => Tuple.make({ id: 'settings' }) },
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SettingsTabsBlock, {
    Selected: makeNoopStep,
  }),
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [TabsBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
export type ApplicationViewMessage = Html.MessageOf<ApplicationViewBuilder>

export const localMessage: Extract<
  ApplicationViewMessage,
  Readonly<{ _tag: 'ChangedCount' }>
> = Message.ChangedCount({ value: 2 })

export const hasChildDelivery: 'GotTabsMessage' extends ApplicationViewMessage['_tag']
  ? true
  : false = true

export const preserveMessage = (message: ApplicationViewMessage) => message

preserveMessage(Message.ChangedCount({ value: 3 }))
// @ts-expect-error The local payload remains Number after projecting the builder.
preserveMessage({ _tag: 'ChangedCount', value: 'wrong' })
// @ts-expect-error The projection does not admit unrelated Message tags.
preserveMessage({ _tag: 'Unknown' })

export const rejectUnknownBuilder: Html.MessageOf<unknown> extends never
  ? true
  : false = true
