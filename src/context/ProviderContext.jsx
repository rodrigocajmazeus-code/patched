import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { DEFAULT_PROVIDER, getProvider, getEnabledProviders, resolveSelectedProvider } from '../data/providers.js'
import { normalizePlaybackPreference } from '../player/providerSelection.js'

const ProviderContext = createContext(null)

export function ProviderProvider({ children }) {
  const [storedProviderId, setProviderId] = useLocalStorage('streambox.provider', DEFAULT_PROVIDER)
  const [experimentalSetting, setExperimentalSetting] = useLocalStorage('streambox.experimental-providers.v1', false)
  const [storedVariant, setMovieMasterVariant] = useLocalStorage('streambox.moviemaster-requested-variant.v1', 'LAT')
  const [storedPreference, setPlaybackPreference] = useLocalStorage('streambox.playback-preference.v1', 'es-419')
  const [storedExcluded, setExcludedProviders] = useLocalStorage('streambox.excluded-providers.v1', [])
  const [storedRestricted, setRestrictedFrames] = useLocalStorage('streambox.restricted-frames.v1', false)
  const playbackPreference = normalizePlaybackPreference(storedPreference)
  const excludedProviders = useMemo(() => Array.isArray(storedExcluded) ? storedExcluded.filter(id => typeof id === 'string') : [], [storedExcluded])
  const restrictedFrames = storedRestricted === true
  const experimentalEnabled = experimentalSetting === true
  const movieMasterVariant = ['LAT', 'ESP', 'SUB'].includes(storedVariant) ? storedVariant : 'LAT'
  const providerId = resolveSelectedProvider(storedProviderId, experimentalEnabled)
  const providers = useMemo(() => getEnabledProviders(experimentalEnabled), [experimentalEnabled])
  const providerOptions = useMemo(() => ({ moviemaster: { requestedVariant: movieMasterVariant } }), [movieMasterVariant])

  const setExperimentalEnabled = useCallback((enabled) => {
    setExperimentalSetting(enabled === true)
    if (resolveSelectedProvider(storedProviderId, false) !== storedProviderId) setProviderId(DEFAULT_PROVIDER)
  }, [setExperimentalSetting, storedProviderId, setProviderId])

  const setProvider = useCallback(
    (id) => setProviderId(resolveSelectedProvider(id, experimentalEnabled)),
    [setProviderId, experimentalEnabled]
  )

  const value = useMemo(
    () => ({ providerId, provider: getProvider(providerId), setProvider, providers, providerOptions,
      experimentalEnabled, setExperimentalEnabled, movieMasterVariant, setMovieMasterVariant,
      playbackPreference, setPlaybackPreference, excludedProviders, setExcludedProviders, restrictedFrames, setRestrictedFrames }),
    [providerId, setProvider, providers, providerOptions, experimentalEnabled, setExperimentalEnabled, movieMasterVariant, setMovieMasterVariant,
      playbackPreference, setPlaybackPreference, excludedProviders, setExcludedProviders, restrictedFrames, setRestrictedFrames]
  )

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>
}

export function useProvider() {
  const ctx = useContext(ProviderContext)
  if (!ctx) throw new Error('useProvider must be used within ProviderProvider')
  return ctx
}
