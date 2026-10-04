const slowWarningTarget: Subscription.TypedEventTarget<{
  'foldkit:slow-warning': CustomEvent<SlowWarningReport>
}> = new EventTarget()
