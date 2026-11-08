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
  "specs/v3-002-entries/quickstart.md",
  "specs/v3-003-budget-and-savings/quickstart.md",
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

    expect(packageJson.version).toBe("3.2.0");
    expect(packageLock.version).toBe("3.2.0");
    expect(packageLock.packages[""].version).toBe("3.2.0");
    for (const command of [
      "dev",
      "lint",
      "format:check",
      "typecheck",
      "test",
      "build",
      "seed",
      "clear",
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

  it("documents the F03 release and its implementation map", () => {
    expect(documentText("README.md")).toContain("Version 3.2.0");
    for (const route of ["/savings", "/models"])
      expect(documentText("README.md")).toContain(route);
    expect(documentText("CHANGELOG.md")).toContain(
      "## 3.2.0 \u2014 2026-11-08",
    );
    expect(documentText("docs/feature_roadmap.md")).toMatch(
      /F03[^\n]*\u2713 Complete[^\n]*features\/v3-003-budget-and-savings\.md/,
    );
    const map = documentText("docs/REPO_MAP.md");
    for (const moduleFile of [
      "month.ts",
      "savings.ts",
      "savings-calculations.ts",
      "budget.ts",
      "budget-calculations.ts",
    ])
      expect(map).toContain(`src/domain/${moduleFile}`);
    for (const moduleFile of [
      "savings-store.ts",
      "savings-service.ts",
      "savings-read.ts",
      "models-store.ts",
      "models-service.ts",
      "models-read.ts",
    ])
      expect(map).toContain(`src/server/${moduleFile}`);
    for (const area of [
      "src/app/api/savings",
      "src/app/api/models",
      "src/app/api/monthly-plans",
      "src/components/savings",
      "src/components/models",
    ])
      expect(map).toContain(area);
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
