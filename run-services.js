const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const services = [
  { name: 'audit-service', dir: 'services/audit-service', port: 4008, cmd: 'node', args: ['src/index.js'] },
  { name: 'auth-service', dir: 'services/auth-service', port: 4001, cmd: 'node', args: ['src/index.js'] },
  { name: 'contract-service', dir: 'services/contract-service', port: 4002, cmd: 'node', args: ['src/index.js'] },
  { name: 'ai-service', dir: 'services/ai-service', port: 4003, cmd: 'node', args: ['src/index.js'] },
  { name: 'risk-compliance-service', dir: 'services/risk-compliance-service', port: 4004, cmd: 'node', args: ['src/index.js'] },
  { name: 'chat-service', dir: 'services/chat-service', port: 4005, cmd: 'node', args: ['src/index.js'] },
  { name: 'report-service', dir: 'services/report-service', port: 4006, cmd: 'node', args: ['src/index.js'] },
  { name: 'notification-service', dir: 'services/notification-service', port: 4007, cmd: 'node', args: ['src/index.js'] },
  { name: 'gateway', dir: 'gateway', port: 4000, cmd: 'node', args: ['src/index.js'] },
  { name: 'bidding-service', dir: 'services/bidding-service', port: 4009, cmd: 'python', args: ['src/main.py'] }
];

console.log('=== LEGAL AI PLATFORM: LOCAL SERVICES RUNNER ===\n');

// Parser for .env file
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env file...');
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        env[key] = value;
      }
    }
  } else {
    console.warn('Warning: .env file not found at the root.');
  }
  return env;
}

const fileEnv = loadEnv();

// 1. Install dependencies where node_modules/requirements are missing
for (const service of services) {
  const servicePath = path.resolve(__dirname, service.dir);
  
  if (service.cmd === 'node') {
    const nodeModulesPath = path.join(servicePath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log(`\n[${service.name}] node_modules not found. Installing dependencies via npm install...`);
      try {
        execSync('npm install --production', { cwd: servicePath, stdio: 'inherit' });
        console.log(`[${service.name}] Dependencies installed successfully.`);
      } catch (err) {
        console.error(`[${service.name}] Failed to install dependencies:`, err.message);
      }
    }
  } else if (service.name === 'bidding-service') {
    console.log(`\n[bidding-service] Checking/Installing Python dependencies...`);
    try {
      execSync('pip install -r requirements.txt', { cwd: servicePath, stdio: 'inherit' });
      console.log(`[bidding-service] Python dependencies verified/installed successfully.`);
    } catch (err) {
      console.error(`[bidding-service] Failed to install Python dependencies:`, err.message);
    }
  }
}

console.log('\nStarting services...\n');

const children = [];

for (const service of services) {
  const servicePath = path.resolve(__dirname, service.dir);
  
  // Setup environment variables overriding the docker hosts with localhost
  const env = {
    ...process.env,
    ...fileEnv,
    PORT: service.port.toString(),
    NODE_PATH: __dirname, // allow modules to find shared folders locally
    AUDIT_SERVICE_URL: 'http://localhost:4008',
    NOTIFICATION_SERVICE_URL: 'http://localhost:4007',
    CONTRACT_SERVICE_URL: 'http://localhost:4002',
    AI_SERVICE_URL: 'http://localhost:4003',
    RISK_SERVICE_URL: 'http://localhost:4004',
    BIDDING_SERVICE_URL: 'http://localhost:4009',
    AUTH_SERVICE_URL: 'http://localhost:4001',
    CHAT_SERVICE_URL: 'http://localhost:4005',
    REPORT_SERVICE_URL: 'http://localhost:4006'
  };

  const child = spawn(service.cmd, service.args, {
    cwd: servicePath,
    env,
    shell: true
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line) console.log(`[${service.name}] ${line}`);
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line) console.error(`[${service.name}] [STDERR] ${line}`);
    }
  });

  child.on('close', (code) => {
    console.log(`[${service.name}] Process exited with code ${code}`);
  });

  children.push(child);
}

// Handle clean shutdown on exit
function shutdown() {
  console.log('\nShutting down all services...');
  for (const child of children) {
    try {
      child.kill();
    } catch (e) {}
  }
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
