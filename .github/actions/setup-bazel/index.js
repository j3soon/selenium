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
    await restoreExternalCache(name, config.externalCache[name])
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

  await restoreCache('bazelisk', paths, key)
}

async function restoreRepositoryCache () {
  const paths = config.repositoryCache.paths
  const hash = await glob.hashFiles(config.repositoryCache.files.join('\n'))
  const key = `${config.baseCacheKey}-repository-${hash}`
  const restoreKeys = [`${config.baseCacheKey}-repository-`]

  await restoreCache('repository', paths, key, restoreKeys)
}

async function restoreExternalCache (name, files) {
  const paths = [config.paths.bazelExternal]
  const hash = await glob.hashFiles(files.join('\n'))
  const key = `${config.baseCacheKey}-external-${name.replace('*', '')}-${hash}`
  const restoreKeys = [`${config.baseCacheKey}-external-${name.replace('*', '')}-`]

  await restoreCache(`external-${name.replace('*', '')}`, paths, key, restoreKeys)
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

  core.saveState(`${name.replace('*', '')}-cache-key`, key)
}

run()
