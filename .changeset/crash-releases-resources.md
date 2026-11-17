---
'foldkit': patch
---

Release dialogs owned by a crashed runtime before crash reporting and rendering. An open modal Dialog could leave the crash view inert and the page scroll locked, preventing recovery. Prevent interrupted dialog opens and late scroll-lock acquisitions from reactivating modal state after the crash. Dialogs owned by other runtimes retain their focus handling, isolation, and scroll locks.
