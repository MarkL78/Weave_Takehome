# Plan
Goal: build something that looks at the posthog/posthog repo (last ~90 days) and figures out which engineers actually had the most impact. not lines of code, not commit count.

## How to measure impact
1. **Scope of Influence** (5%) — Are they touching one folder or working across the whole codebase? directory diversity of their file changes in merged PRs
2. **Review Authority** (30%) — How many different people's code do they review? Are they leaving real comments or just hitting approve? Review-to-author ratio matters here too, people who review more than they write are force multipliers
3. **Unblocking Power** (35%) — How fast do they turn around reviews? How many PRs actually get merged after their review? This is the big one. Fast thoughtful reviewers make everyone faster
4. **PR Significance** (20%) — Not LOC. Cross-directory changes (bigger scope = more significant), merge rate (do their PRs actually ship?), what kind of work (bugs vs features vs infra)
5. **Discussion Leadership** (10%) — Issue engagement, commenting on other people's PRs, closing issues. Are they participating in the broader engineering conversation?

Each dimension scores 0-100, weighted to get an overall score.

> **Future work:** Link bug-fix PRs back to the original approved PRs to measure review quality (how often does a reviewer's approval lead to follow-up bug fixes). Dropped for now due to complexity of heuristic matching.

## System Arch
Keeping it simple, no backend:

- A node script (`collect-data.js`) pulls data from github's REST api (octokit or just `gh` cli), saves it as json
- A static react app (vite + typescript) reads the json and renders the dashboard
- Host on github pages

### Data to Collect
From the github api (last 90 days):
- All merged PRs: files changed, reviews, labels
- Issues: who closed them, comments on them
- PR reviews: who reviewed, approval/comment/changes-requested

Note: keeping API calls lean for now — pulling PRs and their reviews, not individual review comments.

saves out to:
- `data/prs.json`, `data/reviews.json`, `data/issues.json`
- `data/summary.json` : the pre-computed scores so the frontend doesn't have to crunch anything

## Dashboard
Single page, two-panel layout:
Left side (~30%) is the ranking: top 5 engineers, clickable. Right side (~70%) shows the detail for whoever is selected: radar chart of their 5 dimensions, their notable PRs/reviews, an activity timeline, and a category score breakdown.
Bottom section has a bar chart comparing all 5 across the dimensions side by side.
Using recharts for the charts, tailwind for styling.

> **Note:** Engineers are anonymized (Engineer 1, Engineer 2, etc.) in the dashboard display. Mapping to real GitHub usernames is kept in the data layer only. Future iteration could add a toggle for real names.

Identity is based on GitHub username — no bot filtering or account validation for now. Since we're only showing top 5, noise from minor/bot accounts is unlikely to surface.

No LLM-generated blurbs — the detail view shows the raw dimension scores and notable contributions.

## Steps
1. scaffold vite + react + ts project
2. write the data collection script — pull PRs, reviews, issues from github, save as json
3. run it (need a github token)
4. build the scoring engine in `scoring.ts` — compute the 5 dimensions per engineer, rank them
5. build out the dashboard components
6. test locally, make sure everything renders
7. deploy to github pages
