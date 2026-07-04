import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const LockScroll = Command.define('LockScroll', CompletedLock)(lockScrollEffect)

// ❌ Bad
// A Completed* acknowledgement should mirror its Command name.
const CompletedLock = m('CompletedLock')

// ✅ Good
const CompletedLockScroll = m('CompletedLockScroll')
