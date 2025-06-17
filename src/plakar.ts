import { spawn, SpawnOptions } from "child_process";
import {
  CommonOptions,
  BackupOptions,
  ListOptions,
  RestoreOptions,
  CreateOptions,
  SyncOptions,
  CheckOptions,
  CloneOptions,
  MountOptions,
  UIOptions,
  ServerOptions,
  RemoveOptions,
  DiffOptions,
  LocateOptions,
  CatOptions,
  ArchiveOptions,
  ConfigRepositoryOptions,
  MaintenanceOptions,
  Snapshot,
  AgentStatus,
  VersionInfo,
  CommandResult,
} from "./types";
import { PlakarInstaller, InstallOptions, CheckResult, InstallResult } from "./installer";

/**
 * Main Plakar wrapper class
 */
export class Plakar {
  private binaryPath: string;
  private defaultRepository?: string;
  private defaultOptions: CommonOptions;

  constructor(
    options: {
      binaryPath?: string;
      repository?: string;
      defaultOptions?: CommonOptions;
      autoInstall?: boolean;
    } = {},
  ) {
    this.binaryPath = options.binaryPath || "plakar";
    this.defaultRepository = options.repository;
    this.defaultOptions = options.defaultOptions || {};

    // Auto-install check if requested
    if (options.autoInstall) {
      this.ensureInstalled().catch(() => {
        // Silent fail for constructor, user can call ensureInstalled() explicitly
      });
    }
  }

  /**
   * Execute a plakar command
   */
  private async executeCommand(args: string[], options: CommonOptions = {}): Promise<CommandResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const commandArgs = this.buildCommandArgs(args, mergedOptions);

    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
        cwd: process.cwd(),
      };

      // Set environment variables if needed
      if (process.env["PLAKAR_PASSPHRASE"]) {
        spawnOptions.env!["PLAKAR_PASSPHRASE"] = process.env["PLAKAR_PASSPHRASE"];
      }
      if (this.defaultRepository) {
        spawnOptions.env!["PLAKAR_REPOSITORY"] = this.defaultRepository;
      }
      // console.log("executing command:", this.binaryPath, commandArgs.join(" "));

      const child = spawn(this.binaryPath, commandArgs, spawnOptions);

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        const result: CommandResult = {
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: (code || 0) === 0,
        };

        if (result.success) {
          resolve(result);
        } else {
          const error = new Error(`Plakar command failed: ${stderr || stdout}`);
          (error as any).result = result;
          reject(error);
        }
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to execute plakar: ${error.message}`));
      });
    });
  }

  /**
   * Build command arguments from options
   */
  private buildCommandArgs(baseArgs: string[], options: CommonOptions): string[] {
    const args = [...baseArgs];

    if (options.config) {
      args.unshift("-config", options.config);
    }
    if (options.cpu) {
      args.unshift("-cpu", options.cpu.toString());
    }
    if (options.hostname) {
      args.unshift("-hostname", options.hostname);
    }
    if (options.keyfile) {
      args.unshift("-keyfile", options.keyfile);
    }
    if (options.noAgent) {
      args.unshift("-no-agent");
    }
    if (options.quiet) {
      args.unshift("-quiet");
    }
    if (options.trace) {
      args.unshift("-trace", options.trace);
    }
    if (options.username) {
      args.unshift("-username", options.username);
    }

    return args;
  }

  /**
   * Add repository specification to command args
   */
  private addRepositoryArgs(args: string[], repository?: string): string[] {
    if (repository) {
      return ["at", repository, ...args];
    }
    return args;
  }

  /**
   * Parse snapshot list output
   */
  private parseSnapshotList(output: string): Snapshot[] {
    const lines = output.split("\n").filter((line) => line.trim());
    const snapshots: Snapshot[] = [];

    for (const line of lines) {
      // Parse format: "2025-02-19T21:38:16Z   9abc3294    3.1 MB      0s   /private/etc"
      const match = line.match(/^(\S+)\s+(\S+)\s+([0-9.]+ \w+)\s+(\S+)\s+(.+)$/);
      if (match) {
        snapshots.push({
          id: match[2]!,
          timestamp: match[1]!,
          size: match[3]!,
          duration: match[4]!,
          path: match[5]!,
        });
      }
    }

    return snapshots;
  }

  /**
   * Parse version output
   */
  private parseVersion(output: string): VersionInfo {
    const lines = output.split("\n");
    const versionLine = lines[0] || "";
    const version = versionLine.replace(/^plakar\//, "");

    const info: VersionInfo = {
      version,
      importers: [],
      exporters: [],
      klosets: [],
    };

    for (const line of lines) {
      if (line.startsWith("importers:")) {
        info.importers = line.replace("importers:", "").trim().split(", ");
      } else if (line.startsWith("exporters:")) {
        info.exporters = line.replace("exporters:", "").trim().split(", ");
      } else if (line.startsWith("klosets:")) {
        info.klosets = line.replace("klosets:", "").trim().split(", ");
      }
    }

    return info;
  }

  /**
   * Start the plakar agent
   */
  async startAgent(options: CommonOptions = {}): Promise<AgentStatus> {
    const result = await this.executeCommand(["agent"], options);

    // Parse agent output to extract PID
    const pidMatch = result.stdout.match(/pid=(\d+)/);
    const pid = pidMatch ? parseInt(pidMatch[1]!) : undefined;

    return {
      running: true,
      ...(pid !== undefined && { pid }),
    };
  }

  /**
   * Stop the plakar agent
   */
  async stopAgent(options: CommonOptions = {}): Promise<void> {
    await this.executeCommand(["agent", "stop"], options);
  }

  /**
   * Get agent status
   */
  async getAgentStatus(options: CommonOptions = {}): Promise<AgentStatus> {
    try {
      const result = await this.executeCommand(["agent", "status"], options);
      const pidMatch = result.stdout.match(/pid=(\d+)/);
      const pid = pidMatch ? parseInt(pidMatch[1]!) : undefined;
      return {
        running: true,
        ...(pid !== undefined && { pid }),
      };
    } catch {
      return { running: false };
    }
  }

  /**
   * Create a new repository
   */
  async createRepository(repository?: string, options: CreateOptions = {}): Promise<void> {
    const args = ["create"];
    if (options.noEncryption) {
      args.push("-no-encryption");
    }

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Create a backup snapshot
   */
  async backup(path?: string, repository?: string, options: BackupOptions = {}): Promise<string> {
    const args = ["backup"];

    if (options.concurrency) {
      args.push("-concurrency", options.concurrency.toString());
    }
    if (options.exclude) {
      for (const pattern of options.exclude) {
        args.push("-exclude", pattern);
      }
    }
    if (options.excludes) {
      args.push("-excludes", options.excludes);
    }
    if (options.check) {
      args.push("-check");
    }
    if (options.tag) {
      args.push("-tag", options.tag);
    }
    if (path) {
      args.push(path);
    }

    const result = await this.executeCommand(this.addRepositoryArgs(args, repository), options);

    // Extract snapshot ID from output
    const snapshotMatch = result.stdout.match(/created.*snapshot (\w+)/);
    return snapshotMatch ? snapshotMatch[1]! : "";
  }

  /**
   * List snapshots or snapshot contents
   */
  async list(snapshotPath?: string, repository?: string, options: ListOptions = {}): Promise<Snapshot[]> {
    const args = ["ls"];

    if (options.uuid) args.push("-uuid");
    if (options.name) args.push("-name", options.name);
    if (options.category) args.push("-category", options.category);
    if (options.environment) args.push("-environment", options.environment);
    if (options.perimeter) args.push("-perimeter", options.perimeter);
    if (options.job) args.push("-job", options.job);
    if (options.tag) args.push("-tag", options.tag);
    if (options.latest) args.push("-latest");
    if (options.before) args.push("-before", options.before);
    if (options.since) args.push("-since", options.since);
    if (options.recursive) args.push("-recursive");
    if (snapshotPath) args.push(snapshotPath);

    const result = await this.executeCommand(this.addRepositoryArgs(args, repository), options);

    return this.parseSnapshotList(result.stdout);
  }

  /**
   * Restore files from a snapshot
   */
  async restore(snapshotPath?: string, repository?: string, options: RestoreOptions = {}): Promise<void> {
    const args = ["restore"];

    if (options.name) args.push("-name", options.name);
    if (options.category) args.push("-category", options.category);
    if (options.environment) args.push("-environment", options.environment);
    if (options.perimeter) args.push("-perimeter", options.perimeter);
    if (options.job) args.push("-job", options.job);
    if (options.tag) args.push("-tag", options.tag);
    if (options.latest) args.push("-latest");
    if (options.before) args.push("-before", options.before);
    if (options.since) args.push("-since", options.since);
    if (options.concurrency) args.push("-concurrency", options.concurrency.toString());
    if (options.rebase) args.push("-rebase");
    if (options.to) args.push("-to", options.to);
    if (snapshotPath) args.push(snapshotPath);

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Check repository integrity
   */
  async check(snapshotId?: string, repository?: string, options: CheckOptions = {}): Promise<void> {
    const args = ["check"];
    if (snapshotId) args.push(snapshotId);

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Synchronize repositories
   */
  async sync(target: string, repository?: string, options: Omit<SyncOptions, "target"> = {}): Promise<void> {
    const direction = options.direction || "to";
    const args = ["sync", direction, target];

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Clone a repository
   */
  async clone(target: string, repository?: string, options: Omit<CloneOptions, "target"> = {}): Promise<void> {
    const args = ["clone", target];

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Display file contents from a snapshot
   */
  async cat(snapshotPath: string, repository?: string, options: CatOptions = {}): Promise<string> {
    const args = ["cat"];
    if (options.number) args.push("-number");
    args.push(snapshotPath);

    const result = await this.executeCommand(this.addRepositoryArgs(args, repository), options);

    return result.stdout;
  }

  /**
   * Show differences between files
   */
  async diff(snapshot1: string, snapshot2: string, repository?: string, options: DiffOptions = {}): Promise<string> {
    const args = ["diff"];
    if (options.context) args.push("-context", options.context.toString());
    if (options.unified) args.push("-unified");
    args.push(snapshot1, snapshot2);

    const result = await this.executeCommand(this.addRepositoryArgs(args, repository), options);

    return result.stdout;
  }

  /**
   * Find filenames in snapshots
   */
  async locate(pattern: string, snapshotId?: string, repository?: string, options: Omit<LocateOptions, "pattern"> = {}): Promise<string[]> {
    const args = ["locate"];
    if (options.caseSensitive) args.push("-case-sensitive");
    args.push(pattern);
    if (snapshotId) args.push(snapshotId);

    const result = await this.executeCommand(this.addRepositoryArgs(args, repository), options);

    return result.stdout.split("\n").filter((line) => line.trim());
  }

  /**
   * Remove snapshots
   */
  async remove(snapshotIds?: string[], repository?: string, options: RemoveOptions = {}): Promise<void> {
    const args = ["rm"];

    if (options.before) args.push("-before", options.before);
    if (options.since) args.push("-since", options.since);
    if (options.name) args.push("-name", options.name);
    if (options.category) args.push("-category", options.category);
    if (options.environment) args.push("-environment", options.environment);
    if (options.perimeter) args.push("-perimeter", options.perimeter);
    if (options.job) args.push("-job", options.job);
    if (options.tag) args.push("-tag", options.tag);
    if (options.force) args.push("-force");
    if (snapshotIds) args.push(...snapshotIds);

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Mount snapshots as filesystem
   */
  async mount(mountPoint: string, snapshotId?: string, repository?: string, options: Omit<MountOptions, "mountPoint"> = {}): Promise<void> {
    const args = ["mount"];
    if (options.readonly) args.push("-readonly");
    args.push(mountPoint);
    if (snapshotId) args.push(snapshotId);

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Start web UI
   */
  async startUI(repository?: string, options: UIOptions = {}): Promise<void> {
    const args = ["ui"];
    if (options.port) args.push("-port", options.port.toString());
    if (options.host) args.push("-host", options.host);

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Start server
   */
  async startServer(repository?: string, options: ServerOptions = {}): Promise<void> {
    const args = ["server"];
    if (options.port) args.push("-port", options.port.toString());
    if (options.host) args.push("-host", options.host);

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Create archive from snapshot
   */
  async archive(snapshotPath: string, output: string, repository?: string, options: Omit<ArchiveOptions, "output"> = {}): Promise<void> {
    const args = ["archive"];
    if (options.format) args.push("-format", options.format);
    if (options.compression) args.push("-compression", options.compression.toString());
    args.push("-output", output, snapshotPath);

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Perform repository maintenance
   */
  async maintenance(repository?: string, options: MaintenanceOptions = {}): Promise<void> {
    const args = ["maintenance"];
    if (options.dryRun) args.push("-dry-run");
    if (options.force) args.push("-force");

    await this.executeCommand(this.addRepositoryArgs(args, repository), options);
  }

  /**
   * Get repository information
   */
  async info(snapshotId?: string, repository?: string, options: CommonOptions = {}): Promise<string> {
    const args = ["info"];
    if (snapshotId) args.push(snapshotId);

    const result = await this.executeCommand(this.addRepositoryArgs(args, repository), options);

    return result.stdout;
  }

  /**
   * Get version information
   */
  async version(options: CommonOptions = {}): Promise<VersionInfo> {
    const result = await this.executeCommand(["version"], options);
    return this.parseVersion(result.stdout);
  }

  /**
   * Configuration management
   */
  async configCreateRepository(name: string, options: ConfigRepositoryOptions): Promise<void> {
    await this.executeCommand(["config", "repository", "create", name]);

    if (options.location) {
      await this.executeCommand(["config", "repository", "set", name, "location", options.location]);
    }
    if (options.passphrase) {
      await this.executeCommand(["config", "repository", "set", name, "passphrase", options.passphrase]);
    }
    if (options.accessKey) {
      await this.executeCommand(["config", "repository", "set", name, "access_key", options.accessKey]);
    }
    if (options.secretAccessKey) {
      await this.executeCommand(["config", "repository", "set", name, "secret_access_key", options.secretAccessKey]);
    }
  }

  /**
   * Set default repository
   */
  async configSetDefaultRepository(name: string): Promise<void> {
    await this.executeCommand(["config", "repository", "default", name]);
  }

  /**
   * Check if Plakar CLI is installed
   */
  async checkInstallation(): Promise<CheckResult> {
    return PlakarInstaller.check(this.binaryPath === "plakar" ? undefined : this.binaryPath);
  }

  /**
   * Install Plakar CLI if not already installed
   */
  async installPlakar(options: InstallOptions = {}): Promise<InstallResult> {
    return PlakarInstaller.install(options);
  }

  /**
   * Ensure Plakar CLI is installed, install if needed
   */
  async ensureInstalled(options: InstallOptions = {}): Promise<InstallResult> {
    const checkResult = await this.checkInstallation();

    if (checkResult.installed) {
      return {
        success: true,
        message: `Plakar CLI is available at ${checkResult.path} (version: ${checkResult.version})`,
        version: checkResult.version,
        path: checkResult.path,
      };
    }

    if (!checkResult.goAvailable) {
      return {
        success: false,
        message: "Go toolchain is required but not available. Please install Go first: https://golang.org/doc/install",
        error: new Error("Go not available"),
      };
    }

    // Install Plakar
    const installResult = await PlakarInstaller.install({
      verbose: true,
      ...options,
    });

    // Update binary path if installation was successful and custom path was used
    if (installResult.success && installResult.path && options.installPath) {
      this.binaryPath = installResult.path;
    }

    return installResult;
  }

  /**
   * Get installation instructions
   */
  static getInstallInstructions(): string {
    return PlakarInstaller.getInstallInstructions();
  }

  /**
   * Uninstall Plakar CLI
   */
  async uninstallPlakar(): Promise<InstallResult> {
    return PlakarInstaller.uninstall(this.binaryPath === "plakar" ? undefined : this.binaryPath);
  }

  /**
   * Raw command execution for advanced usage
   */
  async raw(args: string[], options: CommonOptions = {}): Promise<CommandResult> {
    // Check if Plakar is available before executing command
    const checkResult = await this.checkInstallation();
    if (!checkResult.installed) {
      throw new Error(`Plakar CLI is not installed. Run 'ensureInstalled()' first or install manually using: ${PlakarInstaller.getInstallInstructions()}`);
    }

    return this.executeCommand(args, options);
  }
}
