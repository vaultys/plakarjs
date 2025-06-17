/**
 * Common options available for most Plakar commands
 */
export interface CommonOptions {
  /** Use the configuration at path */
  config?: string;
  /** Limit the number of parallelism */
  cpu?: number;
  /** Change the hostname used for backups */
  hostname?: string;
  /** Use the passphrase from the key file */
  keyfile?: string;
  /** Run without attempting to connect to the agent */
  noAgent?: boolean;
  /** Disable all output except for errors */
  quiet?: boolean;
  /** Display trace logs */
  trace?: string;
  /** Change the username used for backups */
  username?: string;
}

/**
 * Repository specification
 */
export interface Repository {
  /** Repository path, URI, or label */
  location: string;
}

/**
 * Backup options
 */
export interface BackupOptions extends CommonOptions {
  /** Set the maximum number of parallel tasks */
  concurrency?: number;
  /** Specify individual glob exclusion patterns */
  exclude?: string[];
  /** Specify a file containing glob exclusion patterns */
  excludes?: string;
  /** Perform a full check on the backup after success */
  check?: boolean;
  /** Specify a tag to assign to the snapshot */
  tag?: string;
}

/**
 * List options for filtering snapshots
 */
export interface ListOptions extends CommonOptions {
  /** Display the full UUID for each snapshot */
  uuid?: boolean;
  /** Filter by snapshot name */
  name?: string;
  /** Filter by category */
  category?: string;
  /** Filter by environment */
  environment?: string;
  /** Filter by perimeter */
  perimeter?: string;
  /** Filter by job */
  job?: string;
  /** Filter by tag */
  tag?: string;
  /** Only show latest snapshot matching filters */
  latest?: boolean;
  /** Only show snapshots older than the specified date */
  before?: string;
  /** Only show snapshots created since the specified date */
  since?: string;
  /** List directory contents recursively */
  recursive?: boolean;
}

/**
 * Restore options
 */
export interface RestoreOptions extends CommonOptions {
  /** Filter by snapshot name */
  name?: string;
  /** Filter by category */
  category?: string;
  /** Filter by environment */
  environment?: string;
  /** Filter by perimeter */
  perimeter?: string;
  /** Filter by job */
  job?: string;
  /** Filter by tag */
  tag?: string;
  /** Only restore from latest snapshot matching filters */
  latest?: boolean;
  /** Only restore from snapshots older than the specified date */
  before?: string;
  /** Only restore from snapshots created since the specified date */
  since?: string;
  /** Set the maximum number of parallel tasks */
  concurrency?: number;
  /** Strip the original path from each restored file */
  rebase?: boolean;
  /** Specify the base directory to which files will be restored */
  to?: string;
}

/**
 * Repository creation options
 */
export interface CreateOptions extends CommonOptions {
  /** Create unencrypted repository */
  noEncryption?: boolean;
}

/**
 * Sync options
 */
export interface SyncOptions extends CommonOptions {
  /** Synchronization direction */
  direction?: "to" | "from" | "with";
  /** Target repository for synchronization */
  target: string;
}

/**
 * Check options
 */
export interface CheckOptions extends CommonOptions {
  /** Perform deep integrity check */
  deep?: boolean;
}

/**
 * Clone options
 */
export interface CloneOptions extends CommonOptions {
  /** Target repository for cloning */
  target: string;
}

/**
 * Mount options
 */
export interface MountOptions extends CommonOptions {
  /** Mount point directory */
  mountPoint: string;
  /** Mount in read-only mode */
  readonly?: boolean;
}

/**
 * UI options
 */
export interface UIOptions extends CommonOptions {
  /** Port to bind the web interface */
  port?: number;
  /** Host to bind the web interface */
  host?: string;
}

/**
 * Server options
 */
export interface ServerOptions extends CommonOptions {
  /** Port to bind the server */
  port?: number;
  /** Host to bind the server */
  host?: string;
}

/**
 * Remove options
 */
export interface RemoveOptions extends CommonOptions {
  /** Remove snapshots older than the specified date */
  before?: string;
  /** Remove snapshots created since the specified date */
  since?: string;
  /** Filter by snapshot name */
  name?: string;
  /** Filter by category */
  category?: string;
  /** Filter by environment */
  environment?: string;
  /** Filter by perimeter */
  perimeter?: string;
  /** Filter by job */
  job?: string;
  /** Filter by tag */
  tag?: string;
  /** Force removal without confirmation */
  force?: boolean;
}

/**
 * Snapshot information
 */
export interface Snapshot {
  /** Snapshot ID */
  id: string;
  /** Full UUID */
  uuid?: string;
  /** Creation timestamp */
  timestamp: string;
  /** Snapshot size */
  size: string;
  /** Duration of backup */
  duration: string;
  /** Backed up path */
  path: string;
  /** Tags associated with the snapshot */
  tags?: string[];
}

/**
 * File information in a snapshot
 */
export interface FileInfo {
  /** File path */
  path: string;
  /** File size */
  size: number;
  /** File permissions */
  mode: string;
  /** File modification time */
  mtime: string;
  /** File type */
  type: "file" | "directory" | "symlink";
  /** Link target for symlinks */
  target?: string;
}

/**
 * Repository information
 */
export interface RepositoryInfo {
  /** Repository location */
  location: string;
  /** Repository type */
  type: string;
  /** Whether repository is encrypted */
  encrypted: boolean;
  /** Number of snapshots */
  snapshots: number;
  /** Total size */
  totalSize: string;
}

/**
 * Agent status
 */
export interface AgentStatus {
  /** Whether agent is running */
  running: boolean;
  /** Agent process ID */
  pid?: number;
}

/**
 * Version information
 */
export interface VersionInfo {
  /** Plakar version */
  version: string;
  /** Available importers */
  importers: string[];
  /** Available exporters */
  exporters: string[];
  /** Available klosets */
  klosets: string[];
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether command succeeded */
  success: boolean;
}

/**
 * Diff options
 */
export interface DiffOptions extends CommonOptions {
  /** Show context lines */
  context?: number;
  /** Show unified diff */
  unified?: boolean;
}

/**
 * Locate options
 */
export interface LocateOptions extends CommonOptions {
  /** Pattern to search for */
  pattern: string;
  /** Case-sensitive search */
  caseSensitive?: boolean;
}

/**
 * Cat options
 */
export interface CatOptions extends CommonOptions {
  /** Show line numbers */
  number?: boolean;
}

/**
 * Archive options
 */
export interface ArchiveOptions extends CommonOptions {
  /** Output format */
  format?: "tar" | "zip";
  /** Output file path */
  output: string;
  /** Compression level */
  compression?: number;
}

/**
 * Config repository options
 */
export interface ConfigRepositoryOptions {
  /** Repository name */
  name: string;
  /** Repository location */
  location?: string;
  /** Repository passphrase */
  passphrase?: string;
  /** Access key for S3 repositories */
  accessKey?: string;
  /** Secret access key for S3 repositories */
  secretAccessKey?: string;
}

/**
 * Maintenance options
 */
export interface MaintenanceOptions extends CommonOptions {
  /** Perform dry run */
  dryRun?: boolean;
  /** Force maintenance */
  force?: boolean;
}
