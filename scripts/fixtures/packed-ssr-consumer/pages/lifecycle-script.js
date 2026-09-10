window.__connections = 0
class ReconnectProbe extends HTMLElement {
  connectedCallback() {
    window.__connections++
    if (window.__connections === 2) {
      const dialog = document.createElement('dialog')
      dialog.id = 'reconnect-modal'
      dialog.innerHTML = '<input id="reconnect-field">'
      document.body.appendChild(dialog)
      dialog.showModal()
    }
  }
}
customElements.define('x-reconnect-probe', ReconnectProbe)
