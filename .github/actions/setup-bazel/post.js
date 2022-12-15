const core = require('@actions/core')
const cache = require('@actions/cache')
const glob = require('@actions/glob')

async function run () {
  try {
    await saveCaches()
  } catch (error) {
    core.warning(error.stack)
  }
}

async function saveCaches () {
  const cacheVersion = core.getInput('cache-version')
  const baseCacheKey = `setup-bazel-${cacheVersion}-${process.platform}`
  console.log(`Default cache key: ${baseCacheKey}`)

  if (core.getBooleanInput('repository-cache')) {
    await saveRepositoryCache(baseCacheKey)
  }
}

async function saveRepositoryCache (baseCacheKey) {
  const paths = [`${process.env.HOME}/.cache/bazel-repo`]
  const hash = await glob.hashFiles(['**/BUILD.bazel', '**/BUILD', 'WORKSPACE'].join('\n'))
  const key = `${baseCacheKey}-repository-${hash}`
  console.log(`Repository cache key: ${key}`)

  await cache.saveCache(paths, key)
}

run()
