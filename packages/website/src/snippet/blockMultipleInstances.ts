import { Array, Option } from 'effect'
import { defineApplication } from 'foldkit'

import { Applicant } from './applicant'
import { Message } from './message'
import { Model } from './model'

const Application = defineApplication({ Model, Message })

export const ApplicantsBinding = Application.bindChild(Applicant.block, {
  field: 'applicants',
  key: 'id',
  childField: 'entry',
  toParentMessage: (applicantId, message) =>
    Message.GotApplicantMessage({ applicantId, message }),
  fromParentMessage: {
    parentMessage: Message.GotApplicantMessage,
    args: (_model, { applicantId, message }) =>
      Option.some([applicantId, message]),
  },
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [ApplicantsBinding],
})

export const update = ApplicationComposition.makeUpdate()

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
