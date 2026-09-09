import { AppRoute } from '../route'

export const TopLevelRoute = AppRoute.subset(['Home', 'Newsletter', 'NotFound'])
export type TopLevelRoute = typeof TopLevelRoute.Type
