import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import * as path from "path";

export interface PackageRef {
  id: string;
  version: string;
  file: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function extractFromCsproj(content: string, filePath: string): PackageRef[] {
  const packages: PackageRef[] = [];
  try {
    const parsed = parser.parse(content);
    const itemGroups = parsed?.Project?.ItemGroup;
    if (!itemGroups) return packages;

    const groups = Array.isArray(itemGroups) ? itemGroups : [itemGroups];
    for (const group of groups) {
      const refs = group.PackageReference;
      if (!refs) continue;
      const refList = Array.isArray(refs) ? refs : [refs];
      for (const ref of refList) {
        const id = ref["@_Include"];
        const version = ref["@_Version"] || ref.Version;
        if (id && version) {
          packages.push({ id, version, file: filePath });
        }
      }
    }
  } catch {
    // Skip unparseable files
  }
  return packages;
}

function extractFromPackagesConfig(content: string, filePath: string): PackageRef[] {
  const packages: PackageRef[] = [];
  try {
    const parsed = parser.parse(content);
    const pkgs = parsed?.packages?.package;
    if (!pkgs) return packages;
    const pkgList = Array.isArray(pkgs) ? pkgs : [pkgs];
    for (const pkg of pkgList) {
      const id = pkg["@_id"];
      const version = pkg["@_version"];
      if (id && version) {
        packages.push({ id, version, file: filePath });
      }
    }
  } catch {
    // Skip unparseable files
  }
  return packages;
}

function globFiles(dir: string, patterns: string[]): string[] {
  const results: string[] = [];
  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "bin" || entry.name === "obj") continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        for (const pattern of patterns) {
          if (entry.name.endsWith(pattern) || entry.name === pattern) {
            results.push(fullPath);
            break;
          }
        }
      }
    }
  }
  walk(dir);
  return results;
}

export function findAllPackages(workDir: string): PackageRef[] {
  const files = globFiles(workDir, [".csproj", "Directory.Packages.props", "packages.config"]);
  const allPackages: PackageRef[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const relPath = path.relative(workDir, file);

    if (file.endsWith(".csproj") || file.endsWith("Directory.Packages.props")) {
      allPackages.push(...extractFromCsproj(content, relPath));
    } else if (file.endsWith("packages.config")) {
      allPackages.push(...extractFromPackagesConfig(content, relPath));
    }
  }

  // Deduplicate by id@version
  const seen = new Set<string>();
  return allPackages.filter((p) => {
    const key = `${p.id}@${p.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
