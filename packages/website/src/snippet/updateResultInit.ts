import { ApplicationComposition, HomeBinding } from './composition'

const init = ApplicationComposition.makeInit(() =>
  HomeBinding.init({
    args: [],
    toParentModel: home => ({ home }),
  }),
)
