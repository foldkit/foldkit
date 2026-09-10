import { Array, Option } from 'effect'
import { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { evo } from 'foldkit/struct'

import { Applicant } from './applicant'
import { GotApplicantMessage, type Message } from './message'
import type { Model } from './model'

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.ul(
    [h.Class('flex flex-col gap-4')],
    Array.map(model.applicants, applicant =>
      h.keyed('li')(
        applicant.id,
        [],
        [
          h.submodel({
            slotId: applicant.id,
            model: applicant.entry,
            view: Applicant.view,
            toParentMessage: message =>
              GotApplicantMessage({ entryId: applicant.id, message }),
          }),
        ],
      ),
    ),
  )

const foldApplicant = (entryId: string) =>
  Update.foldChild({
    update: Applicant.update,
    read: (model: Model) =>
      Option.map(
        Array.findFirst(
          model.applicants,
          applicant => applicant.id === entryId,
        ),
        applicant => applicant.entry,
      ),
    write: (model, nextEntry) =>
      evo(model, {
        applicants: Array.map(applicant =>
          applicant.id === entryId
            ? evo(applicant, { entry: () => nextEntry })
            : applicant,
        ),
      }),
    toParentMessage: message => GotApplicantMessage({ entryId, message }),
  })

GotApplicantMessage: ({ entryId, message }) =>
  foldApplicant(entryId)(model, message)
