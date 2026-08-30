import { useState, useEffect } from 'react';
import type { Summary } from './types';
import { loadSummary } from './data/loader';
import RankingPanel from './components/RankingPanel';
import DetailPanel from './components/DetailPanel';
import ComparisonChart from './components/ComparisonChart';
import MethodologyPanel from './components/MethodologyPanel';

const UNLOCK_PASSWORD = 'Weave';

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState(1);
  const [unmasked, setUnmasked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    loadSummary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === UNLOCK_PASSWORD) {
      setUnmasked(true);
      setShowPasswordField(false);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h1 className="text-lg font-bold text-red-600 mb-2">Failed to load data</h1>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-400">
            Run <code className="bg-gray-100 px-1 py-0.5 rounded">npm run collect</code> and{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded">npm run score</code> first to generate the data.
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const selectedEngineer = summary.rankings.find((r) => r.rank === selectedRank);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">GitHub Impact Analyzer</h1>
            <p className="text-xs text-gray-500">
              {summary.metadata.repo} &middot; Last {summary.metadata.windowDays} days &middot;{' '}
              {summary.metadata.totalEngineersScored} contributors analyzed
            </p>
          </div>
          <div className="text-xs text-gray-400">
            Generated {new Date(summary.metadata.generatedAt).toLocaleDateString()}
          </div>
        </div>
      </header>

      {/* Methodology */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <MethodologyPanel />
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Left sidebar */}
          <div className="w-64 shrink-0">
            <RankingPanel
              rankings={summary.rankings}
              selectedRank={selectedRank}
              onSelectRank={setSelectedRank}
              unmasked={unmasked}
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              {unmasked ? (
                <button
                  onClick={() => { setUnmasked(false); setPasswordInput(''); }}
                  className="w-full text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-2 py-2 rounded cursor-pointer"
                >
                  Re-anonymize
                </button>
              ) : showPasswordField ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-2">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                    placeholder="Enter password"
                    className={`w-full text-xs border rounded px-2 py-1.5 outline-none ${
                      passwordError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500">Incorrect password</p>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      type="submit"
                      className="flex-1 text-xs bg-indigo-600 text-white px-2 py-1.5 rounded hover:bg-indigo-700 cursor-pointer"
                    >
                      Unlock
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowPasswordField(false); setPasswordError(false); setPasswordInput(''); }}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowPasswordField(true)}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-2 rounded cursor-pointer"
                >
                  Show real names
                </button>
              )}
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {selectedEngineer && <DetailPanel engineer={selectedEngineer} unmasked={unmasked} />}
          </div>
        </div>

        {/* Bottom comparison */}
        <div className="mt-8">
          <ComparisonChart rankings={summary.rankings} unmasked={unmasked} />
        </div>
      </div>
    </div>
  );
}
