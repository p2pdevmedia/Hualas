# Hualas Claude Instructions

Before starting any task, read:

1. PROJECT_CONTEXT.md
2. ROUTE_MAP.md
3. .agent-registry.yaml

Use a dynamic multi-agent workflow.

Do not use all agents by default.

## Workflow

1. Understand the task.
2. Identify relevant routes using ROUTE_MAP.md.
3. Select agents.
4. Delegate focused work only when a selected agent is useful; otherwise keep the task local.
5. Integrate results.
6. Update agent-facing docs for new or changed functionality.
7. Verify behavior.
8. Review before finalizing.

## Rules

- Prefer minimal agent usage.
- Always review non-trivial changes.
- Never claim completion without verification.
- Every new feature, route, API endpoint, data model, role flow, mobile capability, env var, or important behavior change must update the relevant docs in the same task.
- Check `PROJECT_CONTEXT.md`, `ROUTE_MAP.md`, `.agent-registry.yaml`, platform READMEs/contracts, and `README.md` so future agents can understand what exists without scanning the whole app.
- iPhone work lives under `iphone/HualasMobile` and should follow `iphone/README.md`.
- Android work lives under `android` and should follow `android/README.md` plus `android/API_CONTRACT.md`.
- Native apps use `/api/mobile/*` with bearer-token auth, not NextAuth cookie routes.
