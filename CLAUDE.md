# Hualas Claude Instructions

Before starting any task, read `.agent-registry.yaml`.

Use a dynamic multi-agent workflow.

Do not use all agents by default. Select only the agents needed for the task.

## Workflow

1. Understand the task.
2. Select agents based on triggers in `.agent-registry.yaml`.
3. Delegate focused work.
4. Integrate results.
5. Run tests or verify behavior.
6. Perform review before finalizing.

## Rules

- Prefer minimal agent usage.
- Always review non-trivial changes.
- Never claim work is complete without validation.
- If something cannot be tested, explicitly state the risk.

## Model Handling

Follow model assignments from `.agent-registry.yaml`.

If the environment cannot switch models, still respect agent roles and responsibilities.
