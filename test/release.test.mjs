import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'

const script = fileURLToPath(new URL('../scripts/prepare-index.mjs', import.meta.url))
function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'turn-notify-release-'))
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  git('init', '-q'); git('config', 'user.name', 'Release test'); git('config', 'user.email', 'test@example.invalid')
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(pkg))
  const index = JSON.parse(fs.readFileSync(new URL('../market-index.json', import.meta.url), 'utf8'))
  index.plugins[0].versions = index.plugins[0].versions.filter(v => v.version !== pkg.version)
  fs.writeFileSync(path.join(cwd, 'market-index.json'), JSON.stringify(index))
  git('add', '.'); git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Test source')
  return { cwd, git, pkg, sha: git('rev-parse', 'HEAD'), run: sha => spawnSync(process.execPath, [script, sha], { cwd, encoding: 'utf8' }), index: () => JSON.parse(fs.readFileSync(path.join(cwd, 'market-index.json'), 'utf8')) }
}

test('release index pins the exact source commit and preserves historical versions', t => {
  const f = fixture(t); const before = f.index().plugins[0].versions
  const result = f.run(f.sha); assert.equal(result.status, 0, result.stderr)
  const [version, ...history] = f.index().plugins[0].versions
  assert.equal(version.version, f.pkg.version); assert.equal(version.source.commit, f.sha)
  assert.deepEqual(version.engines, f.pkg.engines); assert.deepEqual(history, before)
  assert.ok(Math.abs(version.publishTimestamp - Date.now() / 1000) < 10)
  f.git('add', '.'); f.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Test index')
  const repeat = f.run(f.git('rev-parse', 'HEAD'))
  assert.notEqual(repeat.status, 0); assert.match(repeat.stderr, /already indexed/)
})

test('release index rejects a dirty tree without changing the index', t => {
  const f = fixture(t); const before = f.index()
  fs.writeFileSync(path.join(f.cwd, 'uncommitted.txt'), 'local change')
  const result = f.run(f.sha); assert.notEqual(result.status, 0); assert.match(result.stderr, /clean/)
  assert.deepEqual(f.index(), before)
})

test('release index rejects short SHAs and older source commits', t => {
  const f = fixture(t); const before = f.index()
  assert.notEqual(f.run(f.sha.slice(0, 7)).status, 0)
  fs.writeFileSync(path.join(f.cwd, 'new-source.txt'), 'new source')
  f.git('add', '.'); f.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'New source')
  const result = f.run(f.sha); assert.notEqual(result.status, 0); assert.match(result.stderr, /HEAD/)
  assert.deepEqual(f.index(), before)
})
