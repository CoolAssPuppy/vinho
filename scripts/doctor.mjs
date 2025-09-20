#!/usr/bin/env node

import { existsSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

const REQUIRED_FILES = [
  'packages/db-types/src/database.types.ts',
  'supabase/vinho.sql',
  'apps/vinho-web/src/app/page.tsx',
  'turbo.json',
  'pnpm-workspace.yaml'
]

const REQUIRED_ENV = {
  web: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
}

const REQUIRED_COMMANDS = [
  { cmd: 'supabase', install: 'brew install supabase/tap/supabase' },
  { cmd: 'pnpm', install: 'npm install -g pnpm' },
  { cmd: 'node', install: 'Install Node.js from https://nodejs.org' }
]

function checkCommand(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function checkFile(path) {
  const fullPath = resolve(process.cwd(), path)
  return existsSync(fullPath)
}

function checkEnvVar(name) {
  return process.env[name] !== undefined
}

async function main() {
  console.log('🔍 Vinho Doctor - Checking project health...\n')

  let hasErrors = false
  const warnings = []

  console.log('📦 Checking required commands:')
  for (const { cmd, install } of REQUIRED_COMMANDS) {
    if (checkCommand(cmd)) {
      console.log(`  ✅ ${cmd} is installed`)
    } else {
      console.log(`  ❌ ${cmd} is not installed`)
      console.log(`     Run: ${install}`)
      hasErrors = true
    }
  }

  console.log('\n📁 Checking critical files:')
  for (const file of REQUIRED_FILES) {
    if (checkFile(file)) {
      console.log(`  ✅ ${file} exists`)
    } else {
      if (file.includes('database.types.ts')) {
        console.log(`  ⚠️  ${file} missing (run: pnpm run supa:types)`)
        warnings.push(`Generate types: pnpm run supa:types`)
      } else if (file.includes('vinho.sql')) {
        console.log(`  ⚠️  ${file} missing (run: pnpm run supa:dump)`)
        warnings.push(`Dump schema: pnpm run supa:dump`)
      } else {
        console.log(`  ❌ ${file} is missing`)
        hasErrors = true
      }
    }
  }

  console.log('\n🔐 Checking environment variables:')

  const webEnvPath = resolve(process.cwd(), 'apps/vinho-web/.env.local')
  const hasWebEnv = existsSync(webEnvPath)

  if (hasWebEnv) {
    console.log('  ✅ Web .env.local exists')
  } else {
    console.log('  ⚠️  Web .env.local missing')
    console.log('     Create apps/vinho-web/.env.local with:')
    for (const env of REQUIRED_ENV.web) {
      console.log(`       ${env}=<value>`)
    }
    warnings.push('Create .env.local for web app')
  }

  console.log('\n📋 Checking Node.js version:')
  try {
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
    if (majorVersion >= 18) {
      console.log(`  ✅ Node.js ${nodeVersion} (>= 18.0.0)`)
    } else {
      console.log(`  ⚠️  Node.js ${nodeVersion} (recommend >= 18.0.0)`)
      warnings.push('Consider upgrading Node.js to v18 or later')
    }
  } catch (e) {
    console.log('  ❌ Could not determine Node.js version')
  }

  console.log('\n🔧 Checking package manager:')
  const packageJsonPath = resolve(process.cwd(), 'package.json')
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = await import(packageJsonPath, { assert: { type: 'json' } })
      const pmVersion = pkg.default.packageManager
      if (pmVersion && pmVersion.startsWith('pnpm')) {
        console.log(`  ✅ Using ${pmVersion}`)
      } else {
        console.log(`  ⚠️  packageManager field not set to pnpm`)
        warnings.push('Set packageManager in package.json')
      }
    } catch (e) {
      console.log('  ⚠️  Could not check packageManager field')
    }
  }

  console.log('\n🔗 Checking Supabase connection:')
  try {
    execSync('supabase projects list', { stdio: 'ignore' })
    console.log('  ✅ Supabase CLI authenticated')
  } catch {
    console.log('  ⚠️  Supabase CLI not authenticated')
    console.log('     Run: supabase login')
    warnings.push('Authenticate Supabase CLI: supabase login')
  }

  console.log('\n' + '='.repeat(50))

  if (hasErrors) {
    console.log('\n❌ Critical issues found. Please fix them before proceeding.')
    process.exit(1)
  } else if (warnings.length > 0) {
    console.log('\n⚠️  Some warnings found:')
    warnings.forEach(w => console.log(`   - ${w}`))
    console.log('\n✅ Project is functional but could be improved.')
  } else {
    console.log('\n✅ All checks passed! Project is healthy.')
  }
}

main().catch(console.error)