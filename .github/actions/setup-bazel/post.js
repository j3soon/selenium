const core = require('@actions/core')
const cache = require('@actions/cache')
const glob = require('@actions/glob')
const YAML = require('yaml')

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

  if (core.getBooleanInput('bazelisk-cache')) {
    await saveBazeliskCache(baseCacheKey)
  }

  if (core.getBooleanInput('repository-cache')) {
    await saveRepositoryCache(baseCacheKey)
  }

  const externalCache = YAML.parse(core.getInput('external-cache'))
  if (externalCache) {
    for (const name in externalCache) {
      const files = Array(externalCache[name]).flat()
      await saveExternalCache(name, files, baseCacheKey)
    }
  }
}

async function saveBazeliskCache (baseCacheKey) {
  const paths = [`${process.env.HOME}/.cache/bazelisk`]
  const hash = await glob.hashFiles('.bazelversion')
  const key = `${baseCacheKey}-repository-${hash}`
  console.log(`Bazelisk cache key: ${key}`)

  await cache.saveCache(paths, key)
}

async function saveRepositoryCache (baseCacheKey) {
  const paths = [`${process.env.HOME}/.cache/bazel-repo`]
  const hash = await glob.hashFiles(['**/BUILD.bazel', '**/BUILD', 'WORKSPACE'].join('\n'))
  const key = `${baseCacheKey}-repository-${hash}`
  console.log(`Repository cache key: ${key}`)

  await cache.saveCache(paths, key)
}

async function saveExternalCache (name, files, baseCacheKey) {
  const root = `${process.env.HOME}/.bazel/external/`
  const paths = [`${root}/${name}`, `${root}/@${name}.marker`]

  const hash = await glob.hashFiles(files.join('\n'))
  const key = `${baseCacheKey}-external-${name}-${hash}`
  console.log(`External cache key: ${key}`)

  await cache.saveCache(paths, key)
}

run()
