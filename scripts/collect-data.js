// Step 1: Fetch PR listings (cheap — just pagination, no per-PR calls)
// Output: public/data/pr-listings.json
// Re-run only if you need fresh PR data.

import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

const OWNER = 'posthog';
const REPO = 'posthog';
const WINDOW_DAYS = 90;
const CUTOFF = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

function isBot(user) {
  if (!user) return true;
  if (user.type === 'Bot') return true;
  const login = (user.login || '').toLowerCase();
  if (login.endsWith('[bot]')) return true;
  if (login.includes('-bot') || login.includes('bot-')) return true;
  const knownBots = [
    'dependabot', 'renovate', 'github-actions',
    'codecov', 'netlify', 'vercel', 'stale',
    'posthog-bot', 'posthog-contributions-bot',
    'trunk-io',
  ];
  return knownBots.some(b => login.includes(b));
}

if (!process.env.GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required.');
  process.exit(1);
}

const ThrottledOctokit = Octokit.plugin(throttling, retry);
const octokit = new ThrottledOctokit({
  auth: process.env.GITHUB_TOKEN,
  throttle: {
    onRateLimit: (retryAfter, options, octokit, retryCount) => {
      octokit.log.warn(`Rate limit hit for ${options.method} ${options.url}`);
      if (retryCount < 3) {
        octokit.log.info(`Retrying after ${retryAfter} seconds`);
        return true;
      }
    },
    onSecondaryRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(`Secondary rate limit for ${options.method} ${options.url}`);
      return true;
    },
  },
});

async function main() {
  console.log(`Step 1: Fetch PR listings`);
  console.log(`Repo: ${OWNER}/${REPO}, Window: ${WINDOW_DAYS} days (since ${CUTOFF.toISOString().split('T')[0]})`);
  mkdirSync(DATA_DIR, { recursive: true });

  const merged = [];
  const closedNotMergedCounts = {};
  let page = 1;
  let skippedBots = 0;
  let skippedNotMerged = 0;

  while (true) {
    console.log(`  Page ${page} (merged: ${merged.length}, bots skipped: ${skippedBots})...`);
    const response = await octokit.rest.pulls.list({
      owner: OWNER, repo: REPO,
      state: 'closed', sort: 'created', direction: 'desc',
      per_page: 100, page,
    });

    const items = response.data;
    if (items.length === 0) break;

    let pastCutoff = false;
    for (const pr of items) {
      if (new Date(pr.created_at) < CUTOFF) {
        pastCutoff = true;
        break;
      }
      if (isBot(pr.user)) {
        skippedBots++;
        continue;
      }
      if (pr.merged_at && new Date(pr.merged_at) >= CUTOFF) {
        merged.push({
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          author: pr.user?.login,
          createdAt: pr.created_at,
          mergedAt: pr.merged_at,
          labels: (pr.labels || []).map(l => typeof l === 'string' ? l : l.name),
        });
      } else if (!pr.merged_at) {
        skippedNotMerged++;
        const author = pr.user?.login;
        if (author) {
          closedNotMergedCounts[author] = (closedNotMergedCounts[author] || 0) + 1;
        }
      }
    }

    if (pastCutoff || items.length < 100) break;
    page++;
  }

  console.log(`\nDone: ${merged.length} merged human PRs, ${skippedBots} bot PRs, ${skippedNotMerged} closed-not-merged`);

  // Show top authors
  const authorCounts = {};
  for (const pr of merged) {
    authorCounts[pr.author] = (authorCounts[pr.author] || 0) + 1;
  }
  const sorted = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);
  console.log(`\n${sorted.length} unique human authors. Top 20:`);
  sorted.slice(0, 20).forEach(([a, c]) => console.log(`  ${a}: ${c} PRs`));

  writeFileSync(
    join(DATA_DIR, 'pr-listings.json'),
    JSON.stringify({ merged, closedNotMergedCounts, windowDays: WINDOW_DAYS }, null, 2)
  );
  console.log(`\nWrote pr-listings.json (${merged.length} PRs)`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
