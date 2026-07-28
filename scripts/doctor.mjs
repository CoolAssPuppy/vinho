#!/usr/bin/env node

/**
 * Vinho doctor: verifies a checkout can actually be developed on.
 *
 * Meant to be the first thing you run on a fresh clone. Every external command
 * runs with a timeout and captured stdio so a hung CLI cannot wedge the check,
 * and every path below is asserted against the real repo layout.
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CMD_TIMEOUT_MS = 15_000

let failures = 0
const warnings = []

const pass = (msg) => console.log(`  PASS  ${msg}`)
const warn = (msg, hint) => {
  console.log(`  WARN  ${msg}`)
  if (hint) console.log(`        ${hint}`)
  warnings.push(msg)
}
const fail = (msg, hint) => {
  console.log(`  FAIL  ${msg}`)
  if (hint) console.log(`        ${hint}`)
  failures += 1
}

/** Run a command with a hard timeout. Returns trimmed stdout, or null on failure. */
function run(cmd, args = []) {
  try {
    return execFileSync(cmd, args, {
      timeout: CMD_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }).trim()
  } catch {
    return null
  }
}

const has = (cmd) => run('sh', ['-c', `command -v ${cmd}`]) !== null
const major = (v) => Number.parseInt(String(v).replace(/^\D+/, '').split('.')[0], 10)
const section = (title) => console.log(`\n${title}`)

function checkToolchain() {
  section('Toolchain')

  major(process.version) >= 22
    ? pass(`node ${process.version}`)
    : fail(`node ${process.version} is too old`, 'This repo requires Node 22+ (package.json engines.node).')

  if (!has('pnpm')) {
    fail('pnpm not installed', 'npm install -g pnpm@11')
  } else {
    const v = run('pnpm', ['--version'])
    major(v) >= 11 ? pass(`pnpm ${v}`) : fail(`pnpm ${v} is too old`, 'This repo pins pnpm 11 (packageManager).')
  }

  if (!has('docker')) {
    fail('docker not installed', 'Docker is required to run Supabase locally.')
  } else if (run('docker', ['info']) === null) {
    fail('docker is installed but not running', 'Start Docker Desktop, then re-run.')
  } else {
    pass('docker is running')
  }

  has('supabase')
    ? pass(`supabase CLI ${run('supabase', ['--version']) ?? 'unknown'}`)
    : fail('supabase CLI not installed', 'brew install supabase/tap/supabase')

  has('doppler')
    ? pass('doppler installed')
    : warn('doppler not installed', 'Secrets come from Doppler: brew install dopplerhq/cli/doppler && doppler login')
}

function checkRepoLayout() {
  section('Repo layout')

  const required = [
    'turbo.json',
    'pnpm-workspace.yaml',
    'supabase/config.toml',
    'apps/vinho-web/app/page.tsx',
    'apps/vinho-web/lib/database.types.ts',
    // Must be committed or ./gradlew fails on a fresh clone.
    'apps/vinho-android/gradle/wrapper/gradle-wrapper.jar',
  ]

  for (const rel of required) {
    if (existsSync(resolve(ROOT, rel))) {
      pass(rel)
    } else if (rel.endsWith('database.types.ts')) {
      warn(`${rel} missing`, 'pnpm run supa:types')
    } else {
      fail(`${rel} missing`)
    }
  }
}

function checkLocalSupabase() {
  section('Local Supabase')

  if (run('supabase', ['status', '--workdir', ROOT]) === null) {
    warn('local stack is not running', 'supabase start && supabase db reset')
  } else {
    pass('local stack is running')
  }

  // A stale .temp/storage-version pins a storage image tag that may no longer
  // exist upstream, making `supabase start` fail with an opaque pull error.
  if (existsSync(resolve(ROOT, 'supabase/.temp/storage-version'))) {
    warn(
      'supabase/.temp/storage-version exists',
      'If `supabase start` cannot pull storage-api, delete this file. See supabase/cli#4148.',
    )
  }
}

async function checkDeclarativeSchemas() {
  section('Declarative schemas')

  const schemasDir = resolve(ROOT, 'supabase/schemas')
  if (!existsSync(schemasDir)) {
    fail('supabase/schemas missing', 'Declarative schemas are wired up via [db.migrations] schema_paths.')
    return
  }

  for (const f of ['10_public.sql', '20_storage_policies.sql', 'README.md']) {
    existsSync(resolve(schemasDir, f)) ? pass(`schemas/${f}`) : fail(`schemas/${f} missing`)
  }

  const config = await readFile(resolve(ROOT, 'supabase/config.toml'), 'utf8').catch(() => '')
  config.includes('schema_paths')
    ? pass('schema_paths configured in config.toml')
    : fail('schema_paths not set in supabase/config.toml')

  console.log('        Verify sync with: supabase db diff  (expect "No schema changes found")')
}

console.log('Vinho doctor')

checkToolchain()
checkRepoLayout()
checkLocalSupabase()
await checkDeclarativeSchemas()

console.log(`\n${'-'.repeat(56)}`)
if (failures > 0) {
  console.log(`${failures} failure(s), ${warnings.length} warning(s). Fix the failures before developing.`)
  process.exit(1)
}
console.log(warnings.length > 0 ? `Healthy, with ${warnings.length} warning(s).` : 'All checks passed.')
