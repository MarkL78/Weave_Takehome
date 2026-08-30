// Step 2: Fetch files + reviews for top candidate PRs (expensive)
// Input:  public/data/pr-listings.json  (from step 1)
// Output: public/data/prs.json, public/data/reviews.json

import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

const OWNER = 'posthog';
const REPO = 'posthog';
const TOP_CANDIDATE_COUNT = 10;
const DETAIL_CAP = 1000;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function batchFetch(items, fetchFn) {
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(fetchFn));
    results.push(...batchResults);
    if (i + BATCH_SIZE < items.length) {
      await sleep(BATCH_DELAY_MS);
    }
    const progress = Math.min(i + BATCH_SIZE, items.length);
    console.log(`  Progress: ${progress}/${items.length}`);
  }
  return results;
}

async function main() {
  console.log('Step 2: Fetch PR details (files + reviews)\n');

  // Load PR listings from step 1
  const listings = JSON.parse(readFileSync(join(DATA_DIR, 'pr-listings.json'), 'utf-8'));
  const { merged, closedNotMergedCounts } = listings;
  console.log(`Loaded ${merged.length} merged PR listings`);

  // Identify top candidates by PR count
  const authorCounts = {};
  for (const pr of merged) {
    authorCounts[pr.author] = (authorCounts[pr.author] || 0) + 1;
  }
  const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);
  const topAuthors = new Set(sortedAuthors.slice(0, TOP_CANDIDATE_COUNT).map(([a]) => a));

  console.log(`\nTop ${TOP_CANDIDATE_COUNT} candidates:`);
  sortedAuthors.slice(0, TOP_CANDIDATE_COUNT).forEach(([a, c]) => console.log(`  ${a}: ${c} PRs`));

  // Select PRs to fetch details for, hard-capped at DETAIL_CAP total
  const topAuthorPRs = merged.filter(pr => topAuthors.has(pr.author));
  const otherPRs = merged.filter(pr => !topAuthors.has(pr.author));

  // If top-author PRs alone exceed the cap, sample them evenly per author
  let selectedTopPRs = topAuthorPRs;
  if (topAuthorPRs.length > DETAIL_CAP) {
    const perAuthor = Math.floor(DETAIL_CAP / topAuthors.size);
    const byAuthor = {};
    for (const pr of topAuthorPRs) {
      if (!byAuthor[pr.author]) byAuthor[pr.author] = [];
      byAuthor[pr.author].push(pr);
    }
    selectedTopPRs = [];
    for (const prs of Object.values(byAuthor)) {
      selectedTopPRs.push(...prs.slice(0, perAuthor));
    }
    selectedTopPRs = selectedTopPRs.slice(0, DETAIL_CAP);
  }

  const otherCap = Math.max(0, DETAIL_CAP - selectedTopPRs.length);
  const sampledOtherPRs = otherPRs.slice(0, otherCap);
  const detailPRs = [...selectedTopPRs, ...sampledOtherPRs].slice(0, DETAIL_CAP);

  console.log(`\nFetching details for ${detailPRs.length} PRs (${selectedTopPRs.length} top-author + ${sampledOtherPRs.length} others)`);
  console.log(`Hard cap: ${DETAIL_CAP}. Estimated API calls: ~${detailPRs.length * 2} (files + reviews)\n`);

  // Fetch files
  console.log('--- Fetching files ---');
  const prFiles = await batchFetch(detailPRs, async (pr) => {
    try {
      const resp = await octokit.rest.pulls.listFiles({
        owner: OWNER, repo: REPO, pull_number: pr.number, per_page: 100
      });
      return { prNumber: pr.number, files: resp.data };
    } catch (e) {
      console.warn(`  Warning: Failed to fetch files for PR #${pr.number}: ${e.message}`);
      return { prNumber: pr.number, files: [] };
    }
  });

  const filesMap = {};
  for (const { prNumber, files } of prFiles) {
    filesMap[prNumber] = files;
  }

  // Fetch reviews
  console.log('\n--- Fetching reviews ---');
  const reviewResults = await batchFetch(detailPRs, async (pr) => {
    try {
      const resp = await octokit.rest.pulls.listReviews({
        owner: OWNER, repo: REPO, pull_number: pr.number, per_page: 100
      });
      return { prNumber: pr.number, reviews: resp.data };
    } catch (e) {
      console.warn(`  Warning: Failed to fetch reviews for PR #${pr.number}: ${e.message}`);
      return { prNumber: pr.number, reviews: [] };
    }
  });

  // Build PR data
  const prs = detailPRs.map(pr => {
    const files = filesMap[pr.number] || [];
    return {
      number: pr.number,
      title: pr.title,
      url: pr.url,
      author: pr.author,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      labels: pr.labels,
      filesChanged: files.length,
      additions: files.reduce((s, f) => s + f.additions, 0),
      deletions: files.reduce((s, f) => s + f.deletions, 0),
      filePaths: files.map(f => f.filename),
    };
  });

  // Build review data
  const prMap = {};
  for (const pr of prs) {
    prMap[pr.number] = pr;
  }

  const reviews = [];
  for (const { prNumber, reviews: prReviews } of reviewResults) {
    const pr = prMap[prNumber];
    if (!pr) continue;
    for (const review of prReviews) {
      if (!review.user?.login || isBot(review.user)) continue;
      reviews.push({
        prNumber,
        prTitle: pr.title,
        prUrl: pr.url,
        prAuthor: pr.author,
        prCreatedAt: pr.createdAt,
        reviewer: review.user.login,
        state: review.state,
        submittedAt: review.submitted_at,
      });
    }
  }

  // Write output
  writeFileSync(join(DATA_DIR, 'prs.json'), JSON.stringify({ prs, closedNotMergedCounts }, null, 2));
  console.log(`\nWrote prs.json (${prs.length} PRs)`);

  writeFileSync(join(DATA_DIR, 'reviews.json'), JSON.stringify(reviews, null, 2));
  console.log(`Wrote reviews.json (${reviews.length} reviews)`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
