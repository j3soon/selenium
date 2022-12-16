const fs = require('fs')
const yaml = require('yaml')
const core = require('@actions/core')
const cache = require('@actions/cache')
// const exec = require('@actions/exec')
const glob = require('@actions/glob')

async function run () {
  try {
    await setupBazel()
  } catch (error) {
    core.setFailed(error.stack)
  }
}

async function setupBazel () {
  fs.writeFileSync(
    `${process.env.HOME}/.bazelrc`,
    `startup --output_base=${process.env.HOME}/.bazel\n`
  )
  const cacheVersion = core.getInput('cache-version')
  const baseCacheKey = `setup-bazel-${cacheVersion}-${process.platform}`
  console.log(`Default cache key: ${baseCacheKey}`)

  if (core.getBooleanInput('bazelisk-cache')) {
    await setupBazeliskCache(baseCacheKey)
  }

  if (core.getBooleanInput('repository-cache')) {
    await setupRepositoryCache(baseCacheKey)
  }

  const externalCache = yaml.parse(core.getInput('external-cache'))
  if (externalCache) {
    for (const name in externalCache) {
      const files = Array(externalCache[name]).flat()
      await setupExternalCache(name, files, baseCacheKey)
    }
  }
}

async function setupBazeliskCache (baseCacheKey) {
  const paths = [`${process.env.HOME}/.cache/bazelisk`]
  const hash = await glob.hashFiles('.bazelversion')
  const key = `${baseCacheKey}-bazelisk-${hash}`
  console.log(`Bazelisk cache key: ${key}`)

  const result = await cache.restoreCache(paths, key)
  if (result) {
    console.log('Successfully restored Bazelisk cache')
  } else {
    console.log('Failed to restore Bazelisk cache')
  }
}

async function setupRepositoryCache (baseCacheKey) {
  const repositoryCachePath = `${process.env.HOME}/.cache/bazel-repo`
  fs.appendFileSync(
    `${process.env.HOME}/.bazelrc`,
    `build --repository_cache=${repositoryCachePath}\n`
  )

  const hash = await glob.hashFiles(['**/BUILD.bazel', '**/BUILD', 'WORKSPACE'].join('\n'))
  const key = `${baseCacheKey}-repository-${hash}`
  const restoreKeys = [`${baseCacheKey}-repository-`]
  console.log(`Repository cache key: ${key}`)

  const result = await cache.restoreCache([repositoryCachePath], key, restoreKeys)
  if (result) {
    console.log('Successfully restored repository cache')
  } else {
    console.log('Failed to restore repository cache')
  }
}

async function setupExternalCache (name, files, baseCacheKey) {
  const root = `${process.env.HOME}/.bazel/external/`
  const paths = [`${root}/${name}`, `${root}/@${name}.marker`]

  const hash = await glob.hashFiles(files.join('\n'))
  const key = `${baseCacheKey}-external-${name}-${hash}`
  const restoreKeys = [`${baseCacheKey}-external-${name}-`]
  console.log(`External cache key: ${key}`)

  const result = await cache.restoreCache(paths, key, restoreKeys)
  if (result) {
    console.log('Successfully restored external cache')
  } else {
    console.log('Failed to restore external cache')
  }
}

run()
