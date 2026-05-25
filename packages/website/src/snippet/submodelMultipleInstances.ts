import { Array, Option } from 'effect'
import { Command } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { evo } from 'foldkit/struct'

import { Applicant } from './applicant'
import { GotApplicantMessage, type Message } from './message'
import type { Model } from './model'

// View: iterate the array of children and embed each as its own
// `h.submodel`. The `id` is the stable per-instance identifier. The
// wrapper Message carries `entryId` so update can route back.
export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex flex-col gap-4')],
    Array.map(model.applicants, applicant =>
      h.submodel({
        slotId: applicant.id,
        model: applicant.entry,
        view: Applicant.view,
        toParentMessage: message =>
          GotApplicantMessage({ entryId: applicant.id, message }),
      }),
    ),
  )
}

// Update: route the wrapper Message by `entryId` to the right slice.
// Find the matching applicant, delegate to the child's update, and
// re-wrap any Commands the child returned with the same `entryId`.
GotApplicantMessage: ({ entryId, message }) =>
  Option.match(
    Array.findFirst(model.applicants, applicant => applicant.id === entryId),
    {
      onNone: () => [model, []],
      onSome: matchedApplicant => {
        const [nextEntry, commands] = Applicant.update(
          matchedApplicant.entry,
          message,
        )
        return [
          evo(model, {
            applicants: Array.map(applicant =>
              applicant.id === entryId
                ? evo(applicant, { entry: () => nextEntry })
                : applicant,
            ),
          }),
          Command.mapMessages(commands, childMessage =>
            GotApplicantMessage({ entryId, message: childMessage }),
          ),
        ]
      },
    },
  )
