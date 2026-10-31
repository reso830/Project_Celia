// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const releaseDocuments = [
  "README.md",
  "CHANGELOG.md",
  "docs/feature_roadmap.md",
  "docs/REPO_MAP.md",
  "specs/v3-001-core-tracking/quickstart.md",
];

function documentText(file: string) {
  return readFileSync(path.join(root, file), "utf8");
}

describe("release documentation", () => {
  it("keeps the release version and commands in sync", () => {
    const packageJson = JSON.parse(documentText("package.json")) as {
      version: string;
      scripts: Record<string, string>;
    };
    const packageLock = JSON.parse(documentText("package-lock.json")) as {
      version: string;
      packages: { "": { version: string } };
    };

    expect(packageJson.version).toBe("3.0.0");
    expect(packageLock.version).toBe("3.0.0");
    expect(packageLock.packages[""].version).toBe("3.0.0");
    for (const command of [
      "dev",
      "lint",
      "format:check",
      "typecheck",
      "test",
      "build",
    ]) {
      expect(packageJson.scripts).toHaveProperty(command);
    }
  });

  it("documents the local database consistently without v2 references", () => {
    const content = releaseDocuments.map(documentText).join("\n");
    expect(content).toContain("CELIA_DB_PATH");
    expect(content).toContain("./data/celia.db");
    expect(content).not.toMatch(
      /fake-indexeddb|\/dev\b|\/settings\b|\/transactions\b/i,
    );
  });

  it("has resolving relative links in each release document", () => {
    for (const file of releaseDocuments) {
      const links = [
        ...documentText(file).matchAll(/\]\(([^)#]+)(?:#[^)]+)?\)/g),
      ];
      for (const [, target] of links) {
        if (/^[a-z]+:/i.test(target)) continue;
        expect(existsSync(path.resolve(root, path.dirname(file), target))).toBe(
          true,
        );
      }
    }
  });
});
