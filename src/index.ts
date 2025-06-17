/**
 * PlakarJS - Node.js wrapper for Plakar CLI
 *
 * Plakar is a tool to create distributed, versioned backups with compression,
 * encryption and data deduplication.
 *
 * @example
 * ```typescript
 * import { Plakar } from 'plakarjs';
 *
 * const plakar = new Plakar();
 *
 * // Create a repository
 * await plakar.createRepository('/var/backups');
 *
 * // Create a backup
 * const snapshotId = await plakar.backup('/home/user/documents');
 *
 * // List snapshots
 * const snapshots = await plakar.list();
 *
 * // Restore from backup
 * await plakar.restore(`${snapshotId}:/home/user/documents`, undefined, {
 *   to: '/tmp/restore'
 * });
 * ```
 */

export { Plakar } from "./plakar";

// Export all types
export * from "./types";

// Export installation utilities
export { PlakarInstaller, isPlakarInstalled, installPlakar, ensurePlakarInstalled, type InstallOptions, type InstallResult, type CheckResult } from "./installer";

// Default export
export { Plakar as default } from "./plakar";
