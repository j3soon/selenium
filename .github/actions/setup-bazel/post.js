const core = require('@actions/core')
const cache = require('@actions/cache')
const config = require('./config')

async function run () {
  try {
    await saveCaches()
  } catch (error) {
    core.warning(error.stack)
  }
}

async function saveCaches () {
  await saveBazeliskCache()
  await saveRepositoryCache()

  for (const name in config.externalCache) {
    await saveExternalCache(name)
  }
}

async function saveBazeliskCache () {
  await saveCache(
    [config.paths.bazelisk],
    core.getState('bazelisk-cache-key')
  )
}

async function saveRepositoryCache () {
  await saveCache(
    [config.paths.bazelRepository],
    core.getState('repository-cache-key')
  )
}

async function saveExternalCache (name) {
  await saveCache(
    [
      `${config.paths.bazelExternal}/@${name}.marker`,
      `${config.paths.bazelExternal}/${name}`
    ],
    core.getState(`external-${name}-cache-key`)
  )
}

async function saveCache (paths, key) {
  if (key.length === 0) {
    return
  }

  await cache.saveCache(paths, key)
}

run()
