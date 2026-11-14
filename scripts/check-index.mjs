import fs from 'node:fs'
import assert from 'node:assert/strict'
import { parseMarketIndex, marketInstallTarget } from '@deepseek-ai/dsh-plugin-market-index'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const index = parseMarketIndex(JSON.parse(fs.readFileSync('market-index.json', 'utf8')), 'https://cdn.jsdelivr.net/gh/Ly007-dotcom/dsh-turn-notify@main/market-index.json')
const plugin = index.plugins.find(item => item.name === pkg.name)
assert.ok(plugin, 'Package must be listed in the index')
for (const version of plugin.versions) {
  console.log(`${plugin.name}@${version.version}: ${marketInstallTarget(plugin.name, version).spec}`)
  if (version.version === pkg.version) assert.equal(version.engines.dsh, pkg.engines.dsh, 'Current version compatibility mismatch')
}
if (!plugin.versions.some(v => v.version === pkg.version)) console.log(`${pkg.version} is local only; the published index intentionally retains older releases.`)
console.log('Official DSH index validation passed.')
