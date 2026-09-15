import { Submodel } from 'foldkit'

import { Child } from './child'

const save = Child.Message.ClickedChildViewSave

export const view = Submodel.defineView<Child.Model, Child.Message>(
  (_model, h) => h.button([h.OnClick(save())]),
)
