# Contributing

Thanks for taking a look. Issues and pull requests are welcome.

## Development

This plugin is a DSH bundle with two halves:

- `index.js` — the Host half. It is intentionally empty: all of the feature runs in the browser.
- `client.js` — the Client half. A single `window.__ModuleLoader__.load(...)` factory holding the
  dictionaries, styles, React components, and the Session status subscription.

There is no build step, no bundler, and no runtime dependency beyond React, which the DSH
Client already provides. Edit `client.js` and the running app picks the change up through HMR
while `pnpm run dev:web` is running in the DSH checkout.

## Trying a change locally

Link your checkout into a DSH profile instead of copying files:

```bash
cd ~/.dsh/profiles/<your-profile>
pnpm add "file:/absolute/path/to/dsh-turn-notify"
```

Then add the package name to `dsh.profile.bundles` and reload DSH.

## Guidelines

- Keep the Host half empty unless a feature genuinely needs Host-side work.
- Keep every string in the `dictionaries` table and add it for all supported locales
  (`en`, `zh`, `ja`, `es`, `fr`, `de`, `ru`, `pt`).
- Style with the existing `--dsw-alias-*` theme tokens so both light and dark themes work.
- Do not add network requests, analytics, or third-party dependencies.

## Reporting a bug

Include your DSH version, your OS, whether you are in the desktop app or a browser, and the
exact steps. For notification problems, say whether the in-app toast appeared, since that
separates a permission issue from an event-detection issue.

## Checks

Run `npm ci`, `npm run verify` with Node.js 24.9 or newer. Tests use Node’s test runner, a minimal mocked DSH/React environment, and `fake-indexeddb` for shared-storage transactions. This is a development dependency only. OS banner rendering and browser audio policies still require manual Desktop/browser checks.

`npm run verify` also validates the market index using the official DSH validator, checks package/lock versions, local documentation links and the actual npm pack file list. The workflow in `.github/workflows/ci.yml` runs these checks without publishing anything.
