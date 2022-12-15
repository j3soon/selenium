const fs = require('fs')
const core = require('@actions/core')
const cache = require('@actions/cache')
const exec = require('@actions/exec')
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

  await exec.exec('bazel', ['version'])

  if (!result) {
    await cache.saveCache(paths, key)
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

run()
