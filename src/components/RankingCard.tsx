import type { EngineerRanking } from '../types';

interface RankingCardProps {
  engineer: EngineerRanking;
  isSelected: boolean;
  onClick: () => void;
  unmasked: boolean;
}

const rankColors = [
  'bg-yellow-500',
  'bg-gray-400',
  'bg-amber-600',
  'bg-blue-500',
  'bg-emerald-500',
];

export default function RankingCard({ engineer, isSelected, onClick, unmasked }: RankingCardProps) {
  const name = unmasked ? engineer.username : engineer.displayName;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer border ${
        isSelected
          ? 'bg-indigo-50 border-indigo-300 shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
            rankColors[engineer.rank - 1] || 'bg-gray-500'
          }`}
        >
          {engineer.rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">
            {name}
          </div>
          <div className="text-xs text-gray-500">
            Score: {engineer.overallScore.toFixed(1)}
          </div>
        </div>
        <div className="w-20">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${engineer.overallScore}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
