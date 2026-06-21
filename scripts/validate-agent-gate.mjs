#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const REQUIRED_REGISTRY_AGENTS = [
  'planner',
  'implementer',
  'security',
  'club-context',
];
const REQUIRED_ALWAYS_AGENTS = ['planner', 'club-context'];
const CONDITIONAL_AGENTS = ['implementer', 'security'];

const REQUIRED_ARTIFACT_FIELDS = [
  'task',
  'classification',
  'agents',
  'clubContext',
  'securityPrivacy',
  'docsSync',
  'verification',
  'review',
  'risks',
];

const REQUIRED_SECURITY_WAKE_TERMS = [
  'auth',
  'permissions',
  'roles',
  'csrf',
  'origin',
  'jwt',
  'secrets',
  'privacy',
  'pii',
  'children',
  'personal data',
  'payments',
  'uploads',
  'private files',
  'webhooks',
  'audit log',
  'mobile tokens',
];

const SENSITIVE_ARTIFACT_PATTERNS = [
  { label: '.env', pattern: /\.env/i },
  { label: '"token"', pattern: /"token"\s*:/i },
  { label: '"authorization"', pattern: /"authorization"\s*:/i },
  { label: '"cookie"', pattern: /"cookie"\s*:/i },
  { label: 'secret=', pattern: /\bsecret\s*=/i },
  { label: 'token=', pattern: /\btoken\s*=/i },
  { label: 'authorization:', pattern: /\bauthorization\s*:/i },
  { label: 'cookie:', pattern: /\bcookie\s*:/i },
  { label: 'DATABASE_URL', pattern: /\bDATABASE_URL\b\s*[:=]/i },
  { label: 'NEXTAUTH_SECRET', pattern: /\bNEXTAUTH_SECRET\b/i },
  { label: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  { label: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/-]+=*/ },
  {
    label: 'jwt',
    pattern:
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  { label: 'raw diff', pattern: /\braw diff\b/i },
  { label: 'full diff', pattern: /\bfull diff\b/i },
  { label: 'request payload', pattern: /\brequest payload\b/i },
  { label: 'database row', pattern: /\bdatabase row\b/i },
  { label: 'command log', pattern: /\bcommand log\b/i },
];

const SENSITIVE_CHANGED_PATH_TERMS = [
  'auth',
  'middleware',
  'security',
  'mercadopago',
  'payment',
  'accounting',
  'blob',
  'photo',
  'invoice',
  'receipt',
  'notification',
  'message',
  'children',
  'profile',
  'users',
  'admin',
  'audit',
  'mobile',
  'prisma/schema.prisma',
];

function parseArgs(argv) {
  const options = {
    artifact: null,
    root: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--root') {
      options.root = path.resolve(argv[index + 1] ?? '');
      index += 1;
      continue;
    }

    if (arg === '--artifact') {
      options.artifact = path.resolve(options.root, argv[index + 1] ?? '');
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readText(root, relativePath, errors) {
  const absolutePath = path.join(root, relativePath);

  if (!existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return '';
  }

  if (!statSync(absolutePath).isFile()) {
    errors.push(`Required path is not a file: ${relativePath}`);
    return '';
  }

  const contents = readFileSync(absolutePath, 'utf8');
  if (contents.trim().length === 0) {
    errors.push(`Required file is empty: ${relativePath}`);
  }

  return contents;
}

function expectTerms(filePath, contents, terms, errors) {
  const haystack = contents.toLowerCase();

  for (const term of terms) {
    if (!haystack.includes(term.toLowerCase())) {
      errors.push(`${filePath} is missing required gate text: ${term}`);
    }
  }
}

function validateDocs(root, errors) {
  const agents = readText(root, 'AGENTS.md', errors);
  expectTerms(
    'AGENTS.md',
    agents,
    [
      'Mandatory Agent Gate',
      'planner',
      'implementer',
      'security',
      'club-context',
      'agent gate outcome',
    ],
    errors
  );

  const claude = readText(root, 'CLAUDE.md', errors);
  expectTerms(
    'CLAUDE.md',
    claude,
    ['Mandatory Agent Gate', 'AGENTS.md'],
    errors
  );

  const projectContext = readText(root, 'PROJECT_CONTEXT.md', errors);
  expectTerms(
    'PROJECT_CONTEXT.md',
    projectContext,
    ['agent gate', 'pnpm agent:check'],
    errors
  );

  const readme = readText(root, 'README.md', errors);
  expectTerms('README.md', readme, ['AGENTS.md', 'pnpm agent:check'], errors);
}

function validatePackage(root, errors) {
  const rawPackage = readText(root, 'package.json', errors);
  if (!rawPackage) {
    return;
  }

  let packageJson;
  try {
    packageJson = JSON.parse(rawPackage);
  } catch (error) {
    errors.push(`package.json is not valid JSON: ${error.message}`);
    return;
  }

  const scripts = packageJson.scripts ?? {};
  if (scripts['agent:check'] !== 'node scripts/validate-agent-gate.mjs') {
    errors.push(
      'package.json scripts.agent:check must run node scripts/validate-agent-gate.mjs'
    );
  }

  for (const scriptName of ['format:check', 'build']) {
    const script = scripts[scriptName];
    if (typeof script !== 'string' || !script.includes('pnpm agent:check')) {
      errors.push(
        `package.json scripts.${scriptName} must include pnpm agent:check`
      );
    }
  }

  if (!packageJson.devDependencies?.yaml) {
    errors.push('package.json devDependencies must include yaml');
  }
}

function normalizeTerms(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).toLowerCase());
}

function validateRegistry(root, errors) {
  const rawRegistry = readText(root, '.agent-registry.yaml', errors);
  if (!rawRegistry) {
    return;
  }

  let registry;
  try {
    registry = parseYaml(rawRegistry);
  } catch (error) {
    errors.push(`.agent-registry.yaml is not valid YAML: ${error.message}`);
    return;
  }

  const gate = registry?.gate;
  if (!gate || typeof gate !== 'object') {
    errors.push('.agent-registry.yaml must define gate');
    return;
  }

  for (const field of [
    'required',
    'checklistRequired',
    'taskArtifactRequired',
    'finalEvidenceRequired',
    'localAllowedWhenNoTriggeredAgent',
  ]) {
    if (gate[field] !== true) {
      errors.push(`.agent-registry.yaml gate.${field} must be true`);
    }
  }

  const coreAgents = Array.isArray(gate.coreAgents) ? gate.coreAgents : [];
  for (const agent of REQUIRED_REGISTRY_AGENTS) {
    if (!coreAgents.includes(agent)) {
      errors.push(`.agent-registry.yaml gate.coreAgents must include ${agent}`);
    }
  }

  const alwaysRunAgents = Array.isArray(gate.alwaysRunAgents)
    ? gate.alwaysRunAgents
    : [];
  for (const agent of REQUIRED_ALWAYS_AGENTS) {
    if (!alwaysRunAgents.includes(agent)) {
      errors.push(
        `.agent-registry.yaml gate.alwaysRunAgents must include ${agent}`
      );
    }
  }

  const conditionalAgents = Array.isArray(gate.conditionalAgents)
    ? gate.conditionalAgents
    : [];
  for (const agent of CONDITIONAL_AGENTS) {
    if (!conditionalAgents.includes(agent)) {
      errors.push(
        `.agent-registry.yaml gate.conditionalAgents must include ${agent}`
      );
    }
  }

  const agents = registry?.agents ?? {};
  for (const agent of REQUIRED_REGISTRY_AGENTS) {
    if (!agents[agent]) {
      errors.push(`.agent-registry.yaml agents.${agent} is required`);
    }
  }

  const clubContextTalksTo = agents['club-context']?.talksTo ?? [];
  for (const agent of ['planner', 'implementer', 'security']) {
    if (!clubContextTalksTo.includes(agent)) {
      errors.push(
        `.agent-registry.yaml agents.club-context.talksTo must include ${agent}`
      );
    }
  }

  if (agents.security?.canVeto !== true) {
    errors.push('.agent-registry.yaml agents.security.canVeto must be true');
  }

  const securityWakeTerms = normalizeTerms(agents.security?.wakeWhen);
  for (const term of REQUIRED_SECURITY_WAKE_TERMS) {
    if (!securityWakeTerms.includes(term)) {
      errors.push(
        `.agent-registry.yaml agents.security.wakeWhen must include ${term}`
      );
    }
  }
}

function parseGitStatus(root) {
  try {
    const output = execFileSync('git', ['status', '--porcelain'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return output
      .split('\n')
      .map((line) => line.trimEnd())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function extractStatusPath(line) {
  const withoutStatus = line.slice(3).trim();
  const renamedPath = withoutStatus.split(' -> ').at(-1);
  return renamedPath.replace(/^"|"$/g, '');
}

function collectJsonArtifacts(absolutePath) {
  if (!existsSync(absolutePath)) {
    return [];
  }

  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    return absolutePath.endsWith('.json') ? [absolutePath] : [];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) =>
    collectJsonArtifacts(path.join(absolutePath, entry.name))
  );
}

function findChangedArtifacts(root) {
  const statusLines = parseGitStatus(root);
  if (statusLines === null) {
    return {
      changedArtifacts: [],
      changedPaths: [],
      hasChanges: false,
      gitAvailable: false,
    };
  }

  const changedPaths = statusLines.map(extractStatusPath);
  const changedArtifacts = changedPaths.flatMap((filePath) => {
    if (filePath === 'docs/' || filePath === 'docs/agent-gate/') {
      return collectJsonArtifacts(path.join(root, 'docs/agent-gate/runs'));
    }

    if (filePath.startsWith('docs/agent-gate/runs/')) {
      return collectJsonArtifacts(path.join(root, filePath));
    }

    return [];
  });

  return {
    changedArtifacts,
    changedPaths,
    hasChanges: statusLines.length > 0,
    gitAvailable: true,
  };
}

function isSensitiveChangedPath(filePath) {
  const normalizedPath = filePath.toLowerCase();
  return SENSITIVE_CHANGED_PATH_TERMS.some((term) =>
    normalizedPath.includes(term.toLowerCase())
  );
}

function isEmptyObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

function validateArtifactFile(artifactPath, errors, options = {}) {
  if (!existsSync(artifactPath)) {
    errors.push(`Task artifact does not exist: ${artifactPath}`);
    return;
  }

  const rawArtifact = readFileSync(artifactPath, 'utf8');
  for (const { label, pattern } of SENSITIVE_ARTIFACT_PATTERNS) {
    if (pattern.test(rawArtifact)) {
      errors.push(
        `Task artifact must not include sensitive/raw content marker: ${label}`
      );
    }
  }

  let artifact;
  try {
    artifact = JSON.parse(rawArtifact);
  } catch (error) {
    errors.push(`Task artifact is not valid JSON: ${error.message}`);
    return;
  }

  for (const field of REQUIRED_ARTIFACT_FIELDS) {
    if (!(field in artifact)) {
      errors.push(`Task artifact is missing required field: ${field}`);
      continue;
    }

    const value = artifact[field];
    if (field === 'risks' && Array.isArray(value)) {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      errors.push(`Task artifact field must not be an empty array: ${field}`);
      continue;
    }

    if (isEmptyObject(value)) {
      errors.push(`Task artifact field must not be an empty object: ${field}`);
      continue;
    }

    if (value === null || value === '') {
      errors.push(`Task artifact field must not be empty: ${field}`);
    }
  }

  if (!artifact.agents || typeof artifact.agents !== 'object') {
    errors.push('Task artifact agents field must be an object');
    return;
  }

  for (const agent of REQUIRED_ALWAYS_AGENTS) {
    if (!(agent in artifact.agents)) {
      errors.push(`Task artifact agents field must include ${agent}`);
      continue;
    }

    if (artifact.agents[agent] === null || artifact.agents[agent] === '') {
      errors.push(`Task artifact agents.${agent} must not be empty`);
    }
  }

  const securityAgentRequired =
    options.requireSecurity ||
    artifact.securityPrivacy?.securityAgentRequired === true;
  const conditionalRequirements = [
    ['implementer', options.requireImplementer],
    ['security', securityAgentRequired],
  ];

  for (const [agent, required] of conditionalRequirements) {
    if (!required) {
      continue;
    }

    if (!(agent in artifact.agents)) {
      errors.push(`Task artifact agents field must include ${agent}`);
      continue;
    }

    if (artifact.agents[agent] === null || artifact.agents[agent] === '') {
      errors.push(`Task artifact agents.${agent} must not be empty`);
    }
  }
}

function validateArtifacts(root, explicitArtifact, errors) {
  if (explicitArtifact) {
    validateArtifactFile(explicitArtifact, errors);
    return;
  }

  const { changedArtifacts, changedPaths, gitAvailable, hasChanges } =
    findChangedArtifacts(root);
  if (!gitAvailable || !hasChanges) {
    return;
  }

  if (changedArtifacts.length === 0) {
    errors.push(
      'Working tree has changes; add or update a metadata-only task artifact in docs/agent-gate/runs/*.json'
    );
    return;
  }

  const requireSecurity = changedPaths.some(isSensitiveChangedPath);

  for (const artifactPath of changedArtifacts) {
    validateArtifactFile(artifactPath, errors, {
      requireImplementer: true,
      requireSecurity,
    });
  }
}

function main() {
  const errors = [];
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  validateDocs(options.root, errors);
  validatePackage(options.root, errors);
  validateRegistry(options.root, errors);
  validateArtifacts(options.root, options.artifact, errors);

  if (errors.length > 0) {
    console.error('Agent gate validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Agent gate validation passed');
}

main();
