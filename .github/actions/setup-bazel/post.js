const cache = require('@actions/cache')
const core = require('@actions/core')
const glob = require('@actions/glob')
const io = require('@actions/io')
const config = require('./config')

async function run () {
  try {
    await saveCaches()
  } catch (error) {
    core.warning(error.stack)
  }
}

async function saveCaches () {
  await saveCache(config.bazeliskCache)
  await saveCache(config.diskCache)
  await saveCache(config.repositoryCache)

  for (const name in config.externalCache) {
    await saveCache(config.externalCache[name])
  }
}

async function saveCache (cacheConfig) {
  core.startGroup(`Save cache for ${cacheConfig.name}`)
  let paths = cacheConfig.paths
  const key = core.getState(`${cacheConfig.name}-cache-key`)
  if (key.length === 0) {
    return
  }

  if (cacheConfig.packageTo) {
    const globber = await glob.create(
      paths.join('\n'),
      { implicitDescendants: false }
    )
    paths = await globber.glob()

    if (paths.length === 0) {
      return
    }

    console.log(`Packaging cache contents to ${cacheConfig.packageTo}`)
    await io.mkdirP(cacheConfig.packageTo)

    for (const path of paths) {
      console.log(`Copying ${path} to ${cacheConfig.packageTo}`)
      await io.cp(path, cacheConfig.packageTo, { recursive: true })
    }

    paths = [cacheConfig.packageTo]
  }

  console.log(`Attempting to save ${paths} cache to ${key}`)
  await cache.saveCache(paths, key)
  console.log('Successfully saved cache')
  core.endGroup()
}

run()
