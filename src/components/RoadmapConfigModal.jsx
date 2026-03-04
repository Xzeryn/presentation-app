import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faXmark, faCheck, faFilter, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import { useRoadmapConfig } from '../context/RoadmapContext'

function RoadmapConfigModal() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const {
    configModalOpen,
    closeConfigModal,
    selectedItemIds,
    toggleItemSelection,
    excludedLabels,
    excludedKeyInitiatives,
    excludedReleaseTypes,
    setExcludedLabels,
    setExcludedKeyInitiatives,
    setExcludedReleaseTypes,
    resetRoadmapConfig,
  } = useRoadmapConfig()

  const [roadmapData, setRoadmapData] = useState({ items: [] })
  const [loading, setLoading] = useState(true)
  const [filterExpanded, setFilterExpanded] = useState(false)

  useEffect(() => {
    if (configModalOpen) {
      setLoading(true)
      fetch('/config/roadmap.json')
        .then((r) => r.ok ? r.json() : { items: [] })
        .then((data) => {
          setRoadmapData(data)
          setLoading(false)
        })
        .catch(() => {
          setRoadmapData({ items: [] })
          setLoading(false)
        })
    }
  }, [configModalOpen])

  const allLabels = useMemo(() => {
    const set = new Set()
    roadmapData.items.forEach((item) => item.labels?.forEach((l) => set.add(l)))
    return [...set].sort()
  }, [roadmapData.items])

  const allKeyInitiatives = useMemo(() => {
    const set = new Set()
    roadmapData.items.forEach((item) => {
      const ki = item.keyInitiatives
      if (Array.isArray(ki)) ki.forEach((k) => k && set.add(k))
      else if (ki) set.add(ki)
    })
    return [...set].sort()
  }, [roadmapData.items])

  const allReleaseTypes = useMemo(() => {
    const set = new Set()
    roadmapData.items.forEach((item) => item.releaseType && set.add(item.releaseType))
    return [...set].sort()
  }, [roadmapData.items])

  const filteredItems = useMemo(() => {
    return roadmapData.items.filter((item) => {
      const hasExcludedLabel = item.labels?.some((l) => excludedLabels.includes(l))
      const ki = item.keyInitiatives
      const itemInitiatives = Array.isArray(ki) ? ki : ki ? [ki] : []
      const hasExcludedInitiative = itemInitiatives.some((k) => excludedKeyInitiatives.includes(k))
      const hasExcludedReleaseType = item.releaseType && excludedReleaseTypes.includes(item.releaseType)
      return !hasExcludedLabel && !hasExcludedInitiative && !hasExcludedReleaseType
    })
  }, [roadmapData.items, excludedLabels, excludedKeyInitiatives, excludedReleaseTypes])

  const toggleExcluded = (value, current, setter) => {
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value]
    setter(next)
  }

  if (!configModalOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={closeConfigModal}
      >
        <div
          className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-elastic-dev-blue' : 'bg-white'
          } shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between p-4 border-b ${
              isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faGear} className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'} />
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                Roadmap Configuration
              </h2>
            </div>
            <button
              onClick={closeConfigModal}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-elastic-dev-blue/10 text-elastic-dev-blue/70'
              }`}
            >
              <FontAwesomeIcon icon={faXmark} className="text-xl" />
            </button>
          </div>

          {/* Filters */}
          <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
            <button
              onClick={() => setFilterExpanded(!filterExpanded)}
              className={`flex items-center gap-2 text-sm font-medium ${
                isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'
              }`}
            >
              <FontAwesomeIcon icon={faFilter} />
              Filters (exclude from display)
              {filterExpanded ? ' ▲' : ' ▼'}
            </button>
            <AnimatePresence>
              {filterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 space-y-3 overflow-hidden"
                >
                  {allLabels.length > 0 && (
                    <div>
                      <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                        Labels
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {allLabels.map((label) => (
                          <button
                            key={label}
                            onClick={() => toggleExcluded(label, excludedLabels, setExcludedLabels)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              excludedLabels.includes(label)
                                ? isDark
                                  ? 'bg-red-500/30 text-red-300'
                                  : 'bg-red-500/20 text-red-600'
                                : isDark
                                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/20'
                            }`}
                          >
                            {label} {excludedLabels.includes(label) ? '✕' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {allKeyInitiatives.length > 0 && (
                    <div>
                      <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                        Key Initiatives
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {allKeyInitiatives.map((ki) => (
                          <button
                            key={ki}
                            onClick={() => toggleExcluded(ki, excludedKeyInitiatives, setExcludedKeyInitiatives)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              excludedKeyInitiatives.includes(ki)
                                ? isDark
                                  ? 'bg-red-500/30 text-red-300'
                                  : 'bg-red-500/20 text-red-600'
                                : isDark
                                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/20'
                            }`}
                          >
                            {ki} {excludedKeyInitiatives.includes(ki) ? '✕' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {allReleaseTypes.length > 0 && (
                    <div>
                      <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                        Release Type
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {allReleaseTypes.map((rt) => (
                          <button
                            key={rt}
                            onClick={() => toggleExcluded(rt, excludedReleaseTypes, setExcludedReleaseTypes)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              excludedReleaseTypes.includes(rt)
                                ? isDark
                                  ? 'bg-red-500/30 text-red-300'
                                  : 'bg-red-500/20 text-red-600'
                                : isDark
                                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/20'
                            }`}
                          >
                            {rt} {excludedReleaseTypes.includes(rt) ? '✕' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={resetRoadmapConfig}
                    className={`flex items-center gap-2 text-xs ${isDark ? 'text-white/50 hover:text-white' : 'text-elastic-dev-blue/50 hover:text-elastic-dev-blue'}`}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} />
                    Reset all
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className={`text-center py-12 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                Loading roadmap...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className={`text-center py-12 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                No items to display. Run <code className="px-1 py-0.5 rounded bg-white/10">npm run fetch:roadmap</code> to
                pull roadmap data, or adjust filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id)
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => toggleItemSelection(item.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-500/10'
                          : isDark
                            ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
                            : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10 hover:border-elastic-dev-blue/20'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? 'bg-green-500 text-white' : isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'
                          }`}
                        >
                          {isSelected ? (
                            <FontAwesomeIcon icon={faCheck} className="text-xs" />
                          ) : (
                            <span className="text-[10px]">○</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`font-semibold text-sm truncate ${
                              isSelected ? 'text-green-600 dark:text-green-400' : isDark ? 'text-white' : 'text-elastic-dark-ink'
                            }`}
                          >
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.quarter && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  isDark ? 'bg-white/10 text-white/60' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60'
                                }`}
                              >
                                {item.quarter}
                              </span>
                            )}
                            {item.productArea && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue'
                                }`}
                              >
                                {item.productArea}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'} text-sm ${
              isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'
            }`}
          >
            {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} selected for presentation
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default RoadmapConfigModal
