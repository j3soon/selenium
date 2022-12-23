const fs = require('fs')
const core = require('@actions/core')
const cache = require('@actions/cache')
const glob = require('@actions/glob')
const config = require('./config')

async function run () {
  try {
    await setupBazel()
  } catch (error) {
    core.setFailed(error.stack)
  }
}

async function setupBazel () {
  core.startGroup('Configure Bazel')
  console.log('Configuration:')
  console.log(JSON.stringify(config, null, 2))

  await optimizeCacheOnWindows()
  await setupBazelrc()
  core.endGroup()

  if (core.getBooleanInput('bazelisk-cache')) {
    await restoreCache(config.bazeliskCache)
  }

  if (core.getBooleanInput('disk-cache')) {
    await restoreCache(config.diskCache)
  }

  if (core.getBooleanInput('repository-cache')) {
    await restoreCache(config.repositoryCache)
  }

  for (const name in config.externalCache) {
    await restoreCache(config.externalCache[name])
  }
}

async function optimizeCacheOnWindows () {
  if (config.platform !== 'win32') {
    return
  }

  // Bazel relies heavily on symlinks.
  console.log('Enabling native symlinks support')
  core.exportVariable('MSYS', 'winsymlinks:native')
}

async function setupBazelrc () {
  fs.writeFileSync(
    config.paths.bazelrc,
    `startup --output_base=${config.paths.bazelOutputBase}\n`
  )

  for (const line of config.bazelrc) {
    fs.appendFileSync(config.paths.bazelrc, `${line}\n`)
  }
}

async function restoreCache (cacheConfig) {
  core.startGroup(`Restore cache for ${cacheConfig.name}`)

  const hash = await glob.hashFiles(cacheConfig.files.join('\n'))
  const name = cacheConfig.name
  const paths = cacheConfig.paths
  const restoreKey = `${config.baseCacheKey}-${name}-`
  const key = `${restoreKey}${hash}`

  console.log(`Attempting to restore ${name} cache from ${key}`)

  const restoredKey = await cache.restoreCache(paths, key, [restoreKey])
  if (restoredKey) {
    console.log(`Successfully restored cache from ${restoredKey}`)
    if (restoredKey !== key) {
      core.saveState(`${name}-cache-key`, key)
    }
  } else {
    console.log(`Failed to restore ${name} cache`)
    core.saveState(`${name}-cache-key`, key)
  }

  core.endGroup()
}

run()
