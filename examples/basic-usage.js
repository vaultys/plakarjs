const { Plakar } = require("../lib");

async function basicExample() {
  // Initialize Plakar with default settings
  const plakar = new Plakar();
  const result = await plakar.checkInstallation();
  if (!result.goAvailable) {
    console.log("Go is not installed. You should install it before. Exiting");
    return;
  }
  if (!result.installed) {
    await plakar.installPlakar({ verbose: true });
  }
  try {
    console.log("Starting Plakar example...");

    // Check if agent is running
    console.log("Checking agent status...");
    const agentStatus = await plakar.getAgentStatus();
    if (!agentStatus.running) {
      console.log("Starting agent...");
      await plakar.startAgent();
    } else {
      console.log(`Agent already running with PID: ${agentStatus.pid}`);
    }

    // Get version information
    console.log("Getting version info...");
    const version = await plakar.version();
    console.log(`Plakar version: ${version.version}`);
    console.log(`Importers: ${version.importers.join(", ")}`);

    // Create a repository (uncomment if you want to create a new one)
    const repoPath = "./test-backup-repo";
    console.log(`Creating repository at ${repoPath}...`);
    await plakar.createRepository(repoPath);

    // Use existing repository or current directory for demo
    //const repoPath = process.env.PLAKAR_REPOSITORY || "./test-backup-repo";

    // Create a backup of a small directory (create test directory first)
    const testDir = "./test-data";
    const fs = require("fs");
    const path = require("path");

    // Create test directory and files for demo
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, "file1.txt"), "Hello, Plakar!");
      fs.writeFileSync(path.join(testDir, "file2.txt"), "This is a test file.");
      fs.mkdirSync(path.join(testDir, "subdir"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "subdir", "file3.txt"), "Nested file content.");
    }

    console.log(`Creating backup of ${testDir}...`);
    const snapshotId = await plakar.backup(testDir, repoPath, {
      tag: "example-backup",
      exclude: ["*.tmp", "*.log"],
    });
    console.log(`Backup created with snapshot ID: ${snapshotId}`);

    // List all snapshots
    console.log("Listing snapshots...");
    const snapshots = await plakar.list(undefined, repoPath);
    console.log("Available snapshots:");
    let testPath = testDir;
    snapshots.forEach((snapshot) => {
      if (snapshotId === snapshot.id) {
        testPath = snapshot.path;
      }
      console.log(`  ${snapshot.id} - ${snapshot.timestamp} - ${snapshot.size} - ${snapshot.path}`);
    });

    // List contents of the snapshot
    console.log(`\nListing contents of snapshot ${snapshotId}...`);
    const contents = await plakar.list(`${snapshotId}:${testPath}`, repoPath, {
      recursive: true,
    });
    console.log("Snapshot contents:");
    contents.forEach((item) => {
      console.log(`  ${item.path || item.id}`);
    });

    // Display a file from the snapshot
    console.log("\nDisplaying file contents from snapshot...");
    try {
      const fileContent = await plakar.cat(`${snapshotId}:${testPath}/file1.txt`, repoPath);
      console.log("File content:", fileContent);
    } catch (error) {
      console.log("Could not read file (this is normal for demo):", error.message);
    }

    // Restore to a different location
    const restoreDir = "./restored-data";
    console.log(`\nRestoring snapshot to ${restoreDir}...`);
    try {
      await plakar.restore(`${snapshotId}:${testDir}`, repoPath, {
        to: restoreDir,
        rebase: true,
      });
      console.log("Restore completed successfully");

      // List restored files
      if (fs.existsSync(restoreDir)) {
        console.log("Restored files:");
        const restoredFiles = fs.readdirSync(restoreDir, { recursive: true });
        restoredFiles.forEach((file) => console.log(`  ${file}`));
      }
    } catch (error) {
      console.log("Restore failed (this might be expected in demo):", error.message);
    }

    // Get repository info
    console.log("\nGetting repository information...");
    try {
      const info = await plakar.info(undefined, repoPath);
      console.log("Repository info:");
      console.log(info);
    } catch (error) {
      console.log("Could not get repo info:", error.message);
    }

    // Check integrity of a snapshot
    console.log("\nChecking snapshot integrity...");
    try {
      await plakar.check(snapshotId, repoPath);
      console.log("Integrity check passed");
    } catch (error) {
      console.log("Integrity check failed:", error.message);
    }

    console.log("\nExample completed successfully!");
  } catch (error) {
    console.error("Error during example execution:", error.message);
    if (error.result) {
      console.error("Command output:", error.result.stderr || error.result.stdout);
    }
  }
}

// Advanced example with multiple repositories
async function advancedExample() {
  const plakar = new Plakar();

  try {
    console.log("\n=== Advanced Example: Multi-Repository Sync ===");

    const localRepo = "./local-repo";
    const remoteRepo = "./remote-repo"; // In real usage, this would be SFTP/S3 URL

    // Create two repositories for sync demo
    console.log("Setting up repositories...");
    try {
      await plakar.createRepository(localRepo, { noEncryption: true });
      await plakar.createRepository(remoteRepo, { noEncryption: true });
    } catch (error) {
      // Repositories might already exist
      console.log("Repositories may already exist, continuing...");
    }

    // Create backup in local repo
    const snapshotId = await plakar.backup("./test-data", localRepo, {
      tag: "sync-test",
    });
    console.log(`Created snapshot ${snapshotId} in local repository`);

    // Sync from local to remote
    console.log("Syncing repositories...");
    try {
      await plakar.sync(remoteRepo, localRepo, {
        direction: "to",
      });
      console.log("Sync completed successfully");

      // Verify sync by listing remote snapshots
      const remoteSnapshots = await plakar.list(undefined, remoteRepo);
      console.log(`Remote repository now has ${remoteSnapshots.length} snapshots`);
    } catch (error) {
      console.log("Sync failed:", error.message);
    }
  } catch (error) {
    console.error("Advanced example error:", error.message);
  }
}

// Configuration example
async function configurationExample() {
  const plakar = new Plakar();

  try {
    console.log("\n=== Configuration Example ===");

    // Create a named repository configuration
    console.log("Creating named repository configuration...");
    await plakar.configCreateRepository("example-s3", {
      name: "example-s3",
      location: "s3://example-bucket/backups",
      // Note: In real usage, you'd set actual credentials
      // accessKey: 'your-access-key',
      // secretAccessKey: 'your-secret-key'
    });
    console.log("Named repository configuration created");

    // Set as default repository
    await plakar.configSetDefaultRepository("example-s3");
    console.log("Set as default repository");
  } catch (error) {
    console.log("Configuration example error:", error.message);
  }
}

// Run examples
async function runExamples() {
  console.log("PlakarJS Examples\n");
  console.log("Note: Make sure Plakar CLI is installed and available in PATH");
  console.log("Install with: go install github.com/PlakarKorp/plakar/cmd/plakar@latest\n");

  await basicExample();
  await advancedExample();
  await configurationExample();

  console.log("\nAll examples completed!");
  console.log("\nCleanup: You may want to remove test directories:");
  console.log("  rm -rf test-data restored-data test-backup-repo local-repo remote-repo");
}

// Handle CLI execution
if (require.main === module) {
  basicExample().catch(console.error);
}

module.exports = {
  basicExample,
  advancedExample,
  configurationExample,
};
