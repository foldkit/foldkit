;(() => {
  const probe = window.__topLayerProbe
  const shield = document.querySelector(
    ':root > dialog[data-foldkit-refusal-shield]',
  )
  const pointOf = element => {
    const bounds = element.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    }
  }
  return {
    shieldIsOpen: shield instanceof HTMLDialogElement && shield.open === true,
    shieldIsVisible:
      shield instanceof HTMLDialogElement &&
      shield.getBoundingClientRect().width > 0 &&
      shield.getBoundingClientRect().height > 0 &&
      getComputedStyle(shield).visibility === 'visible',
    shieldHasFocus: document.activeElement === shield,
    shieldCount: document.querySelectorAll(
      ':root > dialog[data-foldkit-refusal-shield]',
    ).length,
    dialogsAreOpen: probe.dialogs.every(dialog => dialog.open === true),
    closeEvents: probe.events.close,
    cancelEvents: probe.events.cancel,
    controlClicks: probe.events.click,
    documentInputs: probe.events.documentInput,
    bodyKeyEvents: probe.events.bodyKey,
    fieldValues: probe.fields.map(field => field.value),
    modalNodesAreConnected:
      probe.dialogs.every(dialog => dialog.isConnected) &&
      probe.fields.every(field => field.isConnected),
    openShadowIdentityIsIntact:
      probe.openHost.shadowRoot.querySelector('dialog') === probe.openDialog,
    frameIdentityIsIntact:
      document.querySelector('#modal-frame') === probe.frame,
    customElementIdentityIsIntact:
      document.querySelector('x-closed-modal-host') === probe.closedHost,
    customElementConnections: probe.events.connected,
    customElementDisconnections: probe.events.disconnected,
    points: probe.actions.map(pointOf),
  }
})()
