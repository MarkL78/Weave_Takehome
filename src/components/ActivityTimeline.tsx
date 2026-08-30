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
import type { ActivityWeek } from '../types';

interface ActivityTimelineProps {
  timeline: ActivityWeek[];
}

export default function ActivityTimeline({ timeline }: ActivityTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Weekly Activity</h3>
        <p className="text-sm text-gray-400">No activity data available.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-2">Weekly Activity</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="prsAuthored" name="PRs Authored" fill="#6366f1" radius={[2, 2, 0, 0]} />
          <Bar dataKey="reviewsGiven" name="Reviews Given" fill="#a78bfa" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
