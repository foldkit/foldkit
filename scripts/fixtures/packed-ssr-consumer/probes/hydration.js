;(() => {
  const probe = window.__probe
  const field = document.querySelector('#field')
  const increment = document.querySelector('#increment')
  const root = document.querySelector('#app-root')
  const shield = document.querySelector('[data-foldkit-refusal-shield]')
  const adoptedFrame = document.querySelector('#adopted-frame')
  const frameDocuments = window.__adoptedFrameDocuments
  const parserOwnedHost = document.querySelector('#parser-owned')
  const parserViewChild = parserOwnedHost?.querySelector('#parser-view-child')
  if (
    !document.body.hasAttribute('inert') &&
    typeof probe.parserOwnedHost?.mutateOwned === 'function'
  ) {
    probe.parserOwnedHost.mutateOwned()
  }
  return {
    rootIsConnected: probe.root instanceof Element && probe.root.isConnected,
    fieldIsSameElement: field === probe.field,
    fieldValue: field === null ? '<no field>' : field.value,
    adoptedFrameIsSameElement: adoptedFrame === probe.adoptedFrame,
    adoptedFrameLoads: frameDocuments.length,
    adoptedFrameDocumentIsSame:
      adoptedFrame instanceof HTMLIFrameElement &&
      frameDocuments.length === 1 &&
      frameDocuments[0] === adoptedFrame.contentDocument,
    customHolderConstructions: window.__customElementConstructions.holder,
    innerProbeConstructions: window.__customElementConstructions.inner,
    idPropertyWrites: window.__idPropertyWrites,
    innerHtmlPropertyWrites: window.__innerHtmlPropertyWrites,
    renderedCount: increment === null ? '<no button>' : increment.textContent,
    // Marked in place, not wrapped. A single marker in the whole document is
    // what says nothing was reparented: an inserted shield would be a second.
    rootIsContained:
      document.body.hasAttribute('inert') &&
      document.body.getAttribute('aria-hidden') === 'true' &&
      document.body.hasAttribute('data-foldkit-refused') &&
      document.querySelectorAll('[data-foldkit-refused]').length === 1 &&
      document.querySelectorAll('[data-foldkit-refusal-shield]').length === 1 &&
      shield.open === true &&
      (root === null || root.isConnected),
    shieldIsVisible:
      shield instanceof HTMLDialogElement &&
      shield.open === true &&
      shield.getBoundingClientRect().width > 0 &&
      shield.getBoundingClientRect().height > 0 &&
      getComputedStyle(shield).visibility === 'visible',
    customElementConnections:
      typeof window.__connections === 'number' ? window.__connections : 0,
    reconnectModalIsOpen: (() => {
      const dialog = document.querySelector('#reconnect-modal')
      return dialog === null ? false : dialog.open === true
    })(),
    parserConnectionChildCount:
      window.__parserOwnedConnectionChildCounts[0] ?? -1,
    parserConnectionCount: window.__parserOwnedConnectionChildCounts.length,
    parserChildrenBeforeHydration: probe.parserChildrenBeforeHydration,
    parserOwnedHostIsFresh: parserOwnedHost !== probe.parserOwnedHost,
    parserOldHostIsDisconnected: probe.parserOwnedHost?.isConnected === false,
    parserViewChildIsFresh:
      parserOwnedHost?.childElementCount === 1 &&
      parserViewChild !== probe.parserComponentChild &&
      parserViewChild !== probe.parserServerChild,
    parserComponentChildIsDisconnected:
      probe.parserComponentChild?.isConnected === false,
    parserServerChildIsDisconnected:
      probe.parserServerChild?.isConnected === false,
    parserLiveTitleIsRestored:
      parserOwnedHost?.getAttribute('title') === 'view-owned',
    parserAncestorTitleIsRestored:
      document.querySelector('#release-form')?.getAttribute('title') ===
      'form-owned',
    parserEarlierSiblingTitleIsRestored:
      document.querySelector('#parser-earlier')?.getAttribute('title') ===
      'earlier-owned',
    parserEarlierSiblingTextIsRestored:
      document.querySelector('#parser-earlier')?.textContent === 'earlier-text',
    parserDisconnectMutationsAreIsolated:
      window.__parserChildDisconnections === 2 &&
      probe.parserOwnedHost?.querySelectorAll('[data-parser-reinserted]')
        .length === 2 &&
      parserOwnedHost?.querySelector('[data-parser-reinserted]') === null,
    parserRetainedMutationIsIsolated:
      probe.parserComponentChild?.textContent === 'component-mutated' &&
      parserViewChild?.textContent === 'view',
  }
})()
