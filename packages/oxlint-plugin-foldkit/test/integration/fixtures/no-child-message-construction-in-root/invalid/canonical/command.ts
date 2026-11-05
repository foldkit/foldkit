import { AliasedChildBlock as Entry } from './block'

const save = Entry.Message.ClickedCanonicalSave

export const directChildMessage = Entry.Message.ClickedCanonicalSave()
export const aliasedChildMessage = save()
