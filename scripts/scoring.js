import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

function loadJSON(filename) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
}

function getTopLevelDir(filePath) {
  const parts = filePath.split('/');
  return parts[0];
}

function getISOWeek(dateStr) {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function normalize(value, maxValue) {
  if (maxValue === 0) return 0;
  return (value / maxValue) * 100;
}

function categorizeLabel(labelName) {
  const lower = labelName.toLowerCase();
  if (lower.includes('bug') || lower.includes('fix')) return 'bug';
  if (lower.includes('feature') || lower.includes('enhancement') || lower.includes('new')) return 'feature';
  if (lower.includes('infra') || lower.includes('ci') || lower.includes('devops') || lower.includes('build') || lower.includes('chore') || lower.includes('tooling')) return 'infra';
  return 'other';
}

function main() {
  console.log('=== Scoring Engine ===\n');

  // Load data
  const { prs, closedNotMergedCounts } = loadJSON('prs.json');
  const reviews = loadJSON('reviews.json');
  const { issues, comments } = loadJSON('issues.json');

  console.log(`Loaded: ${prs.length} PRs, ${reviews.length} reviews, ${issues.length} issues, ${comments.length} comments`);

  // Gather all unique engineers (from PR authors, reviewers, issue closers, commenters)
  const engineerSet = new Set();
  prs.forEach(pr => pr.author && engineerSet.add(pr.author));
  reviews.forEach(r => r.reviewer && engineerSet.add(r.reviewer));
  issues.forEach(i => i.closedBy && engineerSet.add(i.closedBy));
  comments.forEach(c => c.author && engineerSet.add(c.author));

  const engineers = Array.from(engineerSet);
  console.log(`Found ${engineers.length} unique contributors\n`);

  // Pre-compute per-engineer data
  const engineerData = {};
  for (const eng of engineers) {
    engineerData[eng] = {
      // PRs authored
      authoredPRs: prs.filter(pr => pr.author === eng),
      // Reviews given (exclude self-reviews)
      reviewsGiven: reviews.filter(r => r.reviewer === eng && r.prAuthor !== eng),
      // Issues closed
      issuesClosed: issues.filter(i => i.closedBy === eng),
      // Comments on non-PR issues
      issueComments: comments.filter(c => c.author === eng && !c.isPRComment),
      // Comments on others' PRs
      prComments: comments.filter(c => c.author === eng && c.isPRComment),
    };
  }

  // === Dimension 1: Scope of Influence ===
  console.log('Computing Scope of Influence...');
  const scopeRaw = {};
  for (const eng of engineers) {
    const dirs = new Set();
    for (const pr of engineerData[eng].authoredPRs) {
      for (const path of pr.filePaths || []) {
        dirs.add(getTopLevelDir(path));
      }
    }
    scopeRaw[eng] = dirs.size;
  }
  const maxScope = Math.max(...Object.values(scopeRaw), 1);

  // === Dimension 2: Review Authority ===
  console.log('Computing Review Authority...');
  const reviewAuthorityRaw = {};
  for (const eng of engineers) {
    const revs = engineerData[eng].reviewsGiven;

    // Breadth: distinct PR authors reviewed
    const authorsReviewed = new Set(revs.map(r => r.prAuthor));
    const breadth = authorsReviewed.size;

    // Substance: ratio of PRs where reviewer left COMMENTED/CHANGES_REQUESTED vs only APPROVED
    const prReviewStates = {};
    for (const r of revs) {
      if (!prReviewStates[r.prNumber]) prReviewStates[r.prNumber] = new Set();
      prReviewStates[r.prNumber].add(r.state);
    }
    const totalReviewedPRs = Object.keys(prReviewStates).length;
    let substantiveCount = 0;
    for (const states of Object.values(prReviewStates)) {
      if (states.has('COMMENTED') || states.has('CHANGES_REQUESTED')) {
        substantiveCount++;
      }
    }
    const substance = totalReviewedPRs > 0 ? (substantiveCount / totalReviewedPRs) : 0;

    // Review-to-Author ratio
    const authorCount = engineerData[eng].authoredPRs.length;
    const reviewCount = totalReviewedPRs;
    const ratio = authorCount > 0 ? reviewCount / authorCount : reviewCount > 0 ? 10 : 0;
    const ratioScore = Math.min(100, (ratio / 2.0) * 100);

    reviewAuthorityRaw[eng] = { breadth, substance, ratioScore, reviewCount };
  }
  const maxBreadth = Math.max(...Object.values(reviewAuthorityRaw).map(r => r.breadth), 1);

  // === Dimension 3: Unblocking Power ===
  console.log('Computing Unblocking Power...');
  const unblockRaw = {};
  for (const eng of engineers) {
    const revs = engineerData[eng].reviewsGiven;

    // Turnaround: median hours from PR creation to first review by this engineer
    const firstReviewPerPR = {};
    for (const r of revs) {
      if (!r.submittedAt || !r.prCreatedAt) continue;
      const hours = (new Date(r.submittedAt) - new Date(r.prCreatedAt)) / (1000 * 60 * 60);
      if (hours < 0) continue; // Skip invalid
      if (!(r.prNumber in firstReviewPerPR) || hours < firstReviewPerPR[r.prNumber]) {
        firstReviewPerPR[r.prNumber] = hours;
      }
    }
    const turnarounds = Object.values(firstReviewPerPR);
    turnarounds.sort((a, b) => a - b);
    const medianTurnaround = turnarounds.length > 0
      ? turnarounds[Math.floor(turnarounds.length / 2)]
      : Infinity;

    // Unblock count: distinct merged PRs reviewed
    const mergedPRNumbers = new Set(prs.map(pr => pr.number));
    const reviewedMergedPRs = new Set(
      revs.filter(r => mergedPRNumbers.has(r.prNumber)).map(r => r.prNumber)
    );

    unblockRaw[eng] = {
      medianTurnaround,
      unblockCount: reviewedMergedPRs.size,
    };
  }
  const validTurnarounds = Object.values(unblockRaw)
    .map(u => u.medianTurnaround)
    .filter(t => t !== Infinity);
  const maxTurnaround = Math.max(...validTurnarounds, 1);
  const minTurnaround = Math.min(...validTurnarounds, 0);
  const maxUnblockCount = Math.max(...Object.values(unblockRaw).map(u => u.unblockCount), 1);

  // === Dimension 4: PR Significance ===
  console.log('Computing PR Significance...');
  const prSigRaw = {};
  for (const eng of engineers) {
    const authored = engineerData[eng].authoredPRs;

    // Cross-directory scope: avg distinct top-level dirs per authored PR
    let totalDirsPerPR = 0;
    for (const pr of authored) {
      const dirs = new Set((pr.filePaths || []).map(getTopLevelDir));
      totalDirsPerPR += dirs.size;
    }
    const avgDirsPerPR = authored.length > 0 ? totalDirsPerPR / authored.length : 0;

    // Merge rate
    const mergedCount = authored.length;
    const closedNotMergedCount = closedNotMergedCounts[eng] || 0;
    const total = mergedCount + closedNotMergedCount;
    const mergeRate = total > 0 ? (mergedCount / total) * 100 : 0;

    // Work type diversity
    const labelCategories = new Set();
    for (const pr of authored) {
      for (const label of pr.labels || []) {
        labelCategories.add(categorizeLabel(label));
      }
    }
    const diversity = (labelCategories.size / 4) * 100;

    prSigRaw[eng] = { avgDirsPerPR, mergeRate, diversity };
  }
  const maxAvgDirs = Math.max(...Object.values(prSigRaw).map(p => p.avgDirsPerPR), 1);

  // === Dimension 5: Discussion Leadership ===
  console.log('Computing Discussion Leadership...');
  const discussionRaw = {};
  for (const eng of engineers) {
    discussionRaw[eng] = {
      issueCommentCount: engineerData[eng].issueComments.length,
      prCommentCount: engineerData[eng].prComments.length,
      issuesClosedCount: engineerData[eng].issuesClosed.length,
    };
  }
  const maxIssueComments = Math.max(...Object.values(discussionRaw).map(d => d.issueCommentCount), 1);
  const maxPRComments = Math.max(...Object.values(discussionRaw).map(d => d.prCommentCount), 1);
  const maxIssuesClosed = Math.max(...Object.values(discussionRaw).map(d => d.issuesClosedCount), 1);

  // === Compute final scores ===
  console.log('\nComputing final scores...');
  const scores = [];

  for (const eng of engineers) {
    // Dimension 1: Scope of Influence
    const scopeScore = normalize(scopeRaw[eng], maxScope);

    // Dimension 2: Review Authority
    const ra = reviewAuthorityRaw[eng];
    const breadthScore = normalize(ra.breadth, maxBreadth);
    const substanceScore = ra.substance * 100;
    const reviewAuthScore = 0.4 * breadthScore + 0.3 * substanceScore + 0.3 * ra.ratioScore;

    // Dimension 3: Unblocking Power
    const ub = unblockRaw[eng];
    let turnaroundScore = 0;
    if (ub.medianTurnaround !== Infinity && maxTurnaround > minTurnaround) {
      // Inverse linear: fastest = 100, slowest = 0
      turnaroundScore = ((maxTurnaround - ub.medianTurnaround) / (maxTurnaround - minTurnaround)) * 100;
    }
    const unblockCountScore = normalize(ub.unblockCount, maxUnblockCount);
    const unblockScore = 0.5 * turnaroundScore + 0.5 * unblockCountScore;

    // Dimension 4: PR Significance
    const ps = prSigRaw[eng];
    const crossDirScore = normalize(ps.avgDirsPerPR, maxAvgDirs);
    const prSigScore = 0.4 * crossDirScore + 0.2 * ps.mergeRate + 0.4 * ps.diversity;

    // Dimension 5: Discussion Leadership
    const dl = discussionRaw[eng];
    const issueCommentScore = normalize(dl.issueCommentCount, maxIssueComments);
    const prDiscussionScore = normalize(dl.prCommentCount, maxPRComments);
    const issuesClosedScore = normalize(dl.issuesClosedCount, maxIssuesClosed);
    const discussionScore = 0.4 * issueCommentScore + 0.3 * prDiscussionScore + 0.3 * issuesClosedScore;

    // Overall weighted score
    const overall =
      0.05 * scopeScore +
      0.30 * reviewAuthScore +
      0.35 * unblockScore +
      0.20 * prSigScore +
      0.10 * discussionScore;

    scores.push({
      username: eng,
      overallScore: Math.round(overall * 100) / 100,
      dimensions: {
        scopeOfInfluence: Math.round(scopeScore * 100) / 100,
        reviewAuthority: Math.round(reviewAuthScore * 100) / 100,
        unblockingPower: Math.round(unblockScore * 100) / 100,
        prSignificance: Math.round(prSigScore * 100) / 100,
        discussionLeadership: Math.round(discussionScore * 100) / 100,
      },
      dimensionDetails: [
        {
          name: 'Scope of Influence',
          key: 'scopeOfInfluence',
          weight: 0.05,
          score: Math.round(scopeScore * 100) / 100,
          weighted: Math.round(0.05 * scopeScore * 100) / 100,
          subBreakdowns: [
            { label: 'Top-level directories touched', value: scopeRaw[eng] },
          ],
        },
        {
          name: 'Review Authority',
          key: 'reviewAuthority',
          weight: 0.30,
          score: Math.round(reviewAuthScore * 100) / 100,
          weighted: Math.round(0.30 * reviewAuthScore * 100) / 100,
          subBreakdowns: [
            { label: 'Breadth (distinct authors reviewed)', value: Math.round(breadthScore * 100) / 100 },
            { label: 'Substance (substantive review ratio)', value: Math.round(substanceScore * 100) / 100 },
            { label: 'Review-to-Author ratio', value: Math.round(ra.ratioScore * 100) / 100 },
          ],
        },
        {
          name: 'Unblocking Power',
          key: 'unblockingPower',
          weight: 0.35,
          score: Math.round(unblockScore * 100) / 100,
          weighted: Math.round(0.35 * unblockScore * 100) / 100,
          subBreakdowns: [
            { label: 'Review turnaround (inverse, faster=better)', value: Math.round(turnaroundScore * 100) / 100 },
            { label: 'Merged PRs reviewed', value: Math.round(unblockCountScore * 100) / 100 },
          ],
        },
        {
          name: 'PR Significance',
          key: 'prSignificance',
          weight: 0.20,
          score: Math.round(prSigScore * 100) / 100,
          weighted: Math.round(0.20 * prSigScore * 100) / 100,
          subBreakdowns: [
            { label: 'Cross-directory scope', value: Math.round(crossDirScore * 100) / 100 },
            { label: 'Merge rate', value: Math.round(ps.mergeRate * 100) / 100 },
            { label: 'Work type diversity', value: Math.round(ps.diversity * 100) / 100 },
          ],
        },
        {
          name: 'Discussion Leadership',
          key: 'discussionLeadership',
          weight: 0.10,
          score: Math.round(discussionScore * 100) / 100,
          weighted: Math.round(0.10 * discussionScore * 100) / 100,
          subBreakdowns: [
            { label: 'Issue comments', value: Math.round(issueCommentScore * 100) / 100 },
            { label: 'PR discussion', value: Math.round(prDiscussionScore * 100) / 100 },
            { label: 'Issues closed', value: Math.round(issuesClosedScore * 100) / 100 },
          ],
        },
      ],
      // Store raw data for notable PR/review selection
      _authored: engineerData[eng].authoredPRs,
      _reviews: engineerData[eng].reviewsGiven,
    });
  }

  // Sort by overall score descending, take top 5
  scores.sort((a, b) => b.overallScore - a.overallScore);
  const top5 = scores.slice(0, 5);

  console.log('\nTop 5 Engineers:');
  top5.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.username} — ${s.overallScore}`);
  });

  // Build final rankings with notable PRs, reviews, and activity timeline
  const rankings = top5.map((s, idx) => {
    // Notable PRs: by dir spread * file count
    const notablePRs = s._authored
      .map(pr => {
        const dirs = new Set((pr.filePaths || []).map(getTopLevelDir));
        return {
          number: pr.number,
          title: pr.title,
          url: pr.url,
          filesChanged: pr.filesChanged,
          dirsSpread: dirs.size,
          additions: pr.additions,
          deletions: pr.deletions,
          _score: dirs.size * pr.filesChanged,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score, ...rest }) => rest);

    // Notable reviews: fastest turnaround
    const reviewsByTurnaround = [];
    const seenPRs = new Set();
    for (const r of s._reviews) {
      if (!r.submittedAt || !r.prCreatedAt) continue;
      const hours = (new Date(r.submittedAt) - new Date(r.prCreatedAt)) / (1000 * 60 * 60);
      if (hours < 0 || seenPRs.has(r.prNumber)) continue;
      seenPRs.add(r.prNumber);
      reviewsByTurnaround.push({
        prNumber: r.prNumber,
        prTitle: r.prTitle,
        prUrl: r.prUrl,
        turnaroundHours: Math.round(hours * 100) / 100,
        state: r.state,
      });
    }
    reviewsByTurnaround.sort((a, b) => a.turnaroundHours - b.turnaroundHours);
    const notableReviews = reviewsByTurnaround.slice(0, 5);

    // Activity timeline: weekly counts
    const weeklyActivity = {};
    for (const pr of s._authored) {
      const week = getISOWeek(pr.mergedAt || pr.createdAt);
      if (!weeklyActivity[week]) weeklyActivity[week] = { prsAuthored: 0, reviewsGiven: 0 };
      weeklyActivity[week].prsAuthored++;
    }
    for (const r of s._reviews) {
      if (!r.submittedAt) continue;
      const week = getISOWeek(r.submittedAt);
      if (!weeklyActivity[week]) weeklyActivity[week] = { prsAuthored: 0, reviewsGiven: 0 };
      weeklyActivity[week].reviewsGiven++;
    }

    const activityTimeline = Object.entries(weeklyActivity)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return {
      rank: idx + 1,
      username: s.username,
      displayName: `Engineer ${idx + 1}`,
      overallScore: s.overallScore,
      dimensions: s.dimensions,
      dimensionDetails: s.dimensionDetails,
      notablePRs,
      notableReviews,
      activityTimeline,
    };
  });

  // Build summary
  const summary = {
    metadata: {
      repo: 'posthog/posthog',
      windowDays: 90,
      generatedAt: new Date().toISOString(),
      totalPRsAnalyzed: prs.length,
      totalReviewsAnalyzed: reviews.length,
      totalIssuesAnalyzed: issues.length,
      totalEngineersScored: engineers.length,
    },
    rankings,
  };

  writeFileSync(join(DATA_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\nsummary.json written successfully!');
}

main();
