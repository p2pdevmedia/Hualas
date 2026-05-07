# Hualas Agent Instructions

Before starting any task, read:

1. PROJECT_CONTEXT.md
2. ROUTE_MAP.md
3. .agent-registry.yaml

You are allowed to form a temporary team of specialized agents depending on the task.

Do not always spawn every agent. Choose only the agents that are useful for the current task.

## Core Behavior

For every task:

1. Understand the request.
2. Classify the task type and complexity.
3. Locate relevant routes using ROUTE_MAP.md.
4. Decide which agents are needed.
5. Ask each selected agent for a focused contribution.
6. Compare their outputs.
7. Integrate the final solution.
8. Run tests or explain why tests were not run.
9. Perform a short review step before finalizing.

## iPhone App Rule

- When a task mentions the iPhone app, always assume it refers to the native code under `iphone/HualasMobile`.
- Use `iphone/README.md` for iPhone-specific setup and workflow details.
- Do not treat iPhone work as part of the Next.js web app unless the user explicitly says otherwise.

## Xcode Build Note

- This workspace has `Xcode.app` installed at `/Applications/Xcode.app`.
- For terminal verification of `iphone/HualasMobile`, prefer `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild ...` if `xcode-select` still points to Command Line Tools.
- Do not assume a global `xcode-select` change is available; it may require `sudo` and is not necessary for local build checks.
- A TestFlight-ready or device-installable archive also needs a valid Apple Development certificate and provisioning profiles on the Mac.
- If `xcodebuild archive` fails with "requires a development team", do not guess a team ID; ask for signing credentials or have the user select the team in Xcode.

## Review Requirement

Never finish a non-trivial task without a review step.

## Final Response Format

- what changed
- files touched
- tests or verification run
- unresolved risks
