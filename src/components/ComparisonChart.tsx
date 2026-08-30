import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { EngineerRanking, DimensionScores } from '../types';

interface ComparisonChartProps {
  rankings: EngineerRanking[];
  unmasked: boolean;
}

const dimensionLabels: { key: keyof DimensionScores; label: string }[] = [
  { key: 'scopeOfInfluence', label: 'Scope' },
  { key: 'reviewAuthority', label: 'Review Auth.' },
  { key: 'unblockingPower', label: 'Unblocking' },
  { key: 'prSignificance', label: 'PR Significance' },
  { key: 'discussionLeadership', label: 'Discussion' },
];

const engineerColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];

export default function ComparisonChart({ rankings, unmasked }: ComparisonChartProps) {
  const getName = (eng: EngineerRanking) => unmasked ? eng.username : eng.displayName;

  const data = dimensionLabels.map(({ key, label }) => {
    const entry: Record<string, string | number> = { dimension: label };
    for (const eng of rankings) {
      entry[getName(eng)] = eng.dimensions[key];
    }
    return entry;
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Comparison Across All 5 Engineers</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="dimension"
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value) => Number(value).toFixed(1)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {rankings.map((eng, i) => (
            <Bar
              key={eng.rank}
              dataKey={getName(eng)}
              fill={engineerColors[i]}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
