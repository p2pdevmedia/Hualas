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
5. Ask each selected agent for a focused contribution. If no extra agent is useful, explicitly keep the task local.
6. Compare selected outputs when present.
7. Integrate the final solution.
8. Update the agent-facing documentation for any new or changed functionality.
9. Run tests and final checks, including Prettier and a production build attempt.
10. Perform a short review step before finalizing.

## Documentation Sync Rule

Every new feature, route, API endpoint, role flow, data model, mobile capability, environment variable, or important behavior change must update the relevant agent-facing docs in the same task.

At minimum, check whether these files need changes:

- `PROJECT_CONTEXT.md`: product scope, stack, roles, data models, access rules, payment rules, development rules, or important commands.
- `ROUTE_MAP.md`: frontend routes, API routes, guards, shared files, native app entrypoints, or feature ownership paths.
- `.agent-registry.yaml`: agent list or wake rules when a new recurring specialty area appears.
- Platform docs such as `iphone/README.md`, `android/README.md`, or `android/API_CONTRACT.md` when native app behavior changes.
- `README.md` when setup, commands, deployment, environment variables, or cross-platform workflow changes.

Do not make future agents rediscover completed work by scanning the whole app. If functionality exists, the map/context files should say where it lives and how to approach it.

## Final Verification Rule

Before finishing any task, run the relevant tests and checks. At minimum, run:

```bash
pnpm format:check
pnpm build
```

If a task is purely documentation or the environment blocks a command, still try the checks when practical. If `pnpm format:check` reports pre-existing formatting issues outside the task scope, make sure every file you touched passes Prettier and report the remaining unrelated files or count. If a check cannot run or fails because of missing secrets, unavailable services, signing credentials, or other environment constraints, report the exact command and reason in the final response. Do not silently skip Prettier or the production build attempt.

## iPhone App Rule

- When a task mentions the iPhone app, always assume it refers to the native code under `iphone/HualasMobile`.
- Use `iphone/README.md` for iPhone-specific setup and workflow details.
- Do not treat iPhone work as part of the Next.js web app unless the user explicitly says otherwise.

## Android App Rule

- When a task mentions the Android app, use the native code under `android`.
- Use `android/README.md` for Android setup and workflow details.
- Use `android/API_CONTRACT.md` for the Android-facing mobile backend contract.
- Do not treat Android work as part of the Next.js web app unless the user explicitly says otherwise.

## Mobile Backend Rule

- Native iPhone and Android clients use `/api/mobile/*` routes with bearer-token auth.
- Do not call NextAuth cookie routes from native app code.
- If mobile behavior changes, keep `ROUTE_MAP.md` and the relevant mobile README/API contract in sync.

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
