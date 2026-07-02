// Run by the npm `version` lifecycle script (see package.json). Takes the new
// version that `npm version` just wrote to package.json and mirrors it into
// manifest.json, plus records the version -> minAppVersion mapping in
// versions.json so older Obsidian installs resolve a compatible release.
import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;
if (!targetVersion) {
	throw new Error("npm_package_version is not set — run this via `npm version`.");
}

// Point manifest.json at the new version (keep its existing minAppVersion).
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// Record new version -> minAppVersion in versions.json.
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(`version-bump: set manifest to ${targetVersion} (minAppVersion ${minAppVersion})`);
