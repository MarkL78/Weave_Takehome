import { useState } from 'react';
import type { DimensionDetail, DimensionScores } from '../types';

interface ScoreBreakdownProps {
  details: DimensionDetail[];
}

const dimensionDescriptions: Record<keyof DimensionScores, string> = {
  scopeOfInfluence:
    'Measures how many distinct top-level directories this engineer has touched across their merged PRs. A higher score means broader codebase reach.',
  reviewAuthority:
    'Combines three signals: breadth (how many distinct authors reviewed), substance (ratio of substantive reviews vs rubber-stamp approvals), and review-to-author ratio (reviews given vs PRs authored — a ratio of 2:1+ scores 100).',
  unblockingPower:
    'Measures how quickly and frequently this engineer unblocks others. Turnaround is the median time from PR creation to their first review (faster = higher). Unblock count is how many distinct merged PRs they reviewed.',
  prSignificance:
    'Evaluates the impact of authored PRs. Cross-directory scope is the average number of top-level dirs per PR. Merge rate is merged/(merged+closed). Work type diversity counts distinct label categories (bug/feature/infra/other).',
  discussionLeadership:
    'Tracks participation in discussion beyond code. Issue comments (on non-PR issues), PR discussion (comments on others\' PRs), and issues closed are each normalized against the top contributor.',
};

export default function ScoreBreakdown({ details }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalWeighted = details.reduce((sum, d) => sum + d.weighted, 0);

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-1">Score Breakdown</h3>
      <p className="text-xs text-gray-400 mb-3">
        Overall score is a weighted sum of 5 dimensions (0-100 each). Click a row to see how it's calculated.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-1 font-medium">Dimension</th>
            <th className="py-1 font-medium text-right">Weight</th>
            <th className="py-1 font-medium text-right">Score</th>
            <th className="py-1 font-medium text-right">Weighted</th>
          </tr>
        </thead>
        <tbody>
          {details.map((dim) => (
            <>
              <tr
                key={dim.key}
                className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === dim.key ? null : dim.key)}
              >
                <td className="py-1.5 text-gray-800">
                  <span className="mr-1 text-gray-400 text-xs">
                    {expanded === dim.key ? '▼' : '▶'}
                  </span>
                  {dim.name}
                </td>
                <td className="py-1.5 text-right text-gray-500">
                  {(dim.weight * 100).toFixed(0)}%
                </td>
                <td className="py-1.5 text-right font-medium text-gray-800">
                  {dim.score.toFixed(1)}
                </td>
                <td className="py-1.5 text-right text-indigo-600 font-medium">
                  {dim.weighted.toFixed(1)}
                </td>
              </tr>
              {expanded === dim.key && (
                <>
                  <tr key={`${dim.key}-desc`} className="bg-indigo-50">
                    <td className="py-2 px-3 text-xs text-indigo-700 leading-relaxed" colSpan={4}>
                      {dimensionDescriptions[dim.key]}
                    </td>
                  </tr>
                  {dim.subBreakdowns.map((sub) => (
                    <tr key={`${dim.key}-${sub.label}`} className="bg-gray-50">
                      <td className="py-1 pl-6 text-gray-600 text-xs" colSpan={2}>
                        {sub.label}
                      </td>
                      <td className="py-1 text-right text-xs text-gray-600">
                        {sub.value.toFixed(1)}
                      </td>
                      <td className="py-1" />
                    </tr>
                  ))}
                </>
              )}
            </>
          ))}
          <tr className="border-t border-gray-300">
            <td className="py-1.5 font-bold text-gray-800" colSpan={2}>Overall</td>
            <td className="py-1.5" />
            <td className="py-1.5 text-right font-bold text-indigo-600">
              {totalWeighted.toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
