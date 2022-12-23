const fs = require('fs')
const core = require('@actions/core')
const cache = require('@actions/cache')
const glob = require('@actions/glob')
const io = require('@actions/io')
const config = require('./config')

async function run () {
  try {
    await setupBazel()
  } catch (error) {
    core.setFailed(error.stack)
  }
}

async function setupBazel () {
  core.startGroup('Configure Bazel')
  console.log('Configuration:')
  console.log(JSON.stringify(config, null, 2))

  await optimizeCacheOnWindows()
  await setupBazelrc()
  core.endGroup()

  if (core.getBooleanInput('bazelisk-cache')) {
    await restoreCache(config.bazeliskCache)
  }

  if (core.getBooleanInput('disk-cache')) {
    await restoreCache(config.diskCache)
  }

  if (core.getBooleanInput('repository-cache')) {
    await restoreCache(config.repositoryCache)
  }

  for (const name in config.externalCache) {
    await restoreCache(config.externalCache[name], true)
  }
}

async function optimizeCacheOnWindows () {
  if (config.platform !== 'win32') {
    return
  }

  // Bazel relies heavily on symlinks.
  console.log('Enabling native symlinks support')
  core.exportVariable('MSYS', 'winsymlinks:native')
}

async function setupBazelrc () {
  fs.writeFileSync(
    config.paths.bazelrc,
    `startup --output_base=${config.paths.bazelOutputBase}\n`
  )

  for (const line of config.bazelrc) {
    fs.appendFileSync(config.paths.bazelrc, `${line}\n`)
  }
}

async function restoreCache (cacheConfig, extract = false) {
  core.startGroup(`Restore cache for ${cacheConfig.name}`)

  const hash = await glob.hashFiles(cacheConfig.files.join('\n'))
  const name = cacheConfig.name
  const restoreKey = `${config.baseCacheKey}-${name}-`
  const key = `${restoreKey}${hash}`
  let paths = []
  if (extract) {
    paths = [`${config.paths.bazelExternal}/${cacheConfig.name}`]
  } else {
    paths = cacheConfig.paths
  }

  console.log(`Attempting to restore ${name} cache from ${key}`)

  const restoredKey = await cache.restoreCache(paths, key, [restoreKey])
  if (restoredKey) {
    console.log(`Successfully restored cache from ${restoredKey}`)
    if (restoredKey !== key) {
      core.saveState(`${name}-cache-key`, key)
    }

    if (extract) {
      console.log('Extracting...')
      const globber = await glob.create(
        `${config.paths.bazelExternal}/${cacheConfig.name}/*`,
        { implicitDescendants: false }
      )
      const globbedPaths = await globber.glob()
      console.log(globbedPaths)

      for (const path of globbedPaths) {
        console.log(`Moving ${path} up`)
        await io.mv(path, config.paths.bazelExternal, { recursive: true })
      }
      await io.rmRF(`${config.paths.bazelExternal}/${cacheConfig.name}`)
    }
  } else {
    console.log(`Failed to restore ${name} cache`)
    core.saveState(`${name}-cache-key`, key)
  }

  core.endGroup()
}

run()
