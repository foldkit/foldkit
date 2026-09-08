const events = {
  bodyKey: 0,
  cancel: 0,
  click: 0,
  close: 0,
  connected: 0,
  disconnected: 0,
  documentInput: 0,
}
document.addEventListener('pointerdown', () => {
  events.documentInput++
})
document.body.addEventListener('keydown', () => {
  events.bodyKey++
})
document.body.addEventListener('keyup', () => {
  events.bodyKey++
})
const configure = (dialog, field, left) => {
  dialog.style.left = left
  dialog.style.margin = '0'
  dialog.style.top = '20px'
  dialog.addEventListener('cancel', event => {
    events.cancel++
    event.preventDefault()
  })
  dialog.addEventListener('close', () => {
    events.close++
    dialog.showModal()
    field.focus()
  })
}
const lightDialog = document.getElementById('light-modal')
const lightField = lightDialog.querySelector('input')
const lightAction = lightDialog.querySelector('a')
lightAction.addEventListener('click', () => events.click++)
configure(lightDialog, lightField, '20px')
lightDialog.showModal()
const openHost = document.getElementById('open-modal-host')
const openRoot = openHost.attachShadow({ mode: 'open' })
openRoot.innerHTML =
  '<dialog><input><form action="/modal-submitted"><button type="submit">Submit</button></form></dialog>'
const openDialog = openRoot.querySelector('dialog')
const openField = openRoot.querySelector('input')
const openAction = openRoot.querySelector('button')
openAction.addEventListener('click', () => events.click++)
configure(openDialog, openField, '260px')
openDialog.showModal()
let closedDialog
let closedField
let closedAction
class ClosedModalHost extends HTMLElement {
  constructor() {
    super()
    const root = this.attachShadow({ mode: 'closed' })
    root.innerHTML =
      '<dialog><input><button type="button">Fetch</button></dialog>'
    closedDialog = root.querySelector('dialog')
    closedField = root.querySelector('input')
    closedAction = root.querySelector('button')
    closedAction.addEventListener('click', () => {
      events.click++
      fetch('/modal-fetched')
    })
    configure(closedDialog, closedField, '500px')
  }
  connectedCallback() {
    events.connected++
    closedDialog.showModal()
  }
  disconnectedCallback() {
    events.disconnected++
  }
}
customElements.define('x-closed-modal-host', ClosedModalHost)
const closedHost = document.querySelector('x-closed-modal-host')
const frame = document.getElementById('modal-frame')
window.__topLayerProbe = {
  actions: [lightAction, openAction, closedAction],
  closedHost,
  dialogs: [lightDialog, openDialog, closedDialog],
  events,
  fields: [lightField, openField, closedField],
  frame,
  openDialog,
  openHost,
}
