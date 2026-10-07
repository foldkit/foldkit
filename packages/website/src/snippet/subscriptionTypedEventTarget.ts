const slowWarningTarget: Dom.TypedEventTarget<{
  'foldkit:slow-warning': CustomEvent<SlowWarningReport>
}> = new EventTarget()
