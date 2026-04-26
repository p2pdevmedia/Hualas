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

## Review Requirement

Never finish a non-trivial task without a review step.

## Final Response Format

- what changed
- files touched
- tests or verification run
- unresolved risks
