import { useState } from 'react';

const dimensions = [
  {
    name: 'Unblocking Power',
    weight: '35%',
    description:
      'The highest-weighted dimension. Measures how effectively an engineer unblocks teammates by reviewing their PRs. Combines review turnaround time (median hours from PR creation to first review — faster is better) with the total number of distinct merged PRs reviewed.',
  },
  {
    name: 'Review Authority',
    weight: '30%',
    description:
      'Evaluates the quality and breadth of code review contributions. Three sub-signals: breadth (how many distinct authors this person reviews), substance (ratio of reviews that include comments or change requests vs rubber-stamp approvals), and review-to-author ratio (engineers who review more than they author score higher, with a 2:1 ratio earning full marks).',
  },
  {
    name: 'PR Significance',
    weight: '20%',
    description:
      'Assesses the impact of authored pull requests. Cross-directory scope measures how many parts of the codebase each PR touches. Merge rate tracks the ratio of merged vs closed PRs. Work type diversity rewards engineers who contribute across bug fixes, features, infrastructure, and other categories.',
  },
  {
    name: 'Discussion Leadership',
    weight: '10%',
    description:
      'Captures contributions beyond code. Counts comments on issues (non-PR discussions), comments on others\' PRs, and issues closed. Each is normalized against the highest contributor in the analysis window.',
  },
  {
    name: 'Scope of Influence',
    weight: '5%',
    description:
      'Measures breadth of codebase coverage by counting distinct top-level directories touched across all authored merged PRs, normalized against the engineer with the widest reach.',
  },
];

export default function MethodologyPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 rounded-lg"
      >
        <div>
          <h2 className="text-sm font-bold text-gray-800">How are engineers scored?</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Each engineer is evaluated across 5 dimensions, weighted by their importance to team impact.
          </p>
        </div>
        <span className="text-gray-400 text-sm ml-4 shrink-0">
          {isOpen ? '▲ Hide' : '▼ Show methodology'}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-3 mb-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              The overall score (0-100) is a weighted sum of 5 dimension scores. Each dimension score
              is normalized to 0-100 relative to the other engineers in the analysis window. The
              weighting emphasizes <strong>unblocking others</strong> and <strong>review quality</strong> over
              raw code output, reflecting the outsized impact that effective reviewers and collaborators
              have on team velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dimensions.map((dim) => (
              <div key={dim.name} className="border border-gray-100 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-gray-800">{dim.name}</h3>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {dim.weight}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{dim.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-500 leading-relaxed">
            <strong>Formula:</strong>{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">
              0.35 * Unblocking + 0.30 * Review + 0.20 * PR Sig + 0.10 * Discussion + 0.05 * Scope
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
