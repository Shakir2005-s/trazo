# Security policy

## Supported versions

Only the latest published release of `@heidenber/trazo` gets security fixes. While trazo is in 0.x, fixes land in a new patch or minor release, not in older lines.

## Reporting a vulnerability

Report it privately through GitHub: open the [Security tab](https://github.com/heidenber/trazo/security) of this repository and choose **Report a vulnerability**. Do not open a public issue, pull request or discussion for it.

Include the trazo version, the input (JSON file or command) that triggers the problem, what happens, and what you expected.

You get an answer within 7 days. trazo is maintained by one person, so a fix may take longer; you will be told the plan and credited in the release notes unless you prefer otherwise.

## What counts

trazo turns JSON into a self-contained HTML file. Relevant reports include:

- input that makes the generated HTML run script or load remote content;
- input that makes the CLI read or write files other than the ones named on the command line;
- a vulnerability in a runtime dependency that trazo actually reaches.

Diagrams that render badly, large inputs that are slow, and warnings about development dependencies are ordinary bugs: open a normal issue.
