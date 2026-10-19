window.__adoptedFrameDocuments = []
window.__recordAdoptedFrame = function (frameDocument) {
  window.__adoptedFrameDocuments.push(frameDocument)
}
window.__parserOwnedConnectionChildCounts = []
window.__parserChildDisconnections = 0
class ParserChild extends HTMLElement {
  connectedCallback() {
    this.ownerHost = this.parentElement
  }
  disconnectedCallback() {
    window.__parserChildDisconnections++
    var ownerHost = this.ownerHost
    if (ownerHost === null || ownerHost === undefined) {
      return
    }
    ownerHost.removeAttribute('title')
    var reinserted = document.createElement('span')
    reinserted.setAttribute('data-parser-reinserted', '')
    ownerHost.appendChild(reinserted)
  }
}
customElements.define('x-parser-child', ParserChild)
class ParserOwned extends HTMLElement {
  connectedCallback() {
    this.ownerParent = this.parentElement
    this.ownerEarlierSibling = this.previousElementSibling
    window.__parserOwnedConnectionChildCounts.push(this.childNodes.length)
    if (this.childNodes.length > 0) {
      return
    }
    var child = document.createElement('x-parser-child')
    child.id = 'parser-view-child'
    child.textContent = 'view'
    this.componentOwnedChild = child
    this.appendChild(child)
  }
  disconnectedCallback() {
    this.ownerParent?.removeAttribute('title')
    this.ownerEarlierSibling?.removeAttribute('title')
    var earlierText = this.ownerEarlierSibling?.firstChild
    if (earlierText !== null && earlierText !== undefined) {
      earlierText.data = 'component-mutated'
    }
  }
  mutateOwned() {
    this.componentOwnedChild.textContent = 'component-mutated'
  }
}
customElements.define('x-parser-owned', ParserOwned)
