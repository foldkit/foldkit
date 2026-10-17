import { define as defineApplication } from 'foldkit/application'

import { Model, Message, init, update as update_, view as view_ } from './todo'

export const Application = defineApplication({ Model, Message })
export const ApplicationComposition = Application.makeComposition()
export const update = ApplicationComposition.makeUpdate(update_)
export const view = ApplicationComposition.makeView(view_)
export { init }
