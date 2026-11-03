import { SkillsComposition } from './composition'

export const init = SkillsComposition.makeInit((initialEntryId: string) => ({
  childInitContext: initialEntryId,
  model: {},
}))
