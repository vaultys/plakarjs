import { Plakar } from "../plakar";
import { spawn } from "child_process";

// Mock child_process
jest.mock("child_process");
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock installer
jest.mock("../installer", () => ({
  PlakarInstaller: {
    check: jest.fn().mockResolvedValue({
      installed: true,
      path: "plakar",
      version: "v1.0.1",
      goAvailable: true,
    }),
  },
}));

describe("Plakar", () => {
  let plakar: Plakar;

  beforeEach(() => {
    plakar = new Plakar();
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default options", () => {
      const instance = new Plakar();
      expect(instance).toBeInstanceOf(Plakar);
    });

    it("should initialize with custom options", () => {
      const instance = new Plakar({
        binaryPath: "/custom/plakar",
        repository: "/custom/repo",
        defaultOptions: { quiet: true },
      });
      expect(instance).toBeInstanceOf(Plakar);
    });
  });

  describe("executeCommand", () => {
    it("should execute successful command", async () => {
      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback("test output");
            }
          }),
        },
        stderr: {
          on: jest.fn(),
        },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0); // Success exit code
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      const result = await plakar.raw(["version"]);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe("test output");
      expect(result.exitCode).toBe(0);
    });

    it("should handle command failure", async () => {
      const mockChild = {
        stdout: {
          on: jest.fn(),
        },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback("error message");
            }
          }),
        },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(1); // Error exit code
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      await expect(plakar.raw(["invalid-command"])).rejects.toThrow();
    });

    it("should handle spawn error", async () => {
      const mockChild = {
        stdout: {
          on: jest.fn(),
        },
        stderr: {
          on: jest.fn(),
        },
        on: jest.fn((event, callback) => {
          if (event === "error") {
            callback(new Error("spawn error"));
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      await expect(plakar.raw(["version"])).rejects.toThrow("Failed to execute plakar");
    });
  });

  describe("version", () => {
    it("should parse version output correctly", async () => {
      const versionOutput = `plakar/v1.0.1-main

importers: fs, ftp, s3, sftp, stdin
exporters: fs, ftp, s3, sftp, stderr, stdout
klosets: fs, http, https, ptar, s3, sftp, sqlite`;

      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback(versionOutput);
            }
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      const version = await plakar.version();
      expect(version.version).toBe("v1.0.1-main");
      expect(version.importers).toEqual(["fs", "ftp", "s3", "sftp", "stdin"]);
      expect(version.exporters).toEqual(["fs", "ftp", "s3", "sftp", "stderr", "stdout"]);
      expect(version.klosets).toEqual(["fs", "http", "https", "ptar", "s3", "sftp", "sqlite"]);
    });
  });

  describe("parseSnapshotList", () => {
    it("should parse snapshot list output correctly", async () => {
      const listOutput = `2025-02-19T21:38:16Z   9abc3294    3.1 MB      0s   /private/etc
2025-02-19T22:45:30Z   def56789    15.2 MB     2s   /home/user`;

      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback(listOutput);
            }
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      const snapshots = await plakar.list();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]).toEqual({
        id: "9abc3294",
        timestamp: "2025-02-19T21:38:16Z",
        size: "3.1 MB",
        duration: "0s",
        path: "/private/etc",
      });
      expect(snapshots[1]).toEqual({
        id: "def56789",
        timestamp: "2025-02-19T22:45:30Z",
        size: "15.2 MB",
        duration: "2s",
        path: "/home/user",
      });
    });
  });

  describe("backup", () => {
    it("should create backup and return snapshot ID", async () => {
      const backupOutput = `9abc3294: OK ✓ /private/etc/file1
9abc3294: OK ✓ /private/etc/file2
backup: created unsigned snapshot 9abc3294 of size 3.1 MB in 72.55875ms`;

      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback(backupOutput);
            }
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      const snapshotId = await plakar.backup("/private/etc");
      expect(snapshotId).toBe("9abc3294");
    });

    it("should build backup command with options", async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      await plakar.backup("/path", "/repo", {
        tag: "test",
        exclude: ["*.tmp", "*.log"],
        concurrency: 4,
        check: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        "plakar",
        expect.arrayContaining(["at", "/repo", "backup", "-concurrency", "4", "-exclude", "*.tmp", "-exclude", "*.log", "-check", "-tag", "test", "/path"]),
        expect.any(Object),
      );
    });
  });

  describe("buildCommandArgs", () => {
    it("should build command arguments correctly", async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      await plakar.raw(["test"], {
        config: "/config/path",
        cpu: 4,
        hostname: "testhost",
        keyfile: "/key/path",
        noAgent: true,
        quiet: true,
        trace: "all",
        username: "testuser",
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        "plakar",
        ["-username", "testuser", "-trace", "all", "-quiet", "-no-agent", "-keyfile", "/key/path", "-hostname", "testhost", "-cpu", "4", "-config", "/config/path", "test"],
        expect.any(Object),
      );
    });
  });

  describe("agent operations", () => {
    it("should start agent and parse PID", async () => {
      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback("agent started with pid=12539");
            }
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      const status = await plakar.startAgent();
      expect(status.running).toBe(true);
      expect(status.pid).toBe(12539);
    });

    it("should handle agent status when not running", async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(1); // Error exit code
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      const status = await plakar.getAgentStatus();
      expect(status.running).toBe(false);
      expect(status.pid).toBeUndefined();
    });
  });

  describe("restore", () => {
    it("should build restore command with options", async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      await plakar.restore("abc123:/path", "/repo", {
        to: "/restore/path",
        rebase: true,
        concurrency: 8,
        tag: "important",
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        "plakar",
        expect.arrayContaining(["at", "/repo", "restore", "-tag", "important", "-concurrency", "8", "-rebase", "-to", "/restore/path", "abc123:/path"]),
        expect.any(Object),
      );
    });
  });

  describe("list", () => {
    it("should build list command with filtering options", async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
        }),
      };

      mockSpawn.mockReturnValue(mockChild as any);

      await plakar.list("abc123:/path", "/repo", {
        uuid: true,
        tag: "daily",
        since: "7d",
        recursive: true,
        latest: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        "plakar",
        expect.arrayContaining(["at", "/repo", "ls", "-uuid", "-tag", "daily", "-latest", "-since", "7d", "-recursive", "abc123:/path"]),
        expect.any(Object),
      );
    });
  });
});
