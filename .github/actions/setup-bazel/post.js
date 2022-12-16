const core = require('@actions/core')
const cache = require('@actions/cache')
const YAML = require('yaml')

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

  const externalCache = YAML.parse(core.getInput('external-cache'))
  if (externalCache) {
    for (const name in externalCache) {
      await saveExternalCache(name)
    }
  }
}

async function saveBazeliskCache () {
  await saveCache(
    [`${process.env.HOME}/.cache/bazelisk`],
    core.getState('bazelisk-cache-key')
  )
}

async function saveRepositoryCache () {
  await saveCache(
    [`${process.env.HOME}/.cache/bazel-repo`],
    core.getState('repository-cache-key')
  )
}

async function saveExternalCache (name) {
  const root = `${process.env.HOME}/.bazel/external/`
  await saveCache(
    [`${root}/${name}`, `${root}/@${name}.marker`],
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
