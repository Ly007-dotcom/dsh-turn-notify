# dsh-turn-notify

Desktop and browser notifications for [DeepSeek's Harness](https://github.com/deepseek-ai) (DSH).

Long agent runs are easy to walk away from. This plugin tells you the moment the agent is done — or the moment it is actually waiting on you.

- **Turn finished** — the agent stopped and the turn is complete.
- **Waiting for your confirmation** — an approval or question needs an answer before work can continue.

It works in the DSH **desktop app** and in the **Web UI**, and it notifies from every place you have the app open.

## What you get

| Channel | Behaviour |
| --- | --- |
| System notification | A native OS banner via the Notification API. Clicking it focuses the app and opens that Session. |
| In-app toast | A card at the top of the window that stays visible for 8 seconds even where the OS suppresses banners. Click to jump to the Session. |
| Sound | A short two-tone chime, toggleable on its own. |

Multiple open windows coordinate through `localStorage`, so a single completion is announced once, not once per tab.

## Install

### Through a plugin index (easiest)

DSH has no central plugin registry — the plugin market reads index files that each user subscribes to. This repository publishes one:

```
https://cdn.jsdelivr.net/gh/Ly007-dotcom/dsh-turn-notify@main/market-index.json
```

Open **Settings → Plugins → Discover**, add that URL as an index source, then search for `dsh-turn-notify` and install.

A GitHub raw URL works too, but its domain is unreachable on some networks; jsDelivr serves the same file as CDN JSON and is usually the better choice.

See [MARKET-INDEX.md](./MARKET-INDEX.md) for the index format, how to host one yourself, and how to publish a new version.

### From the desktop app or Web UI

Open **Settings → Plugins**, install the bundle from a local checkout or a plugin index, then enable it.

### From a Git checkout

```bash
git clone https://github.com/Ly007-dotcom/dsh-turn-notify.git
```

Then add the checkout path as a bundle through the plugin manager, or reference it from your profile's `package.json`:

```json
{
  "dependencies": {
    "dsh-turn-notify": "link:/absolute/path/to/dsh-turn-notify"
  },
  "dsh": {
    "profile": {
      "bundles": ["dsh-turn-notify"]
    }
  }
}
```

## Use

1. After installing, a one-time prompt offers to turn notifications on. Browser and OS permission can only be granted from a click, so this is where it happens.
2. Or go to **Settings → General → Notifications** and use the switch there.
3. Press **Send a test notification** to confirm delivery end to end.

A **Sound** row sits directly underneath the Notifications row.

### A note on macOS

The desktop app holds a pre-granted notification permission, so banners work out of the box. If you see nothing, check **System Settings → Notifications → DeepSeek's Harness**: allow notifications and make sure the style is not "None".

### A note on plain browsers

A browser only lets a page play audio after you have interacted with it once. A freshly loaded page therefore stays silent until your first click anywhere in the app.

## Settings

| Switch | Default | Storage key |
| --- | --- | --- |
| Notifications | On | `dsh-turn-notify:enabled` |
| Sound | On | `dsh-turn-notify:sound` |

Preferences are per browser profile and never leave your machine.

## Behaviour worth knowing

- **Turn ends are debounced by 1.8 s.** A goal can resume immediately after a brief idle beat, so the plugin waits for a stable stop instead of announcing every pause.
- **Approval requests notify instantly** and are deduplicated by their request key.
- **Subagent Sessions are ignored.** They finish constantly and would be pure noise; only Sessions you opened are announced.
- **Blank Sessions are ignored** for the same reason.

## Supported DSH versions

Built against DSH `0.2.2-rc`. The plugin uses the Client-side Session status service and the `settings.general.item` / `shell.overlay` slots, which are stable across that line.

## Privacy

The plugin makes no network requests of its own, collects no telemetry, and stores nothing outside your browser's `localStorage`. Notification content is derived locally from the Session title and a fixed label.

## License

[MIT](./LICENSE)
