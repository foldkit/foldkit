import { Match as M } from 'effect'
import { Update } from 'foldkit'

export type Commands = Update.Commands<Message, NotesServices>

export type UpdateReturn = Update.Return<Model, Message, NotesServices>

export const withUpdateReturn = M.withReturnType<UpdateReturn>()
