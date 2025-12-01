'use client';

interface ConfigurationPanelProps {
  bearerToken: string;
  setBearerToken: (token: string) => void;
  leagueId: string;
  setLeagueId: (id: string) => void;
  availableLeagues: Array<{ id: number; name: string }>;
  loadingAll: boolean;
  allDataLoaded: boolean;
  loadingStatus: string;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  handleLoadAllData: (forceRefresh: boolean) => void;
  handleClearCache: () => void;
}

export default function ConfigurationPanel({
  bearerToken,
  setBearerToken,
  leagueId,
  setLeagueId,
  availableLeagues,
  loadingAll,
  allDataLoaded,
  loadingStatus,
  sidebarCollapsed,
  setSidebarCollapsed,
  handleLoadAllData,
  handleClearCache,
}: ConfigurationPanelProps) {
  return (
    <>
      {sidebarCollapsed ? (
        // Collapsed sidebar - thin panel with expand icon
        <div className="fixed top-0 left-0 w-12 h-screen bg-white border-r border-gray-200 flex items-start justify-center pt-6 z-10 transition-all duration-300">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Expand Configuration"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : (
        // Expanded sidebar
        <div className="fixed top-0 left-0 w-80 h-screen bg-white border-r border-gray-200 p-6 overflow-y-auto z-10 transition-all duration-300">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Configuration</h2>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Collapse Configuration"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div>
              <label htmlFor="bearer-token" className="block text-sm font-medium text-gray-700 mb-2">
                Bearer Token
              </label>
              <textarea
                id="bearer-token"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Paste token..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
                rows={6}
              />
            </div>

            {availableLeagues.length > 0 && (
              <div>
                <label htmlFor="league-select" className="block text-sm font-medium text-gray-700 mb-2">
                  {availableLeagues.length > 1 ? 'Select League' : 'League'}
                </label>
                {availableLeagues.length === 1 ? (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                    {availableLeagues[0].name}
                  </div>
                ) : (
                  <>
                    <select
                      id="league-select"
                      value={leagueId}
                      onChange={(e) => setLeagueId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {availableLeagues.map(league => (
                        <option key={league.id} value={league.id}>
                          {league.name}
                        </option>
                      ))}
                    </select>
                    {allDataLoaded && (
                      <p className="text-xs text-gray-500 mt-1">
                        Change league and click "Refresh from API" to reload data
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <button
                onClick={() => handleLoadAllData(false)}
                disabled={loadingAll}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loadingAll ? 'Loading...' : 'Load All Data'}
              </button>

              {allDataLoaded && (
                <button
                  onClick={() => handleLoadAllData(true)}
                  disabled={loadingAll}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Refresh from API
                </button>
              )}

              <button
                onClick={handleClearCache}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Clear Cache
              </button>
            </div>

            {loadingStatus && (
              <div className={`p-4 rounded-lg text-xs ${loadingStatus.startsWith('✓')
                ? 'bg-green-50 text-green-800'
                : loadingStatus.startsWith('✗')
                  ? 'bg-red-50 text-red-800'
                  : 'bg-blue-50 text-blue-800'
                }`}>
                <pre className="whitespace-pre-wrap font-mono">{loadingStatus}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

