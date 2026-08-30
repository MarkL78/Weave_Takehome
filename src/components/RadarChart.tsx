import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { DimensionScores } from '../types';

interface RadarChartProps {
  dimensions: DimensionScores;
}

const dimensionLabels: { key: keyof DimensionScores; label: string }[] = [
  { key: 'scopeOfInfluence', label: 'Scope' },
  { key: 'reviewAuthority', label: 'Review Auth.' },
  { key: 'unblockingPower', label: 'Unblocking' },
  { key: 'prSignificance', label: 'PR Significance' },
  { key: 'discussionLeadership', label: 'Discussion' },
];

export default function RadarChart({ dimensions }: RadarChartProps) {
  const data = dimensionLabels.map(({ key, label }) => ({
    dimension: label,
    score: dimensions[key],
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 11, fill: '#6b7280' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value) => [Number(value).toFixed(1), 'Score']}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
