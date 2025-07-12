import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * Plakar CLI Installer
 * 
 * This module provides functions to check, install, and manage the Plakar CLI tool.
 * It uses Go for installation and provides options for custom paths and versions.
 */

const execAsync = promisify(exec);

/**
 * Plakar CLI Installer namespace
 */
namespace PlakarInstaller{

  /**
   * Installation options for Plakar CLI
   */
  export interface Options {
    /** Force reinstallation even if already installed */
    force?: boolean;
    /** Custom installation path */
    installPath?: string;
    /** Specific version to install (default: latest) */
    version?: string;
    /** Timeout for installation in milliseconds */
    timeout?: number;
    /** Show installation progress */
    verbose?: boolean;
  }

  /**
   * Installation result
   */
  export interface Result {
    /** Whether installation was successful */
    success: boolean;
    /** Installation message */
    message: string;
    /** Installed version */
    version?: string;
    /** Installation path */
    path?: string;
    /** Any error that occurred */
    error?: Error;
  }

  /**
   * Check result for Plakar CLI
   */
  export interface CheckResult {
    /** Whether Plakar CLI is installed */
    installed: boolean;
    /** Path to the binary */
    path?: string;
    /** Version of installed Plakar */
    version?: string;
    /** Whether Go is available for installation */
    goAvailable: boolean;
    /** Any error that occurred during check */
    error?: Error;
  }

}

/**
 * Plakar CLI installer utility
 */
class PlakarInstaller {
  /**
   * Check if Plakar CLI is installed and available
   */
  static async check(binaryPath?: string): Promise<PlakarInstaller.CheckResult> {
    const result: PlakarInstaller.CheckResult = {
      installed: false,
      goAvailable: false,
    };

    try {
      // Check if Go is available
      try {
        await execAsync("go version", { timeout: 5000 });
        result.goAvailable = true;
      } catch {
        result.goAvailable = false;
      }

      // Check if Plakar is installed
      const plakarPath = binaryPath || "plakar";

      try {
        const { stdout } = await execAsync(`${plakarPath} version`, { timeout: 10000 });
        result.installed = true;
        result.path = plakarPath;

        // Parse version from output
        const versionMatch = stdout.match(/plakar\/(.+)/);
        if (versionMatch) {
          result.version = versionMatch[1]?.trim();
        }
      } catch (error) {
        // Try to find in common paths
        const commonPaths = [join(homedir(), "go", "bin", "plakar"), "/usr/local/bin/plakar", "/usr/bin/plakar"];

        for (const path of commonPaths) {
          if (existsSync(path)) {
            try {
              const { stdout } = await execAsync(`${path} version`, { timeout: 10000 });
              result.installed = true;
              result.path = path;

              const versionMatch = stdout.match(/plakar\/(.+)/);
              if (versionMatch) {
                result.version = versionMatch[1]?.trim();
              }
              break;
            } catch {
              // Continue searching
            }
          }
        }

        if (!result.installed) {
          result.error = error as Error;
        }
      }
    } catch (error) {
      result.error = error as Error;
    }

    return result;
  }

  /**
   * Install Plakar CLI using Go
   */
  static async install(options: PlakarInstaller.Options = {}): Promise<PlakarInstaller.Result> {
    const result: PlakarInstaller.Result = {
      success: false,
      message: "",
    };

    try {
      // Check if Go is available
      try {
        await execAsync("go version", { timeout: 5000 });
      } catch (error) {
        result.error = new Error("Go is not installed or not available in PATH. Please install Go first: https://golang.org/doc/install");
        result.message = "Go toolchain is required for installation";
        return result;
      }

      // Check if already installed (unless force is specified)
      if (!options.force) {
        const checkResult = await this.check();
        if (checkResult.installed) {
          result.success = true;
          result.message = `Plakar is already installed at ${checkResult.path} (version: ${checkResult.version})`;
          result.version = checkResult.version;
          result.path = checkResult.path;
          return result;
        }
      }

      // Determine installation command
      const version = options.version || "latest";
      const installCommand = `go install github.com/PlakarKorp/plakar/cmd/plakar@${version}`;

      if (options.verbose) {
        console.log(`Installing Plakar CLI: ${installCommand}`);
      }

      // Execute installation
      const timeout = options.timeout || 120000; // 2 minutes default
      const { stdout, stderr } = await execAsync(installCommand, {
        timeout,
        env: {
          ...process.env,
          ...(options.installPath && { GOBIN: options.installPath }),
        },
      });

      if (options.verbose && (stdout || stderr)) {
        console.log("Installation output:", stdout || stderr);
      }

      // Verify installation
      const checkResult = await this.check(options.installPath ? join(options.installPath, "plakar") : undefined);

      if (checkResult.installed) {
        result.success = true;
        result.message = `Plakar CLI installed successfully at ${checkResult.path}`;
        result.version = checkResult.version;
        result.path = checkResult.path;

        // Add to PATH suggestion if installed in custom location
        if (options.installPath && !process.env["PATH"]?.includes(options.installPath)) {
          result.message += `\n\nNote: Add ${options.installPath} to your PATH environment variable to use 'plakar' command globally.`;
        } else if (checkResult.path?.includes(join(homedir(), "go", "bin")) && !process.env["PATH"]?.includes(join(homedir(), "go", "bin"))) {
          result.message += `\n\nNote: Add ${join(homedir(), "go", "bin")} to your PATH environment variable to use 'plakar' command globally.`;
        }
      } else {
        result.error = new Error("Installation completed but Plakar CLI is not accessible");
        result.message = "Installation may have failed - Plakar CLI not found after installation";
      }
    } catch (error) {
      result.error = error as Error;
      result.message = `Installation failed: ${(error as Error).message}`;
    }

    return result;
  }

  /**
   * Get installation instructions for manual installation
   */
  static getInstallInstructions(): string {
    return `
To install Plakar CLI manually:

1. Install Go if not already installed:
   - macOS: brew install go
   - Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y golang
   - Other systems: https://golang.org/doc/install

2. Install Plakar CLI:
   go install github.com/PlakarKorp/plakar/cmd/plakar@latest

3. Add Go bin directory to PATH (if not already done):
   export PATH=$PATH:$(go env GOPATH)/bin

4. Verify installation:
   plakar version

For more information, visit: https://docs.plakar.io/en/quickstart/
`;
  }

  /**
   * Auto-setup Plakar CLI with interactive prompts
   */
  static async autoSetup(options: PlakarInstaller.Options = {}): Promise<PlakarInstaller.Result> {
    const checkResult = await this.check();

    if (checkResult.installed && !options.force) {
      return {
        success: true,
        message: `Plakar CLI is already installed and ready to use (version: ${checkResult.version})`,
        version: checkResult.version,
        path: checkResult.path,
      };
    }

    if (!checkResult.goAvailable) {
      return {
        success: false,
        message: "Go toolchain is required but not available. Please install Go first.",
        error: new Error("Go not available"),
      };
    }

    // Proceed with installation
    const installResult = await this.install({
      ...options,
      verbose: options.verbose ?? true,
    });

    return installResult;
  }

  /**
   * Uninstall Plakar CLI
   */
  static async uninstall(binaryPath?: string): Promise<PlakarInstaller.Result> {
    const result: PlakarInstaller.Result = {
      success: false,
      message: "",
    };

    try {
      const checkResult = await this.check(binaryPath);

      if (!checkResult.installed) {
        result.success = true;
        result.message = "Plakar CLI is not installed";
        return result;
      }

      if (!checkResult.path) {
        result.error = new Error("Cannot determine Plakar CLI installation path");
        result.message = "Unable to locate Plakar CLI for uninstallation";
        return result;
      }

      // Use Go clean command for Go-installed binaries
      try {
        await execAsync("go clean -i github.com/PlakarKorp/plakar/cmd/plakar", { timeout: 30000 });
        result.success = true;
        result.message = "Plakar CLI uninstalled successfully";
      } catch (error) {
        // Fallback: try to remove the binary directly
        try {
          const { unlink } = await import("fs/promises");
          await unlink(checkResult.path);
          result.success = true;
          result.message = `Plakar CLI binary removed from ${checkResult.path}`;
        } catch (unlinkError) {
          result.error = error as Error;
          result.message = `Failed to uninstall Plakar CLI: ${(error as Error).message}`;
        }
      }
    } catch (error) {
      result.error = error as Error;
      result.message = `Uninstallation failed: ${(error as Error).message}`;
    }

    return result;
  }
}

export { PlakarInstaller };

/**
 * Convenience functions for common operations
 */

/**
 * Quick check if Plakar CLI is available
 */
export async function isPlakarInstalled(binaryPath?: string): Promise<boolean> {
  const result = await PlakarInstaller.check(binaryPath);
  return result.installed;
}

/**
 * Install Plakar CLI with default options
 */
export async function installPlakar(options?: PlakarInstaller.Options): Promise<PlakarInstaller.Result> {
  return PlakarInstaller.install(options);
}

/**
 * Auto-setup Plakar CLI with installation if needed
 */
export async function ensurePlakarInstalled(options?: PlakarInstaller.Options): Promise<PlakarInstaller.Result> {
  return PlakarInstaller.autoSetup(options);
}
