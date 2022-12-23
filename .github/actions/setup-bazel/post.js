const cache = require('@actions/cache')
const core = require('@actions/core')
const glob = require('@actions/glob')
const io = require('@actions/io')
const config = require('./config')

async function run () {
  // try {
  await saveCaches()
  // } catch (error) {
  //   core.warning(error.stack)
  // }
}

async function saveCaches () {
  await saveCache(config.bazeliskCache.paths, core.getState('bazelisk-cache-key'))
  await saveCache(config.diskCache.paths, core.getState('disk-cache-key'))
  await saveCache(config.repositoryCache.paths, core.getState('repository-cache-key'))

  for (const name in config.externalCache) {
    await saveExternalCache(config.externalCache[name])
  }
}

async function saveExternalCache (cacheConfig) {
  console.log('[post.js:26] DEBUGGING STRING ==> 2')
  console.log(cacheConfig.paths.join('\n'))
  const globber = await glob.create(
    cacheConfig.paths.join('\n'),
    { implicitDescendants: false }
  )
  console.log('[post.js:31] DEBUGGING STRING ==> 3')
  const paths = await globber.glob()
  console.log('[post.js:33] DEBUGGING STRING ==> 4')

  if (paths.length === 0) {
    return
  }

  console.log('[post.js:42] DEBUGGING STRING ==> 2')
  console.log('[post.js:48] DEBUGGING STRING ==> 0')
  console.log(paths)
  console.log('[post.js:50] DEBUGGING STRING ==> 3')

  const knownPath = `${config.paths.bazelExternal}/${cacheConfig.name}`
  console.log(`Known path is ${knownPath}`)
  await io.mkdirP(knownPath)
  for (const path of paths) {
    console.log(`Copying ${path} to ${knownPath}`)
    await io.cp(path, knownPath, { recursive: true })
  }

  await saveCache(
    [knownPath],
    core.getState(`${cacheConfig.name}-cache-key`)
  )
  await io.rmRF(knownPath)
}

async function saveCache (paths, key) {
  if (key.length === 0) {
    return
  }

  console.log(`Saving cache ${key}`)
  await cache.saveCache(paths, key)
}

run()
