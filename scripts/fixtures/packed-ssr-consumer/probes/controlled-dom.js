;(() => {
  const probe = window.__probe
  const value = document.querySelector('#equal-value')
  const checked = document.querySelector('#equal-checked')
  const rawSelect = document.querySelector('#raw-select')
  const textarea = document.querySelector('#released-textarea')
  const output = document.querySelector('#released-output')
  const innerSelect = document.querySelector('#inner-select')
  const file = document.querySelector('#released-file')
  const sized = document.querySelector('#released-size')
  const tabbed = document.querySelector('#released-tabindex')
  const dimensions = document.querySelector('#released-dimensions')
  const ordered = document.querySelector('#released-start')
  const styled = document.querySelector('#styled')
  return {
    nodeIdentityIsIntact: Object.keys(probe.controlledNodes)
      .filter(id => id !== 'observed-id' && id !== 'custom-inner-probe')
      .every(id => probe.controlledNodes[id] === document.getElementById(id)),
    customInnerHtmlHostWasRebuilt:
      probe.controlledNodes['observed-id'] !==
      document.getElementById('observed-id'),
    customInnerHtmlWasRebuilt:
      probe.controlledNodes['custom-inner-probe'] !==
      document.getElementById('custom-inner-probe'),
    nativeInnerHtmlWasAdopted:
      probe.controlledNodes['native-inner-probe'] ===
      document.getElementById('native-inner-probe'),
    observedIdChangesAtDefinition: probe.observedIdChangesAtDefinition,
    observedIdChanges: window.__observedIdChanges.length,
    observedDirection:
      document.querySelector('#observed-id')?.getAttribute('dir') ?? null,
    customHolderConstructions: window.__customElementConstructions.holder,
    innerProbeConstructions: window.__customElementConstructions.inner,
    idPropertyWrites: window.__idPropertyWrites,
    innerHtmlPropertyWrites: window.__innerHtmlPropertyWrites,
    styleMutations: window.__readStyleMutationCount(),
    value: value.value,
    defaultValue: value.defaultValue,
    valueAttribute: value.getAttribute('value'),
    checked: checked.checked,
    defaultChecked: checked.defaultChecked,
    hasCheckedAttribute: checked.hasAttribute('checked'),
    rawSelectValue: rawSelect.value,
    rawSelectIndex: rawSelect.selectedIndex,
    rawSelectFirstDefault: rawSelect.options.item(0).defaultSelected,
    rawSelectSecondDefault: rawSelect.options.item(1).defaultSelected,
    textareaValue: textarea.value,
    textareaDefaultValue: textarea.defaultValue,
    outputValue: output.value,
    outputDefaultValue: output.defaultValue,
    outputChild: output.querySelector('#output-child')?.textContent ?? null,
    innerSelectValue: innerSelect.value,
    innerSelectIndex: innerSelect.selectedIndex,
    fileType: file.type,
    fileValue: file.value,
    fileDefaultValue: file.defaultValue,
    fileValueAttribute: file.getAttribute('value'),
    inputSize: sized.size,
    tabIndex: tabbed.tabIndex,
    title: tabbed.title,
    textareaCols: dimensions.cols,
    textareaRows: dimensions.rows,
    orderedStart: ordered.start,
    styleColor: getComputedStyle(styled).color,
    customStyleValue: styled.style.getPropertyValue('--accent'),
    valueAfterReset: value.value,
    checkedAfterReset: checked.checked,
  }
})()
