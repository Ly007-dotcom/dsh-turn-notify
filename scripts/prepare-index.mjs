import fs from 'node:fs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'

// Run only after the tested source has been committed. No commit, tag, push or publication here.
try {
  const sha = process.argv[2]
  assert.match(sha ?? '', /^[0-9a-f]{40}$/, 'Usage: npm run release:index -- <full 40-character source commit>')
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
  assert.equal(git('status', '--porcelain'), '', 'Commit the tested source first; the working tree must be clean.')
  assert.equal(git('rev-parse', `${sha}^{commit}`), sha)
  assert.equal(git('rev-parse', 'HEAD'), sha, 'Use the tested HEAD commit, not an older revision.')
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const committed = JSON.parse(git('show', `${sha}:package.json`))
  assert.deepEqual(committed, pkg, 'Manifest differs from the source commit')
  const index = JSON.parse(fs.readFileSync('market-index.json', 'utf8'))
  const plugin = index.plugins.find(item => item.name === pkg.name)
  assert.ok(plugin)
  assert.ok(!plugin.versions.some(item => item.version === pkg.version), 'This version is already indexed; never overwrite a published release.')
  assert.ok(pkg.engines?.dsh)
  plugin.versions.unshift({
    version: pkg.version,
    publishTimestamp: Math.floor(Date.now() / 1000),
    source: { type: 'git', url: plugin.repository.url, commit: sha },
    engines: { dsh: pkg.engines.dsh },
  })
  parseMarketIndex(index, 'https://cdn.jsdelivr.net/gh/Ly007-dotcom/dsh-turn-notify@main/market-index.json')
  fs.writeFileSync('market-index.json', JSON.stringify(index, null, 2) + '\n')
  console.log(`Prepared local index for ${pkg.version} at ${sha}. Review it before committing or publishing.`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
