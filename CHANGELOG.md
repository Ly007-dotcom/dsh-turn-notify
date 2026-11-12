# Changelog

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
