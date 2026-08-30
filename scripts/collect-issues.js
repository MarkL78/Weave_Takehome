// Step 3: Fetch issues and comments (cheap — just pagination)
// Output: public/data/issues.json

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
const MAX_PAGES = 50;

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

async function fetchAllPages(method, params) {
  const results = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    console.log(`  Fetching page ${page}...`);
    const response = await method({ ...params, per_page: 100, page });
    const items = response.data;
    if (items.length === 0) break;

    let pastCutoff = false;
    for (const item of items) {
      const dateValue = new Date(item.updated_at);
      if (dateValue < CUTOFF) {
        pastCutoff = true;
        break;
      }
      results.push(item);
    }

    if (pastCutoff || items.length < 100) break;
    page++;
  }

  return results;
}

async function main() {
  console.log(`Step 3: Fetch issues and comments`);
  console.log(`Repo: ${OWNER}/${REPO}, Window: ${WINDOW_DAYS} days (since ${CUTOFF.toISOString().split('T')[0]})`);
  mkdirSync(DATA_DIR, { recursive: true });

  // Fetch closed issues
  console.log('\n=== Fetching closed issues ===');
  const allIssues = await fetchAllPages(
    octokit.rest.issues.listForRepo.bind(octokit.rest.issues),
    { owner: OWNER, repo: REPO, state: 'closed', sort: 'updated', direction: 'desc', since: CUTOFF.toISOString() }
  );

  const issues = allIssues.filter(i => !i.pull_request);
  console.log(`  Found ${issues.length} closed issues (filtered ${allIssues.length - issues.length} PRs)`);

  const issueData = issues.map(issue => ({
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    author: issue.user?.login,
    closedBy: issue.closed_by?.login || issue.user?.login,
    closedAt: issue.closed_at,
    labels: (issue.labels || []).map(l => typeof l === 'string' ? l : l.name),
  }));

  // Fetch comments
  console.log('\n=== Fetching issue comments ===');
  const allComments = await fetchAllPages(
    octokit.rest.issues.listCommentsForRepo.bind(octokit.rest.issues),
    { owner: OWNER, repo: REPO, sort: 'updated', direction: 'desc', since: CUTOFF.toISOString() }
  );

  console.log(`  Found ${allComments.length} total comments`);

  const humanComments = allComments.filter(c => !isBot(c.user));
  console.log(`  Filtered to ${humanComments.length} human comments`);

  const comments = humanComments.map(c => {
    const match = (c.issue_url || '').match(/\/issues\/(\d+)$/);
    const issueNumber = match ? parseInt(match[1], 10) : null;
    const isPRComment = issueNumber ? allIssues.some(i => i.number === issueNumber && i.pull_request) : false;

    return {
      id: c.id,
      issueNumber,
      isPRComment,
      author: c.user?.login,
      createdAt: c.created_at,
    };
  });

  writeFileSync(join(DATA_DIR, 'issues.json'), JSON.stringify({ issues: issueData, comments }, null, 2));
  console.log(`\nWrote issues.json (${issueData.length} issues, ${comments.length} comments)`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
