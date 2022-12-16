const core = require('@actions/core')
const cache = require('@actions/cache')
const YAML = require('yaml')

async function run () {
  try {
    await saveCache()
  } catch (error) {
    core.warning(error.stack)
  }
}

async function saveCache () {
  await saveBazeliskCache(core.getState('bazelisk-cache-key'))
  await saveRepositoryCache(core.getState('repository-cache-key'))

  const externalCache = YAML.parse(core.getInput('external-cache'))
  if (externalCache) {
    for (const name in externalCache) {
      await saveExternalCache(name, core.getState(`external-${name}-cache-key`))
    }
  }
}

async function saveBazeliskCache (key) {
  if (key.length === 0) {
    return
  }

  console.log(`Bazelisk cache key: ${key}`)
  const paths = [`${process.env.HOME}/.cache/bazelisk`]

  await cache.saveCache(paths, key)
}

async function saveRepositoryCache (key) {
  if (key.length === 0) {
    return
  }

  console.log(`Repository cache key: ${key}`)
  const paths = [`${process.env.HOME}/.cache/bazel-repo`]

  await cache.saveCache(paths, key)
}

async function saveExternalCache (name, key) {
  if (key.length === 0) {
    return
  }

  console.log(`External cache key: ${key}`)
  const root = `${process.env.HOME}/.bazel/external/`
  const paths = [`${root}/${name}`, `${root}/@${name}.marker`]

  await cache.saveCache(paths, key)
}

run()
