import { m } from 'foldkit/message'

const ClickedSave = m('ClickedSave')

// ❌ Bad
const badMessage = ClickedSave({})

// ✅ Good
const goodMessage = ClickedSave()
