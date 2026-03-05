import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faXmark, faCheck, faFilter, faRotateLeft, faSquareCheck, faSquare, faExpand } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import { useRoadmapConfig } from '../context/RoadmapContext'

const TOOLTIP_DELAY_MS = 250
const TOOLTIP_PREVIEW_LENGTH = 280

// Ensure colons after common bold labels in GitHub body markdown
const ensureLabelColons = (body) => {
  if (!body || typeof body !== 'string') return body
  return body
    .replace(/\*\*(What the feature is and who is it for)\*\*(?!:)/g, '**$1:**')
    .replace(/\*\*(What the feature is and who it's for)\*\*(?!:)/g, '**$1:**')
    .replace(/\*\*(What the feature is)\*\*(?!:)/g, '**$1:**')
    .replace(/\*\*(Value proposition)\*\*(?!:)/g, '**$1:**')
}

// Custom strong renderer for markdown - colors bold labels (e.g. "What the feature is...", "Value proposition") dynamically
const createMarkdownComponents = (isDark) => ({
  strong: ({ children }) => (
    <strong className={isDark ? 'font-bold text-elastic-poppy' : 'font-bold text-elastic-blue'}>
      {children}
    </strong>
  ),
})

function RoadmapConfigModal() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const {
    configModalOpen,
    closeConfigModal,
    selectedItemIds,
    setSelectedItemIds,
    toggleItemSelection,
    filterLabels,
    filterKeyInitiatives,
    filterReleaseTypes,
    setFilterLabels,
    setFilterKeyInitiatives,
    setFilterReleaseTypes,
    resetRoadmapConfig,
  } = useRoadmapConfig()

  const [roadmapData, setRoadmapData] = useState({ items: [] })
  const [loading, setLoading] = useState(true)
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [tooltipItemId, setTooltipItemId] = useState(null)
  const [tooltipRect, setTooltipRect] = useState(null)
  const tooltipTimerRef = useRef(null)
  const tooltipAnchorRef = useRef(null)

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

  // Include filter: show items matching selected filters. When no filters selected, show all.
  // Multiple filter types combine with AND (item must match each active filter category).
  const filteredItems = useMemo(() => {
    return roadmapData.items.filter((item) => {
      const itemLabels = item.labels ?? []
      const ki = item.keyInitiatives
      const itemInitiatives = Array.isArray(ki) ? ki : ki ? [ki] : []
      const itemReleaseType = item.releaseType

      const matchesLabels = filterLabels.length === 0 || itemLabels.some((l) => filterLabels.includes(l))
      const matchesInitiatives = filterKeyInitiatives.length === 0 || itemInitiatives.some((k) => filterKeyInitiatives.includes(k))
      const matchesReleaseType = filterReleaseTypes.length === 0 || (itemReleaseType && filterReleaseTypes.includes(itemReleaseType))

      return matchesLabels && matchesInitiatives && matchesReleaseType
    })
  }, [roadmapData.items, filterLabels, filterKeyInitiatives, filterReleaseTypes])

  const getDescriptionPreview = (body, maxLength = 120) => {
    if (!body || typeof body !== 'string') return ''
    const stripped = body
      .replace(/\*\*[^*]+\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_`]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
    if (stripped.length <= maxLength) return stripped
    return stripped.slice(0, maxLength).trim() + '…'
  }

  const getTooltipPreview = (body) => getDescriptionPreview(body, TOOLTIP_PREVIEW_LENGTH)

  const getDisplayPreview = (item) => {
    if (item.summary?.value) return item.summary.value
    if (item.summary?.for) return item.summary.for
    return getDescriptionPreview(item.body)
  }

  const getTooltipContent = (item) => {
    if (item.summary?.for || item.summary?.value || item.summary?.scope) {
      return null // Rendered as structured content with bold headers
    }
    return getTooltipPreview(item.body)
  }

  const hasTooltipSummary = (item) =>
    !!(item?.summary?.for || item?.summary?.value || item?.summary?.scope)

  const handleCardMouseEnter = (itemId, e) => {
    tooltipAnchorRef.current = e?.currentTarget ?? null
    tooltipTimerRef.current = setTimeout(() => setTooltipItemId(itemId), TOOLTIP_DELAY_MS)
  }

  const handleCardMouseLeave = (e) => {
    const related = e?.relatedTarget
    if (related?.closest?.('[data-roadmap-tooltip]')) return
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = null
    }
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipItemId(null)
      setTooltipRect(null)
    }, 200)
  }

  const handleTooltipMouseEnter = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = null
    }
  }

  const handleTooltipMouseLeave = () => {
    setTooltipItemId(null)
    setTooltipRect(null)
  }

  // Update tooltip position when shown or when scroll/resize
  useEffect(() => {
    if (!tooltipItemId || !tooltipAnchorRef.current) {
      setTooltipRect(null)
      return
    }
    const update = () => {
      if (tooltipAnchorRef.current) {
        setTooltipRect(tooltipAnchorRef.current.getBoundingClientRect())
      }
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [tooltipItemId])

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    }
  }, [])

  const toggleFilter = (value, current, setter) => {
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value]
    setter(next)
  }

  const selectAllVisible = () => {
    const idsToAdd = filteredItems.map((i) => i.id)
    setSelectedItemIds([...new Set([...selectedItemIds, ...idsToAdd])])
  }

  const unselectAllVisible = () => {
    const visibleIds = new Set(filteredItems.map((i) => i.id))
    setSelectedItemIds(selectedItemIds.filter((id) => !visibleIds.has(id)))
  }

  if (!configModalOpen) return null

  const tooltipItem = filteredItems.find((i) => i.id === tooltipItemId)
  const tooltipContent = tooltipItem ? getTooltipContent(tooltipItem) : null
  const tooltipHasContent = tooltipContent || (tooltipItem && hasTooltipSummary(tooltipItem))

  const tooltipPortal =
    tooltipItemId &&
    tooltipHasContent &&
    tooltipRect &&
    createPortal(
      <AnimatePresence>
        <motion.div
          key={tooltipItemId}
          data-roadmap-tooltip
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          className={`fixed z-[200] w-80 max-w-[calc(100vw-2rem)] p-3 rounded-lg shadow-xl border ${
            isDark ? 'bg-elastic-dev-blue border-white/20' : 'bg-white border-elastic-dev-blue/20'
          }`}
          style={{
            left: Math.max(16, Math.min(window.innerWidth - 336, tooltipRect.left + tooltipRect.width / 2 - 160)),
            top: Math.max(16, tooltipRect.top - 8),
            transform: 'translateY(-100%)',
          }}
        >
          <div className={`text-xs leading-relaxed whitespace-pre-line space-y-2 ${isDark ? 'text-white/90' : 'text-elastic-dev-blue/90'}`}>
            {tooltipItem && hasTooltipSummary(tooltipItem) ? (
              <>
                {tooltipItem.summary.for && (
                  <div>
                    <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>For: </span>
                    {tooltipItem.summary.for}
                  </div>
                )}
                {tooltipItem.summary.value && (
                  <div>
                    <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>Value: </span>
                    {tooltipItem.summary.value}
                  </div>
                )}
                {tooltipItem.summary.scope && (
                  <div>
                    <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>Scope: </span>
                    {tooltipItem.summary.scope}
                  </div>
                )}
              </>
            ) : (
              tooltipContent
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDetailItem(tooltipItem)
              setTooltipItemId(null)
              setTooltipRect(null)
            }}
            className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
              isDark ? 'text-elastic-teal hover:text-elastic-teal/80' : 'text-elastic-blue hover:text-elastic-blue/80'
            }`}
          >
            <FontAwesomeIcon icon={faExpand} className="text-[10px]" />
            View full
          </button>
        </motion.div>
      </AnimatePresence>,
      document.body
    )

  return (
    <>
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
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setFilterExpanded(!filterExpanded)}
                className={`flex items-center gap-2 text-sm font-medium ${
                  isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'
                }`}
              >
                <FontAwesomeIcon icon={faFilter} />
                Filters
                {filterExpanded ? ' ▲' : ' ▼'}
              </button>
              {filteredItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllVisible}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isDark
                        ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                        : 'bg-elastic-blue/20 hover:bg-elastic-blue/30 text-elastic-blue'
                    }`}
                  >
                    <FontAwesomeIcon icon={faSquareCheck} className="text-sm" />
                    Select all
                  </button>
                  <button
                    onClick={unselectAllVisible}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/20 text-white/70'
                        : 'bg-elastic-dev-blue/10 hover:bg-elastic-dev-blue/20 text-elastic-dev-blue/70'
                    }`}
                  >
                    <FontAwesomeIcon icon={faSquare} className="text-sm" />
                    Unselect all
                  </button>
                </div>
              )}
            </div>
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
                            onClick={() => toggleFilter(label, filterLabels, setFilterLabels)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              filterLabels.includes(label)
                                ? isDark
                                  ? 'bg-elastic-teal/30 text-elastic-teal'
                                  : 'bg-elastic-blue/30 text-elastic-blue'
                                : isDark
                                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/20'
                            }`}
                          >
                            {label}
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
                            onClick={() => toggleFilter(ki, filterKeyInitiatives, setFilterKeyInitiatives)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              filterKeyInitiatives.includes(ki)
                                ? isDark
                                  ? 'bg-elastic-teal/30 text-elastic-teal'
                                  : 'bg-elastic-blue/30 text-elastic-blue'
                                : isDark
                                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/20'
                            }`}
                          >
                            {ki}
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
                            onClick={() => toggleFilter(rt, filterReleaseTypes, setFilterReleaseTypes)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              filterReleaseTypes.includes(rt)
                                ? isDark
                                  ? 'bg-elastic-teal/30 text-elastic-teal'
                                  : 'bg-elastic-blue/30 text-elastic-blue'
                                : isDark
                                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/20'
                            }`}
                          >
                            {rt}
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
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id)
                  return (
                    <motion.div
                      key={item.id}
                      className="relative"
                      onMouseEnter={(e) => handleCardMouseEnter(item.id, e)}
                      onMouseLeave={handleCardMouseLeave}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {/* Card */}
                      <motion.div
                        onClick={() => toggleItemSelection(item.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-green-500 bg-green-500/10'
                            : isDark
                              ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
                              : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10 hover:border-elastic-dev-blue/20'
                        }`}
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
                              className={`font-semibold text-sm ${
                                isSelected ? 'text-green-600 dark:text-green-400' : isDark ? 'text-white' : 'text-elastic-dark-ink'
                              }`}
                            >
                              {item.title}
                            </h4>
                            {(item.body || item.summary) && (
                              <p
                                className={`text-xs mt-1.5 line-clamp-2 ${
                                  isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'
                                }`}
                              >
                                {getDisplayPreview(item)}
                              </p>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDetailItem(item)
                              }}
                              className={`mt-1.5 flex items-center gap-1 text-[10px] font-medium ${
                                isDark ? 'text-elastic-teal/80 hover:text-elastic-teal' : 'text-elastic-blue/80 hover:text-elastic-blue'
                              }`}
                            >
                              <FontAwesomeIcon icon={faExpand} className="text-[8px]" />
                              View full
                            </button>
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
                              {item.labels?.map((label) => (
                                <span
                                  key={label}
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isDark ? 'bg-white/5 text-white/50' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/50'
                                  }`}
                                >
                                  {label}
                                </span>
                              ))}
                              {(Array.isArray(item.keyInitiatives) ? item.keyInitiatives : item.keyInitiatives ? [item.keyInitiatives] : []).map((ki) => (
                                <span
                                  key={ki}
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isDark ? 'bg-white/5 text-white/50' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/50'
                                  }`}
                                >
                                  {ki}
                                </span>
                              ))}
                              {item.releaseType && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isDark ? 'bg-white/5 text-white/50' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/50'
                                  }`}
                                >
                                  {item.releaseType}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Detail modal */}
              <AnimatePresence>
                {detailItem && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                    onClick={() => setDetailItem(null)}
                  >
                    <div
                      className={`absolute inset-0 ${isDark ? 'bg-black/80' : 'bg-black/60'}`}
                      aria-hidden="true"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`relative w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col ${
                        isDark ? 'bg-elastic-dev-blue' : 'bg-white'
                      } shadow-2xl`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`flex items-center justify-between p-4 border-b ${
                          isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'
                        }`}
                      >
                        <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                          {detailItem.title}
                        </h3>
                        <button
                          onClick={() => setDetailItem(null)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-elastic-dev-blue/10 text-elastic-dev-blue/70'
                          }`}
                        >
                          <FontAwesomeIcon icon={faXmark} className="text-xl" />
                        </button>
                      </div>
                      <div
                        className={`flex-1 overflow-y-auto p-4 prose prose-sm max-w-none space-y-4 ${
                          isDark
                            ? 'prose-invert prose-headings:text-white prose-p:text-white/80 prose-strong:text-elastic-poppy prose-a:text-elastic-teal'
                            : 'prose-headings:text-elastic-dark-ink prose-p:text-elastic-dev-blue/80 prose-strong:text-elastic-blue prose-a:text-elastic-blue'
                        }`}
                      >
                        {detailItem.summary?.for || detailItem.summary?.value || detailItem.summary?.scope ? (
                          <>
                            <div
                              className={`rounded-lg p-4 border space-y-3 ${
                                isDark ? 'bg-white/5 border-white/10' : 'bg-elastic-dev-blue/5 border-elastic-dev-blue/10'
                              }`}
                            >
                              <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>
                                Summary
                              </h4>
                              <div className={`text-sm leading-relaxed space-y-3 ${isDark ? 'text-white/90' : 'text-elastic-dev-blue/90'}`}>
                                {detailItem.summary.for && (
                                  <div>
                                    <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>For: </span>
                                    {detailItem.summary.for}
                                  </div>
                                )}
                                {detailItem.summary.value && (
                                  <div>
                                    <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>Value: </span>
                                    {detailItem.summary.value}
                                  </div>
                                )}
                                {detailItem.summary.scope && (
                                  <div>
                                    <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>Scope: </span>
                                    {detailItem.summary.scope}
                                  </div>
                                )}
                              </div>
                            </div>
                            {detailItem.body && (
                              <>
                                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                                  Original description
                                </h4>
                                <ReactMarkdown components={createMarkdownComponents(isDark)}>{ensureLabelColons(detailItem.body)}</ReactMarkdown>
                              </>
                            )}
                          </>
                        ) : (
                          <ReactMarkdown components={createMarkdownComponents(isDark)}>{ensureLabelColons(detailItem.body || '')}</ReactMarkdown>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              </>
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
    {tooltipPortal}
    </>
  )
}

export default RoadmapConfigModal
