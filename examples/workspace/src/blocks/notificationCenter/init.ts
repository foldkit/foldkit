import { NotificationCenterComposition } from './composition'

export const init = NotificationCenterComposition.makeInit(() => ({
  model: { notifications: [], now: 0 },
}))
