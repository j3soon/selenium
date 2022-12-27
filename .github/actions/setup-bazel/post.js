const p = require('path')
const cache = require('@actions/cache')
const core = require('@actions/core')
const getFolderSize = require('get-folder-size')
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

  if (config.externalCache.enabled) {
    await saveExternalCaches(config.externalCache)
  }
}

async function saveExternalCaches (cacheConfig) {
  const globber = await glob.create(
    `${config.paths.bazelExternal}/*`,
    { implicitDescendants: false }
  )
  const paths = await globber.glob()

  for (const path of paths) {
    console.log(path)
    getFolderSize(path, (err, size) => {
      if (err) {
        throw err
      }

      const sizeMB = (size / 1024 / 1024).toFixed(2)
      console.log(sizeMB + ' MB')
      if (sizeMB >= 10) {
        const name = p.basename(path)
        saveCache({
          files: cacheConfig[name]?.files || ['WORKSPACE'],
          name: `external-${name}`,
          paths: [
            `${config.paths.bazelExternal}/@${name}.marker`,
            `${config.paths.bazelExternal}/${name}`
          ]
        })
      }
    })
  }
}

async function saveCache (cacheConfig) {
  let paths = cacheConfig.paths
  const key = core.getState(`${cacheConfig.name}-cache-key`)
  if (key.length === 0) {
    return
  }

  core.startGroup(`Save cache for ${cacheConfig.name}`)
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
