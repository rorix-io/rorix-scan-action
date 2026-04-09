import { execSync } from "child_process";
import { PackageRef, findAllPackages } from "./find-packages";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Get only packages that were added or changed compared to the base branch.
 */
export function getDiffPackages(workDir: string, baseBranch: string): PackageRef[] {
  const currentPackages = findAllPackages(workDir);

  // Get the list of changed files
  let changedFiles: string[];
  try {
    const diff = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
      cwd: workDir,
      encoding: "utf-8",
    }).trim();
    changedFiles = diff ? diff.split("\n") : [];
  } catch {
    // If diff fails (e.g., shallow clone), scan all packages
    return currentPackages;
  }

  // Filter to only NuGet-relevant files
  const relevantFiles = changedFiles.filter(
    (f) => f.endsWith(".csproj") || f === "Directory.Packages.props" || f.endsWith("packages.config")
  );

  if (relevantFiles.length === 0) return [];

  // Get base branch packages for comparison
  let basePackages: PackageRef[] = [];
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rorix-base-"));
    for (const file of relevantFiles) {
      try {
        const content = execSync(`git show origin/${baseBranch}:${file}`, {
          cwd: workDir,
          encoding: "utf-8",
        });
        const destPath = path.join(tmpDir, file);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, content);
      } catch {
        // File didn't exist in base branch — all its packages are new
      }
    }
    basePackages = findAllPackages(tmpDir);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // If we can't get base packages, treat all as new
    return currentPackages;
  }

  const baseSet = new Set(basePackages.map((p) => `${p.id}@${p.version}`));
  return currentPackages.filter((p) => !baseSet.has(`${p.id}@${p.version}`));
}
