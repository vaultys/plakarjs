# PlakarJS

A comprehensive Node.js wrapper for the [Plakar CLI](https://plakar.io) - effortless distributed backups with compression, encryption, and data deduplication.

## Features

- 🔐 **Encrypted & Secure**: Full support for encrypted repositories
- 🌐 **Distributed**: Sync across multiple storage backends (local, SFTP, S3, etc.)
- 🔄 **Deduplication**: Efficient storage with automatic data deduplication
- 📦 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🚀 **Promise-based**: Modern async/await API
- 🛠 **Comprehensive**: Covers all Plakar CLI commands

## Installation

```bash
npm install plakarjs
```

**Plakar CLI**: This package can automatically install the Plakar CLI for you, or you can install it manually.

### Automatic Installation (Recommended)

The package will automatically check for and install Plakar CLI when needed:

```typescript
import { Plakar, ensurePlakarInstalled } from 'plakarjs';

// Method 1: Auto-install during setup
const installResult = await ensurePlakarInstalled();
if (installResult.success) {
  console.log('Plakar CLI is ready!');
}

// Method 2: Auto-install via constructor
const plakar = new Plakar({ autoInstall: true });
await plakar.ensureInstalled();
```

### Manual Installation

If you prefer to install Plakar CLI manually:

```bash
# Install Plakar CLI
go install github.com/PlakarKorp/plakar/cmd/plakar@latest

# Add to PATH if needed
export PATH=$PATH:$(go env GOPATH)/bin
```

### Installation Management

Check installation status and manage Plakar CLI:

```typescript
import { isPlakarInstalled, installPlakar, Plakar } from 'plakarjs';

// Quick check
const isInstalled = await isPlakarInstalled();

// Detailed check
const plakar = new Plakar();
const status = await plakar.checkInstallation();
console.log('Installed:', status.installed);
console.log('Version:', status.version);
console.log('Path:', status.path);

// Manual installation with options
const result = await installPlakar({
  version: 'latest',
  verbose: true,
  force: false
});
```

## Quick Start

```typescript
import { Plakar } from 'plakarjs';

const plakar = new Plakar();

async function example() {
  // Ensure Plakar CLI is installed
  const installResult = await plakar.ensureInstalled();
  if (!installResult.success) {
    console.error('Failed to setup Plakar:', installResult.message);
    return;
  }

  // Start the agent (recommended for performance)
  await plakar.startAgent();

  // Create a repository
  await plakar.createRepository('/var/backups');

  // Create a backup
  const snapshotId = await plakar.backup('/home/user/documents', '/var/backups', {
    tag: 'daily-backup',
    exclude: ['*.tmp', '*.log']
  });

  console.log(`Created snapshot: ${snapshotId}`);

  // List all snapshots
  const snapshots = await plakar.list(undefined, '/var/backups');
  console.log('Snapshots:', snapshots);

  // Restore from backup
  await plakar.restore(`${snapshotId}:/home/user/documents`, '/var/backups', {
    to: '/tmp/restore'
  });
}

example().catch(console.error);
```

## API Reference

### Constructor

```typescript
const plakar = new Plakar({
  binaryPath?: string,        // Path to plakar binary (default: 'plakar')
  repository?: string,        // Default repository location
  defaultOptions?: CommonOptions,
  autoInstall?: boolean       // Auto-install Plakar CLI if not found
});
```

### Installation Management

```typescript
// Check if Plakar CLI is installed
const checkResult = await plakar.checkInstallation();
console.log('Installed:', checkResult.installed);
console.log('Version:', checkResult.version);
console.log('Path:', checkResult.path);

// Ensure Plakar CLI is installed (install if needed)
const installResult = await plakar.ensureInstalled({
  version: 'latest',
  verbose: true,
  force: false
});

// Manual installation
const result = await plakar.installPlakar({
  version: 'latest',
  installPath: '/usr/local/bin',
  timeout: 120000
});

// Get installation instructions
console.log(Plakar.getInstallInstructions());

// Uninstall Plakar CLI
await plakar.uninstallPlakar();
```

### Agent Management

```typescript
// Start the agent
await plakar.startAgent();

// Stop the agent
await plakar.stopAgent();

// Check agent status
const status = await plakar.getAgentStatus();
```

### Repository Operations

```typescript
// Create a repository
await plakar.createRepository('/var/backups', {
  noEncryption: false  // Set to true for unencrypted repository
});

// Create repository with custom configuration
await plakar.configCreateRepository('myrepo', {
  name: 'myrepo',
  location: 's3://s3.amazonaws.com/my-backup-bucket',
  accessKey: 'your-access-key',
  secretAccessKey: 'your-secret-key'
});
```

### Backup Operations

```typescript
// Simple backup
const snapshotId = await plakar.backup('/path/to/backup');

// Backup with options
const snapshotId = await plakar.backup('/path/to/backup', '/var/backups', {
  tag: 'important',
  exclude: ['*.tmp', 'node_modules', '.git'],
  excludes: '/path/to/exclude-file',
  concurrency: 4,
  check: true  // Verify backup after creation
});
```

### Listing and Browsing

```typescript
// List all snapshots
const snapshots = await plakar.list();

// List with filters
const snapshots = await plakar.list(undefined, '/var/backups', {
  tag: 'daily',
  since: '7d',  // Last 7 days
  latest: true
});

// Browse snapshot contents
const files = await plakar.list('abc123:/path/in/snapshot', '/var/backups', {
  recursive: true
});
```

### Restore Operations

```typescript
// Restore entire snapshot
await plakar.restore('abc123', '/var/backups', {
  to: '/tmp/restore'
});

// Restore specific files
await plakar.restore('abc123:/specific/file', '/var/backups', {
  to: '/tmp/restore',
  rebase: true  // Strip original path structure
});

// Restore with filters
await plakar.restore(undefined, '/var/backups', {
  tag: 'latest',
  to: '/tmp/restore'
});
```

### File Operations

```typescript
// Display file contents
const content = await plakar.cat('abc123:/path/to/file');

// Find files
const matches = await plakar.locate('*.pdf', 'abc123');

// Show differences
const diff = await plakar.diff('abc123:/file', 'def456:/file');
```

### Repository Synchronization

```typescript
// Sync to another repository
await plakar.sync('sftp://user@remote:/backups', '/var/backups', {
  direction: 'to'
});

// Sync from another repository
await plakar.sync('sftp://user@remote:/backups', '/var/backups', {
  direction: 'from'
});

// Bidirectional sync
await plakar.sync('sftp://user@remote:/backups', '/var/backups', {
  direction: 'with'
});
```

### Maintenance

```typescript
// Check repository integrity
await plakar.check('abc123', '/var/backups');

// Repository maintenance
await plakar.maintenance('/var/backups', {
  dryRun: true  // Preview what would be cleaned
});

// Remove old snapshots
await plakar.remove(['abc123', 'def456'], '/var/backups');

// Remove by criteria
await plakar.remove(undefined, '/var/backups', {
  before: '30d',  // Older than 30 days
  force: true
});
```

### Advanced Features

```typescript
// Clone repository
await plakar.clone('/new/location', '/var/backups');

// Mount as filesystem (Linux/macOS)
await plakar.mount('/mnt/plakar', 'abc123', '/var/backups');

// Create archive
await plakar.archive('abc123:/path', '/tmp/backup.tar', '/var/backups', {
  format: 'tar',
  compression: 9
});

// Start web UI
await plakar.startUI('/var/backups', {
  port: 8080,
  host: 'localhost'
});
```

## Working with Multiple Repositories

```typescript
// Using repository URLs
const plakar = new Plakar();

// Ensure Plakar is installed first
await plakar.ensureInstalled();

// Local repository
await plakar.backup('/data', '/var/backups');

// SFTP repository
await plakar.backup('/data', 'sftp://user@server:/backups');

// S3 repository
await plakar.backup('/data', 's3://s3.amazonaws.com/bucket');

// Using named repositories
await plakar.configCreateRepository('prod', {
  name: 'prod',
  location: 's3://s3.amazonaws.com/prod-backups'
});

await plakar.backup('/data', '@prod');
```

## Error Handling

```typescript
import { Plakar } from 'plakarjs';

const plakar = new Plakar();

try {
  const snapshotId = await plakar.backup('/nonexistent');
} catch (error) {
  console.error('Backup failed:', error.message);
  
  // Access detailed error information
  if (error.result) {
    console.error('Exit code:', error.result.exitCode);
    console.error('Stderr:', error.result.stderr);
  }
}
```

## Environment Variables

The wrapper respects Plakar environment variables:

- `PLAKAR_PASSPHRASE`: Repository passphrase
- `PLAKAR_REPOSITORY`: Default repository location
- `PLAKAR_AGENTLESS`: Run without agent (set to any value)

```typescript
// Set passphrase via environment
process.env.PLAKAR_PASSPHRASE = 'your-passphrase';

const plakar = new Plakar();
await plakar.createRepository('/var/backups');  // No passphrase prompt
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { Plakar, Snapshot, BackupOptions } from 'plakarjs';

const plakar = new Plakar();

const options: BackupOptions = {
  tag: 'nightly',
  exclude: ['*.tmp'],
  concurrency: 8
};

const snapshots: Snapshot[] = await plakar.list();
```

## Examples

### Daily Backup Script

```typescript
import { Plakar } from 'plakarjs';

async function dailyBackup() {
  const plakar = new Plakar({ repository: '/var/backups' });
  
  try {
    // Ensure Plakar CLI is installed and ready
    const installResult = await plakar.ensureInstalled();
    if (!installResult.success) {
      console.error('Plakar setup failed:', installResult.message);
      process.exit(1);
    }

    // Ensure agent is running
    const status = await plakar.getAgentStatus();
    if (!status.running) {
      await plakar.startAgent();
    }

    // Create backup with today's tag
    const today = new Date().toISOString().split('T')[0];
    const snapshotId = await plakar.backup('/home', undefined, {
      tag: `daily-${today}`,
      exclude: ['*.tmp', '.cache', 'node_modules']
    });

    console.log(`Daily backup completed: ${snapshotId}`);

    // Clean up old backups (keep 30 days)
    await plakar.remove(undefined, undefined, {
      before: '30d',
      tag: 'daily-*',
      force: true
    });

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
}

dailyBackup();
```

### Multi-Repository Sync

```typescript
import { Plakar, ensurePlakarInstalled } from 'plakarjs';

async function syncRepositories() {
  // Ensure Plakar is installed before starting
  const installResult = await ensurePlakarInstalled({ verbose: true });
  if (!installResult.success) {
    console.error('Setup failed:', installResult.message);
    return;
  }

  const plakar = new Plakar();
  
  const repositories = [
    '/var/backups',
    'sftp://nas.local:/backups',
    's3://s3.amazonaws.com/backup-bucket'
  ];

  // Sync local to all remotes
  for (let i = 1; i < repositories.length; i++) {
    console.log(`Syncing to ${repositories[i]}`);
    await plakar.sync(repositories[i]!, repositories[0]);
  }

  console.log('All repositories synchronized');
}
```

## Requirements

- Node.js 16+
- Go toolchain (for automatic Plakar CLI installation)
- Plakar CLI (can be auto-installed by this package)
- Appropriate permissions for backup locations

### Go Installation

If you want to use automatic Plakar CLI installation, you'll need Go:

- **macOS**: `brew install go`
- **Ubuntu/Debian**: `sudo apt-get update && sudo apt-get install -y golang`
- **Windows/Others**: https://golang.org/doc/install

The package will check for Go availability and provide helpful error messages if it's missing.

## License

ISC

## Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests to the repository.

## Related Links

- [Plakar Documentation](https://docs.plakar.io)
- [Plakar GitHub](https://github.com/PlakarKorp/plakar)
- [Plakar Website](https://plakar.io)