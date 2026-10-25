import { Array } from 'effect'
import { Block } from 'foldkit'

import { Applicant } from './applicant'
import { Message } from './message'
import { Model } from './model'

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const ApplicantsBinding = ApplicationDefinition.makeBinding(
  Applicant.ApplicantBlock,
  {
    field: 'applicants',
    key: 'id',
    childField: 'entry',
  },
)

const ApplicationComposition = ApplicationDefinition.makeComposition({
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
