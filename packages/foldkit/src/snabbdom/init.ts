/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { type DOMAPI, htmlDomApi } from './htmldomapi.js'
import * as is from './is.js'
import type { Module } from './module.js'
import { type Key, type VNode, vnode, vnodeDataMaskKey } from './vnode.js'

type VNodeQueue = Array<VNode>

const emptyNode = vnode('', {}, [], undefined, undefined)

function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
  if (vnode1 === vnode2) {
    return true
  }
  if (vnode1.sel !== vnode2.sel) {
    return false
  }
  if (vnode1.key !== vnode2.key) {
    return false
  }
  if (vnode1.identity !== vnode2.identity) {
    return false
  }
  if (vnode1.data?.is !== vnode2.data?.is) {
    return false
  }
  return vnode1.sel !== undefined || typeof vnode1.text === typeof vnode2.text
}

/**
 * @todo Remove this function when the document fragment is considered stable.
 */
function documentFragmentIsNotSupported(): never {
  throw new Error('The document fragment is not supported on this platform.')
}

function isElement(
  api: DOMAPI,
  vnode: VNode | Element | DocumentFragment,
): vnode is Element {
  return api.isElement(vnode as any)
}

function isDocumentFragment(
  api: DOMAPI,
  vnode: VNode | DocumentFragment,
): vnode is DocumentFragment {
  return api.isDocumentFragment?.(vnode as any) ?? false
}

type ModuleHookName =
  | 'create'
  | 'update'
  | 'remove'
  | 'destroy'
  | 'pre'
  | 'post'

type ModuleHooks = {
  [Hook in ModuleHookName]: Array<NonNullable<Module[Hook]>>
}

type MaskedModuleHookName = 'create' | 'update' | 'destroy'

type ModuleDataMasks = {
  [Hook in MaskedModuleHookName]: Array<number | undefined>
}

function createKeyToPreviousIndex(
  children: Array<VNode>,
  beginIndex: number,
  endIndex: number,
): Map<Key, number> {
  const map = new Map<Key, number>()
  for (let childIndex = beginIndex; childIndex <= endIndex; ++childIndex) {
    const key = children[childIndex]?.key
    if (key !== undefined) {
      map.set(key, childIndex)
    }
  }
  return map
}

const hooks: Array<ModuleHookName> = [
  'create',
  'update',
  'remove',
  'destroy',
  'pre',
  'post',
]

export type Options = {
  experimental?: {
    fragments?: boolean
  }
}

let duplicateKeyWarningOverride: boolean | undefined = undefined

/** Overrides the `import.meta.hot` gate on the dev-only duplicate sibling key
 *  warning so unit tests can force it on or off. Pass `undefined` to restore
 *  the gate. Internal, test-only. */
export const __overrideDuplicateKeyWarning = (
  isActive: boolean | undefined,
): void => {
  duplicateKeyWarningOverride = isActive
}

// NOTE: `import.meta` is read through a structural cast rather than the
// vite/client `ImportMeta` augmentation so repo-internal programs that
// typecheck this source without vite types (internal/lustre-benchmark) still
// compile. The emitted JS is a plain `import.meta.hot` access either way.
const isDuplicateKeyWarningActive = (): boolean =>
  duplicateKeyWarningOverride ?? !!(import.meta as { hot?: unknown }).hot

export function init(
  modules: Array<Partial<Module>>,
  domApi?: DOMAPI,
  options?: Options,
) {
  const moduleHooks: ModuleHooks = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: [],
  }
  const moduleDataMasks: ModuleDataMasks = {
    create: [],
    update: [],
    destroy: [],
  }

  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi

  let isDuplicateKeyWarningIssued = false

  for (const hook of hooks) {
    for (const module of modules) {
      const currentHook = module[hook]
      if (currentHook !== undefined) {
        ;(moduleHooks[hook] as Array<any>).push(currentHook)
        if (hook === 'create' || hook === 'update' || hook === 'destroy') {
          moduleDataMasks[hook].push(module.dataMask)
        }
      }
    }
  }

  function emptyNodeAt(element: Element) {
    const id = element.id ? '#' + element.id : ''

    // element.className doesn't return a string when element is an SVG element inside a shadowRoot.
    // https://stackoverflow.com/questions/29454340/detecting-classname-of-svganimatedstring
    const classes = element.getAttribute('class')

    const classSelector = classes ? '.' + classes.split(' ').join('.') : ''
    return vnode(
      api.tagName(element).toLowerCase() + id + classSelector,
      {},
      [],
      undefined,
      element,
    )
  }

  function emptyDocumentFragmentAt(fragment: DocumentFragment) {
    return vnode(undefined, {}, [], undefined, fragment)
  }

  function createRemoveCallback(childElement: Node, listeners: number) {
    return function removeCallback() {
      if (--listeners === 0) {
        const parent = api.parentNode(childElement)
        if (parent !== null) {
          api.removeChild(parent, childElement)
        }
      }
    }
  }

  function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    const data = vnode.data
    const hook = data?.hook
    hook?.init?.(vnode)
    const children = vnode.children
    const selector = vnode.sel
    if (selector === '!') {
      vnode.text ??= ''
      vnode.elm = api.createComment(vnode.text)
    } else if (selector === '') {
      // textNode has no selector
      vnode.elm = api.createTextNode(vnode.text!)
    } else if (selector !== undefined) {
      // Parse selector
      const hashIndex = selector.indexOf('#')
      const dotIndex = selector.indexOf('.', hashIndex)
      const hash = hashIndex > 0 ? hashIndex : selector.length
      const dot = dotIndex > 0 ? dotIndex : selector.length
      const tagName =
        hashIndex !== -1 || dotIndex !== -1
          ? selector.slice(0, Math.min(hash, dot))
          : selector
      const namespace = data?.ns
      const element =
        namespace === undefined
          ? api.createElement(tagName, data)
          : api.createElementNS(namespace, tagName, data)
      vnode.elm = element
      if (hash < dot) {
        element.setAttribute('id', selector.slice(hash + 1, dot))
      }
      if (dotIndex > 0) {
        element.setAttribute(
          'class',
          selector.slice(dot + 1).replace(/\./g, ' '),
        )
      }
      const dataMask = data?.[vnodeDataMaskKey]
      for (
        let moduleIndex = 0;
        moduleIndex < moduleHooks.create.length;
        ++moduleIndex
      ) {
        const moduleDataMask = moduleDataMasks.create[moduleIndex]
        if (
          moduleDataMask === undefined ||
          dataMask === undefined ||
          (dataMask & moduleDataMask) !== 0
        ) {
          moduleHooks.create[moduleIndex]!(emptyNode, vnode)
        }
      }
      if (
        is.primitive(vnode.text) &&
        (!is.array(children) || children.length === 0)
      ) {
        // allow h1 and similar nodes to be created w/ text and empty child list
        api.appendChild(element, api.createTextNode(vnode.text))
      }
      if (is.array(children)) {
        for (let childIndex = 0; childIndex < children.length; ++childIndex) {
          const child = children[childIndex]
          if (child != null) {
            api.appendChild(
              element,
              createElm(child as VNode, insertedVnodeQueue),
            )
          }
        }
      }
      if (hook !== undefined) {
        hook.create?.(emptyNode, vnode)
        if (hook.insert !== undefined) {
          insertedVnodeQueue.push(vnode)
        }
      }
    } else if (options?.experimental?.fragments && vnode.children) {
      vnode.elm = (
        api.createDocumentFragment ?? documentFragmentIsNotSupported
      )()
      const dataMask = data?.[vnodeDataMaskKey]
      for (
        let moduleIndex = 0;
        moduleIndex < moduleHooks.create.length;
        ++moduleIndex
      ) {
        const moduleDataMask = moduleDataMasks.create[moduleIndex]
        if (
          moduleDataMask === undefined ||
          dataMask === undefined ||
          (dataMask & moduleDataMask) !== 0
        ) {
          moduleHooks.create[moduleIndex]!(emptyNode, vnode)
        }
      }
      for (
        let childIndex = 0;
        childIndex < vnode.children.length;
        ++childIndex
      ) {
        const child = vnode.children[childIndex]
        if (child != null) {
          api.appendChild(
            vnode.elm,
            createElm(child as VNode, insertedVnodeQueue),
          )
        }
      }
    } else {
      vnode.elm = api.createTextNode(vnode.text!)
    }
    return vnode.elm
  }

  function addVnodes(
    parentElement: Node,
    before: Node | null,
    vnodes: Array<VNode>,
    startIndex: number,
    endIndex: number,
    insertedVnodeQueue: VNodeQueue,
  ) {
    for (; startIndex <= endIndex; ++startIndex) {
      const child = vnodes[startIndex]
      if (child != null) {
        api.insertBefore(
          parentElement,
          createElm(child, insertedVnodeQueue),
          before,
        )
      }
    }
  }

  function invokeDestroyHook(vnode: VNode) {
    const data = vnode.data
    if (data !== undefined) {
      data?.hook?.destroy?.(vnode)
      const dataMask = data[vnodeDataMaskKey]
      for (
        let moduleIndex = 0;
        moduleIndex < moduleHooks.destroy.length;
        ++moduleIndex
      ) {
        const moduleDataMask = moduleDataMasks.destroy[moduleIndex]
        if (
          moduleDataMask === undefined ||
          dataMask === undefined ||
          (dataMask & moduleDataMask) !== 0
        ) {
          moduleHooks.destroy[moduleIndex]!(vnode)
        }
      }
      if (vnode.children !== undefined) {
        for (
          let childIndex = 0;
          childIndex < vnode.children.length;
          ++childIndex
        ) {
          const child = vnode.children[childIndex]
          if (child != null && typeof child !== 'string') {
            invokeDestroyHook(child)
          }
        }
      }
    }
  }

  function removeVnodes(
    parentElement: Node,
    vnodes: Array<VNode>,
    startIndex: number,
    endIndex: number,
  ): void {
    for (; startIndex <= endIndex; ++startIndex) {
      let listeners: number
      const child = vnodes[startIndex]
      if (child != null) {
        if (child.sel !== undefined) {
          invokeDestroyHook(child)
          listeners = moduleHooks.remove.length + 1
          const removeCallback = createRemoveCallback(child.elm!, listeners)
          for (
            let moduleIndex = 0;
            moduleIndex < moduleHooks.remove.length;
            ++moduleIndex
          ) {
            moduleHooks.remove[moduleIndex]!(child, removeCallback)
          }
          const removeHook = child.data?.hook?.remove
          if (removeHook !== undefined) {
            removeHook(child, removeCallback)
          } else {
            removeCallback()
          }
        } else if (child.children) {
          // Fragment node
          invokeDestroyHook(child)
          removeVnodes(
            parentElement,
            child.children as Array<VNode>,
            0,
            child.children.length - 1,
          )
        } else {
          // Text node
          api.removeChild(parentElement, child.elm!)
        }
      }
    }
  }

  function warnOnDuplicateKeys(
    children: Array<VNode>,
    beginIndex: number,
    endIndex: number,
    parentElement: Node,
  ): void {
    if (!isDuplicateKeyWarningActive() || isDuplicateKeyWarningIssued) {
      return
    }
    const seenKeys = new Set<Key>()
    for (let childIndex = beginIndex; childIndex <= endIndex; ++childIndex) {
      const key = children[childIndex]?.key
      if (key === undefined) {
        continue
      }
      if (seenKeys.has(key)) {
        isDuplicateKeyWarningIssued = true
        const parentSelector = api.isElement(parentElement)
          ? api.tagName(parentElement).toLowerCase()
          : String(parentElement.nodeName).toLowerCase()
        console.warn(
          `[foldkit] Duplicate key "${String(key)}" among children of ` +
            `<${parentSelector}>. Keys must be unique among siblings; duplicates ` +
            'make sibling matching ambiguous and can patch the wrong element.',
        )
        return
      }
      seenKeys.add(key)
    }
  }

  function updateChildren(
    parentElement: Node,
    previousChildren: Array<VNode>,
    nextChildren: Array<VNode>,
    insertedVnodeQueue: VNodeQueue,
  ) {
    if (previousChildren.length === 0 && nextChildren.length === 0) {
      return
    }
    warnOnDuplicateKeys(nextChildren, 0, nextChildren.length - 1, parentElement)
    let previousStartIndex = 0
    let nextStartIndex = 0
    let previousEndIndex = previousChildren.length - 1
    let nextEndIndex = nextChildren.length - 1

    while (
      previousStartIndex <= previousEndIndex &&
      nextStartIndex <= nextEndIndex &&
      previousChildren[previousStartIndex] === nextChildren[nextStartIndex]
    ) {
      previousStartIndex += 1
      nextStartIndex += 1
    }
    while (
      previousStartIndex <= previousEndIndex &&
      nextStartIndex <= nextEndIndex &&
      previousChildren[previousEndIndex] === nextChildren[nextEndIndex]
    ) {
      previousEndIndex -= 1
      nextEndIndex -= 1
    }

    let previousStartVnode = previousChildren[previousStartIndex]
    let previousEndVnode = previousChildren[previousEndIndex]
    let nextStartVnode = nextChildren[nextStartIndex]
    let nextEndVnode = nextChildren[nextEndIndex]
    let previousKeyToIndex: Map<Key, number> | undefined
    let indexInPreviousChildren: number | undefined
    let vnodeToMove: VNode
    let before: Node | null

    while (
      previousStartIndex <= previousEndIndex &&
      nextStartIndex <= nextEndIndex
    ) {
      if (previousStartVnode == null) {
        previousStartVnode = previousChildren[++previousStartIndex]
      } else if (previousEndVnode == null) {
        previousEndVnode = previousChildren[--previousEndIndex]
      } else if (nextStartVnode == null) {
        nextStartVnode = nextChildren[++nextStartIndex]
      } else if (nextEndVnode == null) {
        nextEndVnode = nextChildren[--nextEndIndex]
      } else if (sameVnode(previousStartVnode, nextStartVnode)) {
        patchVnode(previousStartVnode, nextStartVnode, insertedVnodeQueue)
        previousStartVnode = previousChildren[++previousStartIndex]
        nextStartVnode = nextChildren[++nextStartIndex]
      } else if (sameVnode(previousEndVnode, nextEndVnode)) {
        patchVnode(previousEndVnode, nextEndVnode, insertedVnodeQueue)
        previousEndVnode = previousChildren[--previousEndIndex]
        nextEndVnode = nextChildren[--nextEndIndex]
      } else if (sameVnode(previousStartVnode, nextEndVnode)) {
        // Vnode moved right
        patchVnode(previousStartVnode, nextEndVnode, insertedVnodeQueue)
        api.insertBefore(
          parentElement,
          previousStartVnode.elm!,
          api.nextSibling(previousEndVnode.elm!),
        )
        previousStartVnode = previousChildren[++previousStartIndex]
        nextEndVnode = nextChildren[--nextEndIndex]
      } else if (sameVnode(previousEndVnode, nextStartVnode)) {
        // Vnode moved left
        patchVnode(previousEndVnode, nextStartVnode, insertedVnodeQueue)
        api.insertBefore(
          parentElement,
          previousEndVnode.elm!,
          previousStartVnode.elm!,
        )
        previousEndVnode = previousChildren[--previousEndIndex]
        nextStartVnode = nextChildren[++nextStartIndex]
      } else {
        if (previousKeyToIndex === undefined) {
          previousKeyToIndex = createKeyToPreviousIndex(
            previousChildren,
            previousStartIndex,
            previousEndIndex,
          )
          warnOnDuplicateKeys(
            previousChildren,
            previousStartIndex,
            previousEndIndex,
            parentElement,
          )
        }
        const nextStartKey = nextStartVnode.key
        indexInPreviousChildren =
          nextStartKey === undefined
            ? undefined
            : previousKeyToIndex.get(nextStartKey)
        if (indexInPreviousChildren === undefined) {
          // `nextStartVnode` is new, create and insert it in beginning
          api.insertBefore(
            parentElement,
            createElm(nextStartVnode, insertedVnodeQueue),
            previousStartVnode.elm!,
          )
          nextStartVnode = nextChildren[++nextStartIndex]
        } else if (
          nextEndVnode.key === undefined ||
          previousKeyToIndex.get(nextEndVnode.key) === undefined
        ) {
          // `nextEndVnode` is new, create and insert it in the end
          api.insertBefore(
            parentElement,
            createElm(nextEndVnode, insertedVnodeQueue),
            api.nextSibling(previousEndVnode.elm!),
          )
          nextEndVnode = nextChildren[--nextEndIndex]
        } else {
          // Neither of the new endpoints are new vnodes, so we make progress by
          // moving `nextStartVnode` into position
          vnodeToMove = previousChildren[indexInPreviousChildren]!
          if (!sameVnode(vnodeToMove, nextStartVnode)) {
            api.insertBefore(
              parentElement,
              createElm(nextStartVnode, insertedVnodeQueue),
              previousStartVnode.elm!,
            )
          } else {
            patchVnode(vnodeToMove, nextStartVnode, insertedVnodeQueue)
            previousChildren[indexInPreviousChildren] = undefined as any
            api.insertBefore(
              parentElement,
              vnodeToMove.elm!,
              previousStartVnode.elm!,
            )
          }
          nextStartVnode = nextChildren[++nextStartIndex]
        }
      }
    }

    if (nextStartIndex <= nextEndIndex) {
      before =
        nextChildren[nextEndIndex + 1] == null
          ? null
          : nextChildren[nextEndIndex + 1]!.elm!
      addVnodes(
        parentElement,
        before,
        nextChildren,
        nextStartIndex,
        nextEndIndex,
        insertedVnodeQueue,
      )
    }
    if (previousStartIndex <= previousEndIndex) {
      removeVnodes(
        parentElement,
        previousChildren,
        previousStartIndex,
        previousEndIndex,
      )
    }
  }

  function patchVnode(
    oldVnode: VNode,
    vnode: VNode,
    insertedVnodeQueue: VNodeQueue,
  ) {
    if (oldVnode === vnode) {
      return
    }
    const hook = vnode.data?.hook
    hook?.prepatch?.(oldVnode, vnode)
    const element = (vnode.elm = oldVnode.elm!)
    if (
      vnode.data !== undefined ||
      (vnode.text !== undefined && vnode.text !== oldVnode.text)
    ) {
      vnode.data ??= {}
      oldVnode.data ??= {}
      const oldDataMask = oldVnode.data[vnodeDataMaskKey]
      const dataMask = vnode.data[vnodeDataMaskKey]
      for (
        let moduleIndex = 0;
        moduleIndex < moduleHooks.update.length;
        ++moduleIndex
      ) {
        const moduleDataMask = moduleDataMasks.update[moduleIndex]
        if (
          moduleDataMask === undefined ||
          oldDataMask === undefined ||
          dataMask === undefined ||
          ((oldDataMask | dataMask) & moduleDataMask) !== 0
        ) {
          moduleHooks.update[moduleIndex]!(oldVnode, vnode)
        }
      }
      vnode.data?.hook?.update?.(oldVnode, vnode)
    }
    const previousChildren = oldVnode.children as Array<VNode>
    const nextChildren = vnode.children as Array<VNode>
    if (vnode.text === undefined) {
      if (previousChildren !== undefined && nextChildren !== undefined) {
        if (previousChildren !== nextChildren) {
          updateChildren(
            element,
            previousChildren,
            nextChildren,
            insertedVnodeQueue,
          )
        }
      } else if (nextChildren !== undefined) {
        if (oldVnode.text !== undefined) api.setTextContent(element, '')
        addVnodes(
          element,
          null,
          nextChildren,
          0,
          nextChildren.length - 1,
          insertedVnodeQueue,
        )
      } else if (previousChildren !== undefined) {
        removeVnodes(element, previousChildren, 0, previousChildren.length - 1)
      } else if (oldVnode.text !== undefined) {
        api.setTextContent(element, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      if (previousChildren !== undefined) {
        removeVnodes(element, previousChildren, 0, previousChildren.length - 1)
      }
      api.setTextContent(element, vnode.text)
    }
    hook?.postpatch?.(oldVnode, vnode)
  }

  return function patch(
    oldVnode: VNode | Element | DocumentFragment,
    vnode: VNode,
  ): VNode {
    const insertedVnodeQueue: VNodeQueue = []
    isDuplicateKeyWarningIssued = false
    for (
      let moduleIndex = 0;
      moduleIndex < moduleHooks.pre.length;
      ++moduleIndex
    ) {
      moduleHooks.pre[moduleIndex]!()
    }

    if (isElement(api, oldVnode)) {
      oldVnode = emptyNodeAt(oldVnode)
    } else if (isDocumentFragment(api, oldVnode)) {
      oldVnode = emptyDocumentFragmentAt(oldVnode)
    }

    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue)
    } else {
      const element = oldVnode.elm!
      const parent = api.parentNode(element)

      createElm(vnode, insertedVnodeQueue)

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm!, api.nextSibling(element))
        removeVnodes(parent, [oldVnode], 0, 0)
      }
    }

    for (
      let insertedVnodeIndex = 0;
      insertedVnodeIndex < insertedVnodeQueue.length;
      ++insertedVnodeIndex
    ) {
      insertedVnodeQueue[insertedVnodeIndex]!.data!.hook!.insert!(
        insertedVnodeQueue[insertedVnodeIndex]!,
      )
    }
    for (
      let moduleIndex = 0;
      moduleIndex < moduleHooks.post.length;
      ++moduleIndex
    ) {
      moduleHooks.post[moduleIndex]!()
    }
    return vnode
  }
}
