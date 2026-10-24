# Issue tracker: GitHub

Issues and specs live in Nick-star/opencrm. Use the gh CLI
from the repository root.

- Create: gh issue create --title "..." --body-file <file>
- Read: gh issue view <number> --json number,title,body,labels,comments
- List: gh issue list --state open
- Label: gh issue edit <number> --add-label "<label>"
- Remove label: gh issue edit <number> --remove-label "<label>"
- Comment: gh issue comment <number> --body-file <file>
- Close: gh issue close <number>

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the referenced issue.

For child issues, use native GitHub sub-issues when supported.
Otherwise add "Part of #<parent>" to the child and link it from the parent.

PRs as a request surface: no.
