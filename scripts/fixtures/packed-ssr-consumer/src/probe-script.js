window.__probe = (function () {
  var root = document.querySelector('[data-foldkit-app]')
  var field = document.querySelector('#field')
  if (field !== null) {
    field.value = '{{TYPED_VALUE}}'
  }
  window.__observedIdChanges = []
  window.__customElementConstructions = { holder: 0, inner: 0 }
  window.__idPropertyWrites = 0
  window.__innerHtmlPropertyWrites = 0
  class ObservedId extends HTMLElement {
    constructor() {
      super()
      window.__customElementConstructions.holder++
    }
    static get observedAttributes() {
      return ['id', 'dir']
    }
    get id() {
      return 'component-id'
    }
    set id(value) {
      window.__idPropertyWrites++
    }
    get innerHTML() {
      return 'component markup'
    }
    set innerHTML(value) {
      window.__innerHtmlPropertyWrites++
    }
    attributeChangedCallback(name, oldValue, newValue) {
      window.__observedIdChanges.push([name, oldValue, newValue])
    }
  }
  customElements.define('x-observed-id', ObservedId)
  class InnerProbe extends HTMLElement {
    constructor() {
      super()
      window.__customElementConstructions.inner++
    }
  }
  customElements.define('x-inner-probe', InnerProbe)
  var styled = document.querySelector('#styled')
  window.__styleMutations = []
  var styleObserver = new MutationObserver(function (records) {
    window.__styleMutations.push.apply(window.__styleMutations, records)
  })
  window.__readStyleMutationCount = function () {
    window.__styleMutations.push.apply(
      window.__styleMutations,
      styleObserver.takeRecords(),
    )
    return window.__styleMutations.length
  }
  if (styled !== null) {
    styleObserver.observe(styled, {
      attributes: true,
      attributeFilter: ['style'],
    })
  }
  var controlledNodes = {}
  for (var id of [
    'equal-value',
    'equal-checked',
    'raw-select',
    'released-textarea',
    'released-output',
    'inner-select',
    'released-file',
    'released-size',
    'released-tabindex',
    'released-dimensions',
    'released-start',
    'styled',
    'observed-id',
    'custom-inner-probe',
    'native-inner-html',
    'native-inner-probe',
  ]) {
    controlledNodes[id] = document.getElementById(id)
  }
  var parserOwnedHost = document.getElementById('parser-owned')
  return {
    root: root,
    field: field,
    controlledNodes: controlledNodes,
    observedIdChangesAtDefinition: window.__observedIdChanges.length,
    customElementConstructionsAtDefinition: {
      holder: window.__customElementConstructions.holder,
      inner: window.__customElementConstructions.inner,
    },
    adoptedFrame: document.getElementById('adopted-frame'),
    parserOwnedHost: parserOwnedHost,
    parserComponentChild: parserOwnedHost.componentOwnedChild,
    parserServerChild: parserOwnedHost.lastElementChild,
    parserChildrenBeforeHydration: parserOwnedHost.childElementCount,
    styleObserver: styleObserver,
  }
})()
