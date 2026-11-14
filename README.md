# dsh-turn-notify

English | [简体中文：安装、FAQ、升级与卸载](./README.zh-CN.md)

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

Windows sharing an origin and storage partition coordinate through atomic IndexedDB transactions. Claims are retained for 24 hours to deduplicate concurrent and delayed delivery of the same event identity. Without IndexedDB, deduplication is limited to the current window.

## Install

### Through a plugin index (easiest)

DSH has no central plugin registry — the plugin market reads index files that each user subscribes to. This repository publishes one:

```
https://cdn.jsdelivr.net/gh/Ly007-dotcom/dsh-turn-notify@main/market-index.json
```

Open **Plugins**, enable **Custom plugin indexes** under **Experimental plugins**, then open **Discover**. Add that URL as an index source, search for `dsh-turn-notify`, review the version/source, and install. Confirm it is enabled under **Installed** and reload/restart if DSH requests it.

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
2. Or open **Settings → General → Notifications**. The master switch controls all three channels independently of system permission. Click **Allow system notifications** to request permission; denied or unsupported system notifications do not prevent using the master switch.
3. With the master switch on, press **Send a test notification**, also available without system permission. Check the in-app card, OS banner and sound separately; seeing the card does not prove OS delivery.

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

Preferences synchronize within the same origin and storage partition. If storage writes fail, choices still apply in the current page but may be lost on reload.

## Behaviour worth knowing

- **Turn ends are debounced by 1.8 s.** A goal can resume immediately after a brief idle beat, so the plugin waits for a stable stop instead of announcing every pause.
- **Approval requests notify instantly** and are deduplicated by their request key.
- **Subagent Sessions are ignored.** They finish constantly and would be pure noise; only Sessions you opened are announced.
- **Blank Sessions are ignored** for the same reason.

## Supported DSH versions

Version 1.0.1 currently targets DSH `0.2.2-rc.2` and `0.2.2-rc.3` only. This is the intended compatibility range for local testing, not a claim that every OS/browser has been manually verified. The Session status service and `settings.general.item` / `shell.overlay` slots are required. See [local acceptance and release checklist](./RELEASE.md).

## Privacy

The plugin makes no network requests of its own and collects no telemetry. DSH installation/updates may fetch GitHub/CDN sources. localStorage holds preferences; IndexedDB database `dsh-turn-notify` holds Session IDs, event kinds, request keys or update timestamps, and expiry times. It stores no conversation text, titles or paths.

Notification titles use the Session title, then the last directory name, then `DSH`; bodies are fixed labels. Titles may appear on lock screens, screen shares and in OS notification history. The OS can retain delivered notifications independently.

## Limits and FAQ

- Keep a connected Desktop application window or Web UI running. Closed windows, offline clients, sleep, and frozen background pages cannot guarantee delivery. This client plugin provides no CLI/TUI/headless notifications, offline push, or historical replay on reopening.
- Deduplication covers a shared origin (scheme, host, port) and storage partition. Different browsers, private windows, devices, or Desktop versus Web notify independently. Completion identity uses the Session's DSH `updatedAt`; differing timestamps cannot be identified as one event. Claims expire after 24 hours; expiry cleanup runs on startup and event handling. Legacy localStorage claims are removed on startup.
- A stopped turn is not proof of success: errors and manual cancellation can also stop a turn.
- No OS banner: check the in-app test card, then browser site permission, OS notification settings, Focus/Do Not Disturb and secure context (HTTPS or trusted localhost/loopback; arbitrary LAN HTTP is different). A granted browser permission does not guarantee an OS banner.
- No sound: enable both switches, interact with the page and test again; check tab mute, OS volume and output device. Audio restrictions do not block in-app cards.
- Duplicate notices: check storage partition boundaries and console warnings about unavailable IndexedDB. Clearing plugin data resets claims. Another same-origin window may win a claim, so the other windows will not show a card or play a sound.

## Upgrade, rollback and removal

Refresh the Discover index and install a compatible version from the plugin's version list. Follow DSH's reload/restart instructions, then test. Roll back by selecting an older indexed version, or install a verified full commit using the CLI:

```bash
dsh plugin --profile <profile> add 'git+https://github.com/Ly007-dotcom/dsh-turn-notify.git#<40-character-commit>'
```

Replace the placeholders and restart the profile after CLI changes. Rollback restores that version's behavior and known limitations. Source users can update their checkout while preserving local changes.

Disable or remove the bundle under **Installed**, or remove it with the CLI and restart:

```bash
dsh plugin --profile <profile> remove dsh-turn-notify
```

Removal does not necessarily erase preferences or revoke site permission. To reset only this plugin, disable it in all windows sharing the partition and reload to release database connections. In developer tools, delete localStorage keys `dsh-turn-notify:enabled`, `dsh-turn-notify:sound`, `dsh-turn-notify:prompt-dismissed`, legacy `dsh-turn-notify:claim:*` entries, and IndexedDB database `dsh-turn-notify`. Close other windows if deletion is blocked. Avoid clearing all site data, which includes unrelated DSH settings. Desktop storage must be cleared in Desktop's own developer tools. Resetting restores default-on switches; revoke notification permission separately in site settings.

This README describes current source; market releases follow their pinned commit. See [CHANGELOG](./CHANGELOG.md) for unreleased changes and the [Chinese guide](./README.zh-CN.md) for the complete walkthrough.

## License

[MIT](./LICENSE)
