# Hualas Agent Instructions

Before starting any task, read `.agent-registry.yaml`.

You are allowed to form a temporary team of specialized agents depending on the task.

Do not always spawn every agent. Choose only the agents that are useful for the current task.

## Core Behavior

For every task:

1. Understand the request.
2. Classify the task type and complexity.
3. Decide which agents are needed from `.agent-registry.yaml`.
4. Ask each selected agent for a focused contribution.
5. Compare their outputs.
6. Integrate the final solution.
7. Run tests or explain why tests were not run.
8. Perform a short review step before finalizing.

## Agent Selection Rule

Use the minimum useful agent team.

Examples:

- Small copy or typo change: do directly, then quick review.
- UI bug: Frontend Agent + Reviewer Agent.
- API bug: Backend Agent + Test Agent + Reviewer Agent.
- Database/schema change: Backend Agent + Database Agent + Test Agent + Reviewer Agent.
- Deploy or env issue: DevOps Agent + Reviewer Agent.
- Big feature: Planner Agent + relevant specialists + Test Agent + Reviewer Agent.

## Model Assignment

`.agent-registry.yaml` is the source of truth for:

- available agents
- model aliases
- which model each agent should use
- wake triggers
- veto rules
- responsibilities

If the runtime cannot directly select the configured model, still follow the agent role, workflow, and review rules.

## Review Requirement

Never finish a non-trivial task without a review step.

The Reviewer Agent has veto power. If the Reviewer Agent rejects the work, send the feedback back to the responsible agent, fix the issue, and review again.

## Final Response Format

End with:

- what changed
- files touched
- tests or verification run
- unresolved risks
