import { Array, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { buttonId } from '@foldkit/ui/listbox'

import type { Member } from './domain/domain'
import { WorkspaceListbox, listboxViewInputs } from './listbox'

const Model = Schema.Struct({
  activeMemberId: Schema.String,
  activeMemberListbox: WorkspaceListbox,
})
type Model = typeof Model.Type

type ViewInput = Readonly<{ members: ReadonlyArray<Member> }>

export class MemberSwitcher extends Block<MemberSwitcher, void, ViewInput>()(
  'MemberSwitcher',
  { Model },
) {}

export const MemberSwitcherLive = MemberSwitcher.make(
  Effect.fn(function* () {
    const activeMemberListbox = yield* new WorkspaceListbox(
      'activeMemberListbox',
      { id: 'workspace-active-member' },
    )

    return {
      model: { activeMemberId: 'maya', activeMemberListbox },

      update: {
        ...activeMemberListbox.on<Model>({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { activeMemberId: () => value }),
          }),
        }),
      },

      view: (model, h, { members }) =>
        h.div(
          [
            h.Class(
              'flex items-center gap-2.5 text-[13px] font-medium text-slate-600',
            ),
          ],
          [
            h.label(
              [
                h.For(buttonId(model.activeMemberListbox.model.id)),
                h.Class('sr-only sm:not-sr-only sm:shrink-0'),
              ],
              ['Active member'],
            ),
            h.div(
              [h.Class('w-40')],
              [
                model.activeMemberListbox.view(
                  listboxViewInputs({
                    value: model.activeMemberId,
                    options: Array.map(members, member => ({
                      value: member.id,
                      label: member.name,
                    })),
                  }),
                ),
              ],
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(WorkspaceListbox.Live))
