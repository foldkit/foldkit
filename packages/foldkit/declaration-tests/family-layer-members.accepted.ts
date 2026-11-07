import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { makeFamilyDeclaration, resolveFamily } from 'foldkit/internal/block'

export const Model = Schema.Number
export type Model = typeof Model.Type
export const FamilyMembersKey = Symbol('FamilyMembers')
export const Definition = makeFamilyDeclaration('FamilyMembers', {
  key: FamilyMembersKey,
  Model,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const Composition = Definition.makeComposition()
const init = Composition.makeInit(() => ({ model: 0 }))
const update = Composition.makeUpdate({})
export const build = () =>
  Definition.makeLayer(
    Effect.succeed({
      children: [],
      init,
      update,
    }),
  )
export class Family extends Context.Service<Family, Block.FamilyLifetime>()(
  'FamilyMembers/Provider',
) {}
export const layer = Layer.effect(Family, Block.familyLifetime)
export const Resolved = resolveFamily(Definition, Family, build, {
  members: { readValue: (model: Model) => model },
})
