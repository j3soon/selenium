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

  fs.writeFileSync(
    config.paths.bazelRc,
    `startup --output_base=${config.paths.bazelOutputBase}\n`
  )

  if (core.getBooleanInput('bazelisk-cache')) {
    await setupBazeliskCache()
  }

  if (core.getBooleanInput('repository-cache')) {
    fs.appendFileSync(
      config.paths.bazelRc,
      `build --repository_cache=${config.paths.bazelRepository}\n`
    )
    await setupRepositoryCache()
  }

  for (const name in config.externalCache) {
    await setupExternalCache(name, config.externalCache[name])
  }
}

async function setupBazeliskCache () {
  const paths = [config.paths.bazelisk]
  const hash = await glob.hashFiles('.bazelversion')
  const key = `${config.baseCacheKey}-bazelisk-${hash}`

  await restoreCache('bazelisk', paths, key)
}

async function setupRepositoryCache () {
  const paths = [config.paths.bazelRepository]
  const hash = await glob.hashFiles([
    '**/BUILD.bazel',
    '**/BUILD',
    'WORKSPACE.bazel',
    'WORKSPACE'
  ].join('\n'))
  const key = `${config.baseCacheKey}-repository-${hash}`
  const restoreKeys = [`${config.baseCacheKey}-repository-`]

  await restoreCache('repository', paths, key, restoreKeys)
}

async function setupExternalCache (name, files) {
  const paths = [
    `${config.paths.bazelExternal}/@${name}.marker`,
    `${config.paths.bazelExternal}/${name}`
  ]
  const hash = await glob.hashFiles(files.join('\n'))
  const key = `${config.baseCacheKey}-external-${name}-${hash}`
  const restoreKeys = [`${config.baseCacheKey}-external-${name}-`]

  await restoreCache(`external-${name}`, paths, key, restoreKeys)
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
