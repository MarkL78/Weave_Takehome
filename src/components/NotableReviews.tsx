import type { NotableReview } from '../types';

interface NotableReviewsProps {
  reviews: NotableReview[];
}

const stateColors: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-700',
  COMMENTED: 'bg-blue-100 text-blue-700',
  DISMISSED: 'bg-gray-100 text-gray-600',
};

export default function NotableReviews({ reviews }: NotableReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Notable Reviews</h3>
        <p className="text-sm text-gray-400">No reviews given in this period.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-2">Fastest Reviews Given</h3>
      <ul className="space-y-2">
        {reviews.map((review) => (
          <li key={review.prNumber} className="border border-gray-200 rounded p-2">
            <a
              href={review.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              #{review.prNumber}: {review.prTitle}
            </a>
            <div className="flex gap-3 mt-1 text-xs items-center">
              <span className="text-gray-500">
                {review.turnaroundHours < 1
                  ? `${Math.round(review.turnaroundHours * 60)}m`
                  : `${review.turnaroundHours.toFixed(1)}h`}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  stateColors[review.state] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {review.state}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
