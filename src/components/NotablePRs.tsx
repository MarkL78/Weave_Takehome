import type { NotablePR } from '../types';

interface NotablePRsProps {
  prs: NotablePR[];
}

export default function NotablePRs({ prs }: NotablePRsProps) {
  if (prs.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Notable PRs</h3>
        <p className="text-sm text-gray-400">No PRs authored in this period.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-2">Notable PRs Authored</h3>
      <ul className="space-y-2">
        {prs.map((pr) => (
          <li key={pr.number} className="border border-gray-200 rounded p-2">
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              #{pr.number}: {pr.title}
            </a>
            <div className="flex gap-3 mt-1 text-xs text-gray-500">
              <span>{pr.filesChanged} files</span>
              <span>{pr.dirsSpread} dirs</span>
              <span className="text-green-600">+{pr.additions}</span>
              <span className="text-red-600">-{pr.deletions}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
