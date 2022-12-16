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

  await restoreCache('bazelisk', paths, key)
}

async function setupRepositoryCache (baseCacheKey) {
  const repositoryCachePath = `${process.env.HOME}/.cache/bazel-repo`
  fs.appendFileSync(
    `${process.env.HOME}/.bazelrc`,
    `build --repository_cache=${repositoryCachePath}\n`
  )

  const paths = [repositoryCachePath]
  const hash = await glob.hashFiles(['**/BUILD.bazel', '**/BUILD', 'WORKSPACE'].join('\n'))
  const key = `${baseCacheKey}-repository-${hash}`
  const restoreKeys = [`${baseCacheKey}-repository-`]

  await restoreCache('repository', paths, key, restoreKeys)
}

async function setupExternalCache (name, files, baseCacheKey) {
  const root = `${process.env.HOME}/.bazel/external/`
  const paths = [`${root}/${name}`, `${root}/@${name}.marker`]
  const hash = await glob.hashFiles(files.join('\n'))
  const key = `${baseCacheKey}-external-${name}-${hash}`
  const restoreKeys = [`${baseCacheKey}-external-${name}-`]

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
