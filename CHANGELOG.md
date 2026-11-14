# Changelog

## 1.0.1

- Separate the master reminder switch from system notification permission, with tests available without permission.
- Synchronize preferences across windows and preserve choices in memory when storage writes fail.
- Deduplicate event identities for 24 hours with atomic IndexedDB transactions; clean expired and legacy claims, with a documented per-window fallback.
- Cancel pending delivery after disposal/resume/disable and release audio/toast resources.
- Add Chinese installation, FAQ, upgrade/rollback, removal and privacy documentation.
- Add regression tests for permissions, competing windows, delayed events, expiry and lifecycle cleanup.

## 1.0.0

First public release.

- System notification when a turn finishes or the agent waits for your confirmation.
- In-app toast that stays visible where the OS suppresses banners; click to open the Session.
- Optional two-tone chime, toggleable independently.
- Turn ends debounced by 1.8 s so goal-driven rounds do not produce a burst.
- One announcement per completion across multiple open windows, coordinated through `localStorage`.
- Subagent and blank Sessions are ignored to keep notices meaningful.
- Settings rows under General, plus a one-time permission prompt.
- Eight locales: English, Chinese, Japanese, Spanish, French, German, Russian, Portuguese.
- Works in the DSH desktop app (pre-granted notification permission) and in plain browsers.
