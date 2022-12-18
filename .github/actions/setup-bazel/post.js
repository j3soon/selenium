const cache = require('@actions/cache')
const core = require('@actions/core')
const glob = require('@actions/glob')
const config = require('./config')

async function run () {
  try {
    await saveCaches()
  } catch (error) {
    core.warning(error.stack)
  }
}

async function saveCaches () {
  await saveCache(config.bazeliskCache.paths, core.getState('bazelisk-cache-key'))
  await saveCache(config.repositoryCache.paths, core.getState('repository-cache-key'))

  for (const name in config.externalCache) {
    await saveExternalCache(config.externalCache[name])
  }
}

async function saveExternalCache (cacheConfig) {
  const globber = await glob.create(
    cacheConfig.paths.join('\n'),
    { implicitDescendants: false }
  )
  const paths = await globber.glob()

  console.log('[post.js:42] DEBUGGING STRING ==> 2')
  console.log(cacheConfig.paths.join('\n'))
  console.log('[post.js:48] DEBUGGING STRING ==> 0')
  console.log(paths)
  console.log('[post.js:50] DEBUGGING STRING ==> 3')

  await saveCache(
    paths,
    core.getState(`external-${cacheConfig.name}-cache-key`)
  )
}

async function saveCache (paths, key) {
  if (key.length === 0 || paths.length === 0) {
    return
  }

  console.log(`Saving cache ${key}`)
  await cache.saveCache(paths, key)
}

run()
