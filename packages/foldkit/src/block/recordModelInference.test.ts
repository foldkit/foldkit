import { Record, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { define as defineApplication } from '../runtime/applicationPublic.js'
import { define } from './define.js'

const Model = Schema.Record(Schema.String, Schema.Boolean)
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ToggledDisclosure: { id: Schema.String, isOpen: Schema.Boolean },
})

const Disclosures = define('Disclosures', { Model, Message })
const DisclosuresComposition = Disclosures.makeComposition()
const update = DisclosuresComposition.makeUpdate((model, { id, isOpen }) => ({
  model: Record.set(model, id, isOpen),
}))

const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition()
const updateApplication = ApplicationComposition.makeUpdate(
  (model, { id, isOpen }) => ({ model: Record.set(model, id, isOpen) }),
)

it('preserves a Record Model through owned graphless Block updates', () => {
  expectTypeOf<ReturnType<typeof update>['model']>().toEqualTypeOf<Model>()

  const toggled = update(
    Model.make({ faq: false }),
    Message.ToggledDisclosure({ id: 'faq', isOpen: true }),
  )

  expect(toggled.model).toEqual({ faq: true })
})

it('preserves a Record Model through owned graphless Application updates', () => {
  expectTypeOf<
    ReturnType<typeof updateApplication>['model']
  >().toEqualTypeOf<Model>()

  const toggled = updateApplication(
    Model.make({ faq: true }),
    Message.ToggledDisclosure({ id: 'faq', isOpen: false }),
  )

  expect(toggled.model).toEqual({ faq: false })
})
