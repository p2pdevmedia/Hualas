import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const scriptPath = path.join(process.cwd(), 'scripts/validate-agent-gate.mjs');

function writeFixture(root: string, artifact: Record<string, unknown>) {
  writeFileSync(
    path.join(root, 'AGENTS.md'),
    [
      '# Hualas Agent Instructions',
      '## Mandatory Agent Gate',
      'planner implementer security club-context',
      'agent gate outcome',
    ].join('\n')
  );
  writeFileSync(
    path.join(root, 'CLAUDE.md'),
    'Follow the Mandatory Agent Gate in AGENTS.md.'
  );
  writeFileSync(
    path.join(root, 'PROJECT_CONTEXT.md'),
    'Development Rules require the agent gate and pnpm agent:check.'
  );
  writeFileSync(
    path.join(root, 'README.md'),
    'Agent-Facing Docs use AGENTS.md and pnpm agent:check.'
  );
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(
      {
        scripts: {
          'agent:check': 'node scripts/validate-agent-gate.mjs',
          build:
            'pnpm agent:check && node scripts/copy-pdf-worker.mjs && prisma generate && next build',
          'format:check': 'pnpm agent:check && prettier --check .',
        },
        devDependencies: {
          yaml: '^2.8.1',
        },
      },
      null,
      2
    )
  );
  writeFileSync(
    path.join(root, '.agent-registry.yaml'),
    [
      'gate:',
      '  required: true',
      '  checklistRequired: true',
      '  taskArtifactRequired: true',
      '  finalEvidenceRequired: true',
      '  localAllowedWhenNoTriggeredAgent: true',
      '  coreAgents: [planner, implementer, security, club-context]',
      '  alwaysRunAgents: [planner, club-context]',
      '  conditionalAgents: [implementer, security]',
      'agents:',
      '  planner:',
      '    model: cheap',
      '    wakeWhen: [all tasks]',
      '  implementer:',
      '    model: coder',
      '    wakeWhen: [code, docs, config]',
      '  security:',
      '    model: strong',
      '    wakeWhen: [auth, permissions, roles, csrf, origin, jwt, secrets, privacy, pii, children, personal data, payments, uploads, private files, webhooks, audit log, mobile tokens]',
      '    canVeto: true',
      '  club-context:',
      '    model: strong',
      '    wakeWhen: [all tasks, route map, product context]',
      '    talksTo: [planner, implementer, security]',
    ].join('\n')
  );
  writeFileSync(
    path.join(root, 'agent-run.json'),
    JSON.stringify(artifact, null, 2)
  );
}

function runValidator(root: string) {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      '--root',
      root,
      '--artifact',
      path.join(root, 'agent-run.json'),
    ],
    { encoding: 'utf8' }
  );
}

describe('validate-agent-gate', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'hualas-agent-gate-'));
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  it('accepts a complete mandatory agent gate config and task artifact', () => {
    writeFixture(root, {
      task: 'Implement the automatic agent gate',
      classification: 'agent workflow tooling',
      agents: {
        planner: 'planned validation contract',
        implementer: 'implemented script and docs',
        security: 'reviewed privacy and secret handling',
        'club-context': 'checked Hualas docs and route map impact',
      },
      clubContext: 'No route changes; route map does not need edits.',
      securityPrivacy: 'No secrets or private member data are stored.',
      docsSync:
        'AGENTS, CLAUDE, PROJECT_CONTEXT, README, and registry updated.',
      verification: ['pnpm agent:check'],
      review: 'Self-review complete.',
      risks: [],
    });

    const result = runValidator(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Agent gate validation passed');
  });

  it('rejects a task artifact missing a required field', () => {
    writeFixture(root, {
      task: 'Implement the automatic agent gate',
      classification: 'agent workflow tooling',
      agents: {
        planner: 'planned validation contract',
        implementer: 'implemented script and docs',
        security: 'reviewed privacy and secret handling',
        'club-context': 'checked Hualas docs and route map impact',
      },
      clubContext: 'No route changes; route map does not need edits.',
      securityPrivacy: 'No secrets or private member data are stored.',
      docsSync:
        'AGENTS, CLAUDE, PROJECT_CONTEXT, README, and registry updated.',
      verification: ['pnpm agent:check'],
      review: 'Self-review complete.',
    });

    const result = runValidator(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Task artifact is missing required field: risks'
    );
  });

  it('allows conditional agents to be omitted from narrow local-only artifacts', () => {
    writeFixture(root, {
      task: 'Inspect project docs',
      classification: 'read-only documentation inspection',
      agents: {
        planner: 'classified task and confirmed no implementation needed',
        'club-context': 'checked Hualas docs and route map impact',
      },
      clubContext: 'No route changes; route map does not need edits.',
      securityPrivacy: {
        securityAgentRequired: false,
        notes: 'No security-sensitive files or behavior changed.',
      },
      docsSync: 'No docs changes needed for this read-only inspection.',
      verification: ['pnpm agent:check'],
      review: 'Self-review complete.',
      risks: [],
    });

    const result = runValidator(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Agent gate validation passed');
  });

  it('rejects artifacts with JSON-shaped token or secret values', () => {
    writeFixture(root, {
      task: 'Implement the automatic agent gate',
      classification: 'agent workflow tooling',
      agents: {
        planner: 'planned validation contract',
        implementer: 'implemented script and docs',
        security: 'reviewed privacy and secret handling',
        'club-context': 'checked Hualas docs and route map impact',
      },
      clubContext: 'No route changes; route map does not need edits.',
      securityPrivacy: {
        securityAgentRequired: true,
        token: 'abc123',
      },
      docsSync:
        'AGENTS, CLAUDE, PROJECT_CONTEXT, README, and registry updated.',
      verification: ['pnpm agent:check'],
      review: 'Self-review complete.',
      risks: [],
    });

    const result = runValidator(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Task artifact must not include sensitive/raw content marker: "token"'
    );
  });

  it('rejects empty evidence objects and arrays in required artifact fields', () => {
    writeFixture(root, {
      task: 'Implement the automatic agent gate',
      classification: 'agent workflow tooling',
      agents: {
        planner: 'planned validation contract',
        implementer: 'implemented script and docs',
        security: 'reviewed privacy and secret handling',
        'club-context': 'checked Hualas docs and route map impact',
      },
      clubContext: {},
      securityPrivacy: {
        securityAgentRequired: true,
      },
      docsSync: {},
      verification: [],
      review: 'Self-review complete.',
      risks: [],
    });

    const result = runValidator(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Task artifact field must not be an empty object: clubContext'
    );
    expect(result.stderr).toContain(
      'Task artifact field must not be an empty array: verification'
    );
  });

  it('detects an artifact inside a newly added agent gate directory', () => {
    const artifact = {
      task: 'Implement the automatic agent gate',
      classification: 'agent workflow tooling',
      agents: {
        planner: 'planned validation contract',
        implementer: 'implemented script and docs',
        security: 'reviewed privacy and secret handling',
        'club-context': 'checked Hualas docs and route map impact',
      },
      clubContext: 'No route changes; route map does not need edits.',
      securityPrivacy: 'No sensitive project values are stored.',
      docsSync:
        'AGENTS, CLAUDE, PROJECT_CONTEXT, README, and registry updated.',
      verification: ['pnpm agent:check'],
      review: 'Self-review complete.',
      risks: [],
    };
    writeFixture(root, artifact);
    mkdirSync(path.join(root, 'docs/agent-gate/runs'), { recursive: true });
    writeFileSync(
      path.join(root, 'docs/agent-gate/runs/agent-run.json'),
      JSON.stringify(artifact, null, 2)
    );
    spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' });

    const result = spawnSync(process.execPath, [scriptPath, '--root', root], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Agent gate validation passed');
  });
});
