import type {
  CreateHook,
  DestroyHook,
  PostHook,
  PreHook,
  RemoveHook,
  UpdateHook,
} from './hooks.js'

export type Module = Partial<{
  dataMask: number
  pre: PreHook
  create: CreateHook
  update: UpdateHook
  destroy: DestroyHook
  remove: RemoveHook
  post: PostHook
}>
