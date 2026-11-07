import { Array, Schema } from 'effect'
import { Block } from 'foldkit'

import { Applicant } from './applicant'
import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeKeyedArrayBinding, makeComposition } = ApplicationBlock

export const ApplicantsBinding = makeKeyedArrayBinding(
  Applicant.ApplicantBlock,
  {
    field: 'applicants',
    key: 'id',
    childField: 'entry',
  },
)

const ApplicationComposition = makeComposition({
  bindings: [ApplicantsBinding],
})

export const update = ApplicationComposition.makeUpdate({})

export const view = ApplicationComposition.makeView((model, h) =>
  h.ul(
    [h.Class('flex flex-col gap-4')],
    Array.map(model.applicants, applicant =>
      h.keyed('li')(
        applicant.id,
        [],
        [
          h.block(
            ApplicantsBinding.embedView({
              key: applicant.id,
              slotId: applicant.id,
              model: applicant.entry,
            }),
          ),
        ],
      ),
    ),
  ),
)
