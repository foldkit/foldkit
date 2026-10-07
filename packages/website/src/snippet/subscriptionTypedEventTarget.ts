const slowWarningTarget: Browser.TypedEventTarget<{
  'foldkit:slow-warning': CustomEvent<SlowWarningReport>
}> = new EventTarget()
