import { Record, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const Model = Schema.Record(Schema.String, Schema.Boolean)
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ToggledDisclosure: { id: Schema.String, isOpen: Schema.Boolean },
})
type Message = typeof Message.Type

const DisclosuresComposition = makeDefinition('Disclosures', {
  Model,
  Message,
}).makeComposition()
const update = DisclosuresComposition.makeUpdate({
  ToggledDisclosure: (model, { id, isOpen }) => ({
    model: Record.set(model, id, isOpen),
  }),
})

const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()
const updateApplication = ApplicationComposition.makeUpdate({
  ToggledDisclosure: (model, { id, isOpen }) => ({
    model: Record.set(model, id, isOpen),
  }),
})

it('preserves a Record Model through owned graphless Block updates', () => {
  expectTypeOf<ReturnType<typeof update>['model']>().toEqualTypeOf<Model>()

  const toggled = update(
    Model.make({ faq: false }),
    Message.ToggledDisclosure({ id: 'faq', isOpen: true }),
  )

  expect(toggled.model).toEqual({ faq: true })
})

it('preserves a Record Model through owned graphless root updates', () => {
  expectTypeOf<
    ReturnType<typeof updateApplication>['model']
  >().toEqualTypeOf<Model>()

  const toggled = updateApplication(
    Model.make({ faq: true }),
    Message.ToggledDisclosure({ id: 'faq', isOpen: false }),
  )

  expect(toggled.model).toEqual({ faq: false })
})
