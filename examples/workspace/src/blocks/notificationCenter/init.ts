import { NotificationCenterComposition } from './composition'

export const init = NotificationCenterComposition.makeInit(() => ({
  model: { notifications: [], currentTimeMillis: 0 },
}))
