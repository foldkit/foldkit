import {
  directDelivery,
  keyedDelivery,
  keyedSubscriptionDelivery,
  nestedLeafDelivery,
  nestedSubscriptionDelivery,
  nestedSubscriptionGroup,
  oneElementPathDelivery,
  rawSubscriptionDelivery,
  staticSubscriptionDelivery,
} from './accepted.js'

export const relocatedNestedLeafDelivery = nestedLeafDelivery
export const relocatedOneElementPathDelivery = oneElementPathDelivery
export const relocatedDirectDelivery = directDelivery
export const relocatedKeyedDelivery = keyedDelivery
export const relocatedNestedSubscriptionDelivery = nestedSubscriptionDelivery
export const relocatedStaticSubscriptionDelivery = staticSubscriptionDelivery
export const relocatedKeyedSubscriptionDelivery = keyedSubscriptionDelivery
export const relocatedRawSubscriptionDelivery = rawSubscriptionDelivery
export const relocatedNestedSubscriptionGroup = nestedSubscriptionGroup
