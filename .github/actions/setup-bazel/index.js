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
  console.log('Setting up Bazel with:')
  console.log(config)

  await optimizeCacheOnWindows()
  await setupBazelrc()

  if (core.getBooleanInput('bazelisk-cache')) {
    await restoreBazeliskCache()
  }

  if (core.getBooleanInput('repository-cache')) {
    await restoreRepositoryCache()
  }

  for (const name in config.externalCache) {
    await restoreExternalCache(config.externalCache[name])
  }
}

async function optimizeCacheOnWindows () {
  if (config.platform !== 'win32') {
    return
  }

  // Bazel relies heavily on symlinks.
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

async function restoreBazeliskCache () {
  const paths = config.bazeliskCache.paths
  const hash = await glob.hashFiles(config.bazeliskCache.files.join('\n'))
  const key = `${config.baseCacheKey}-bazelisk-${hash}`

  await restoreCache(config.bazeliskCache.name, paths, key)
}

async function restoreRepositoryCache () {
  const paths = config.repositoryCache.paths
  const hash = await glob.hashFiles(config.repositoryCache.files.join('\n'))
  const key = `${config.baseCacheKey}-repository-${hash}`
  const restoreKeys = [`${config.baseCacheKey}-repository-`]

  await restoreCache('repository', paths, key, restoreKeys)
}

async function restoreExternalCache (cacheConfig) {
  const paths = [`${config.paths.bazelExternal}/${cacheConfig.name}`]
  const hash = await glob.hashFiles(cacheConfig.files.join('\n'))
  const key = `${config.baseCacheKey}-external-${cacheConfig.name}-${hash}`
  const restoreKeys = [`${config.baseCacheKey}-external-${cacheConfig.name}-`]

  await restoreCache(`external-${cacheConfig.name}`, paths, key, restoreKeys)
}

async function restoreCache (name, paths, key, restoreKeys = []) {
  console.log(`Attempting to restore ${name} cache from ${key}`)

  const restoredKey = await cache.restoreCache(paths, key, restoreKeys)
  if (restoredKey) {
    console.log(`Successfully restored cache from ${restoredKey}`)
    if (restoredKey === key) {
      return
    }
  } else {
    console.log(`Failed to restore ${name} cache`)
  }

  core.saveState(`${name}-cache-key`, key)
}

run()
