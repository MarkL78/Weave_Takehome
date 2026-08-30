import { useState } from 'react';
import type { DimensionDetail, DimensionScores } from '../types';

interface ScoreBreakdownProps {
  details: DimensionDetail[];
}

interface DimensionInfo {
  description: string;
  formula: string;
  subWeights: string[];
}

const dimensionInfo: Record<keyof DimensionScores, DimensionInfo> = {
  scopeOfInfluence: {
    description:
      'How broadly this engineer works across the codebase. Counts distinct top-level directories touched across all merged PRs.',
    formula: 'score = (engineer\'s dirs / max dirs across all engineers) * 100',
    subWeights: ['Directories touched: normalized to max (100%)'],
  },
  reviewAuthority: {
    description:
      'Quality and breadth of code review. Values substantive feedback (comments, change requests) over rubber-stamp approvals, and engineers who review widely across different authors.',
    formula: '0.4 * breadth + 0.3 * substance + 0.3 * review_ratio',
    subWeights: [
      'Breadth (40%): distinct PR authors reviewed, normalized to max',
      'Substance (30%): % of reviewed PRs where they left comments or requested changes (not just approved)',
      'Review-to-Author ratio (30%): reviews_given / PRs_authored; ratio of 2:1+ = 100',
    ],
  },
  unblockingPower: {
    description:
      'How effectively this engineer keeps teammates moving. Measures both responsiveness (time to first review on a PR) and volume of PRs reviewed. All review types count equally — rejecting a bad PR quickly is just as valuable as approving a good one.',
    formula: '0.5 * response_time + 0.5 * volume',
    subWeights: [
      'Response time (50%): median hours from PR creation to first review; fastest reviewer = 100, slowest = 0 (inverse linear scale)',
      'Review volume (50%): count of distinct merged PRs reviewed, normalized to max',
    ],
  },
  prSignificance: {
    description:
      'Impact and quality of authored pull requests. Rewards cross-cutting changes, high merge rates, and diverse work types.',
    formula: '0.4 * cross_dir + 0.2 * merge_rate + 0.4 * diversity',
    subWeights: [
      'Cross-directory scope (40%): avg top-level dirs per PR, normalized to max',
      'Merge rate (20%): merged / (merged + closed_without_merge) * 100',
      'Work type diversity (40%): distinct label categories (bug/feature/infra/other); 4 categories = 100',
    ],
  },
  discussionLeadership: {
    description:
      'Participation in discussion beyond writing code. Tracks engagement on issues and others\' PRs, plus issues closed.',
    formula: '0.4 * issue_comments + 0.3 * pr_discussion + 0.3 * issues_closed',
    subWeights: [
      'Issue comments (40%): comments on non-PR issues, normalized to max',
      'PR discussion (30%): comments on others\' PRs, normalized to max',
      'Issues closed (30%): count of issues closed, normalized to max',
    ],
  },
};

export default function ScoreBreakdown({ details }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalWeighted = details.reduce((sum, d) => sum + d.weighted, 0);

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-1">Score Breakdown</h3>
      <p className="text-xs text-gray-400 mb-3">
        Overall = weighted sum of 5 dimensions (each 0-100). Click a row to see the formula and sub-scores.
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
          {details.map((dim) => {
            const info = dimensionInfo[dim.key];
            return (
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
                    {/* Description */}
                    <tr key={`${dim.key}-desc`} className="bg-indigo-50">
                      <td className="py-2 px-3 text-xs text-indigo-700 leading-relaxed" colSpan={4}>
                        {info.description}
                      </td>
                    </tr>
                    {/* Formula */}
                    <tr key={`${dim.key}-formula`} className="bg-indigo-50">
                      <td className="pb-2 px-3" colSpan={4}>
                        <code className="text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                          {info.formula}
                        </code>
                      </td>
                    </tr>
                    {/* Sub-weight explanations */}
                    {info.subWeights.map((sw, i) => (
                      <tr key={`${dim.key}-sw-${i}`} className="bg-gray-50 border-b border-gray-100">
                        <td className="py-1 pl-6 text-gray-500 text-xs leading-relaxed" colSpan={4}>
                          {sw}
                        </td>
                      </tr>
                    ))}
                    {/* Actual sub-scores */}
                    <tr key={`${dim.key}-scores-header`} className="bg-gray-100">
                      <td className="py-1 pl-6 text-xs font-medium text-gray-700" colSpan={3}>
                        This engineer's sub-scores:
                      </td>
                      <td className="py-1" />
                    </tr>
                    {dim.subBreakdowns.map((sub) => (
                      <tr key={`${dim.key}-${sub.label}`} className="bg-gray-50">
                        <td className="py-1 pl-8 text-gray-600 text-xs" colSpan={2}>
                          {sub.label}
                        </td>
                        <td className="py-1 text-right text-xs font-medium text-gray-700">
                          {sub.value.toFixed(1)}
                        </td>
                        <td className="py-1" />
                      </tr>
                    ))}
                  </>
                )}
              </>
            );
          })}
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
