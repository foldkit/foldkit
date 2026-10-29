import { ApplicationRoute } from '../route'

export const TopLevelRoute = ApplicationRoute.subset([
  'Home',
  'Newsletter',
  'NotFound',
])
export type TopLevelRoute = typeof TopLevelRoute.Type
