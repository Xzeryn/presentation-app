import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'

// Ensure colons after common bold labels in GitHub body markdown
const ensureLabelColons = (body) => {
  if (!body || typeof body !== 'string') return body
  return body
    .replace(/\*\*(What the feature is and who is it for)\*\*(?!:)/g, '**$1:**')
    .replace(/\*\*(What the feature is and who it's for)\*\*(?!:)/g, '**$1:**')
    .replace(/\*\*(What the feature is)\*\*(?!:)/g, '**$1:**')
    .replace(/\*\*(Value proposition)\*\*(?!:)/g, '**$1:**')
}

const createMarkdownComponents = (isDark) => ({
  strong: ({ children }) => (
    <strong className={isDark ? 'font-bold text-elastic-poppy' : 'font-bold text-elastic-blue'}>
      {children}
    </strong>
  ),
})

export default function RoadmapDetailModal({ item, onClose }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!item) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      onClick={onClose}
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
              {item.title}
            </h3>
            <button
              onClick={onClose}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-elastic-dev-blue/10 text-elastic-dev-blue/70'
              }`}
            >
              <FontAwesomeIcon icon={faXmark} className="text-xl" />
            </button>
          </div>
          {(item.status || item.releaseType || item.state) && (
            <div
              className={`px-4 py-2 border-b flex justify-between items-center text-xs ${
                isDark ? 'border-white/10 text-white/50' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/50'
              }`}
            >
              {item.status && <span>{item.status}</span>}
              {item.releaseType && <span>{item.releaseType}</span>}
              {item.state && <span>{item.state}</span>}
            </div>
          )}
          <div
            className={`flex-1 overflow-y-auto p-4 prose prose-sm max-w-none space-y-4 ${
              isDark
                ? 'prose-invert prose-headings:text-white prose-p:text-white/80 prose-strong:text-elastic-poppy prose-a:text-elastic-teal'
                : 'prose-headings:text-elastic-dark-ink prose-p:text-elastic-dev-blue/80 prose-strong:text-elastic-blue prose-a:text-elastic-blue'
            }`}
          >
            {item.summary?.for || item.summary?.value || item.summary?.scope ? (
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
                    {item.summary.for && (
                      <div>
                        <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>For: </span>
                        {item.summary.for}
                      </div>
                    )}
                    {item.summary.value && (
                      <div>
                        <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>Value: </span>
                        {item.summary.value}
                      </div>
                    )}
                    {item.summary.scope && (
                      <div>
                        <span className={`font-bold ${isDark ? 'text-elastic-poppy' : 'text-elastic-blue'}`}>Scope: </span>
                        {item.summary.scope}
                      </div>
                    )}
                  </div>
                </div>
                {item.body && (
                  <>
                    <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                      Original description
                    </h4>
                    <ReactMarkdown components={createMarkdownComponents(isDark)}>{ensureLabelColons(item.body)}</ReactMarkdown>
                  </>
                )}
              </>
            ) : (
              <ReactMarkdown components={createMarkdownComponents(isDark)}>{ensureLabelColons(item.body || '')}</ReactMarkdown>
            )}
          </div>
        </motion.div>
    </motion.div>
  )
}
