import type { EngineerRanking } from '../types';
import RadarChart from './RadarChart';
import ScoreBreakdown from './ScoreBreakdown';
import NotablePRs from './NotablePRs';
import NotableReviews from './NotableReviews';
import ActivityTimeline from './ActivityTimeline';

interface DetailPanelProps {
  engineer: EngineerRanking;
  unmasked: boolean;
}

export default function DetailPanel({ engineer, unmasked }: DetailPanelProps) {
  const name = unmasked ? engineer.username : engineer.displayName;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold text-indigo-600">
          #{engineer.rank}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {name}
          </h2>
          {unmasked && (
            <p className="text-xs text-gray-400">@{engineer.username}</p>
          )}
          <p className="text-sm text-gray-500">
            Overall Score: <span className="font-semibold text-gray-800">{engineer.overallScore.toFixed(1)}</span> / 100
          </p>
        </div>
      </div>

      {/* Radar + Breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Dimension Profile</h3>
          <RadarChart dimensions={engineer.dimensions} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <ScoreBreakdown details={engineer.dimensionDetails} />
        </div>
      </div>

      {/* Activity timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ActivityTimeline timeline={engineer.activityTimeline} />
      </div>

      {/* Notable PRs + Reviews side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <NotablePRs prs={engineer.notablePRs} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <NotableReviews reviews={engineer.notableReviews} />
        </div>
      </div>
    </div>
  );
}
