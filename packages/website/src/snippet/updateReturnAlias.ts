import { Match as M } from 'effect'
import { Update } from 'foldkit'

export type UpdateReturn = Update.Return<Model, Message>

export const withUpdateReturn = M.withReturnType<UpdateReturn>()
