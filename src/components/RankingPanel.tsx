import type { EngineerRanking } from '../types';
import RankingCard from './RankingCard';

interface RankingPanelProps {
  rankings: EngineerRanking[];
  selectedRank: number;
  onSelectRank: (rank: number) => void;
  unmasked: boolean;
}

export default function RankingPanel({ rankings, selectedRank, onSelectRank, unmasked }: RankingPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Top 5 Engineers</h2>
      {rankings.map((eng) => (
        <RankingCard
          key={eng.rank}
          engineer={eng}
          isSelected={eng.rank === selectedRank}
          onClick={() => onSelectRank(eng.rank)}
          unmasked={unmasked}
        />
      ))}
    </div>
  );
}
