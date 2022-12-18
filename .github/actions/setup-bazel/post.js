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
  const globber = await glob.create([
    `${config.paths.bazelExternal}/@${name}.marker`,
    `${config.paths.bazelExternal}/${name}`
  ].join('\n'), { implicitDescendants: false })

  console.log('[post.js:42] DEBUGGING STRING ==> 2')
  console.log([
    `${config.paths.bazelExternal}/@${name}.marker`,
    `${config.paths.bazelExternal}/${name}`
  ].join('\n'))
  console.log('[post.js:48] DEBUGGING STRING ==> 0')
  console.log(await globber.glob())
  console.log('[post.js:50] DEBUGGING STRING ==> 3')

  await saveCache(
    await globber.glob(),
    core.getState(`external-${name}-cache-key`)
  )
}

async function saveCache (paths, key) {
  if (key.length === 0) {
    return
  }

  console.log(`Saving cache ${key}`)
  await cache.saveCache(paths, key)
}

run()
