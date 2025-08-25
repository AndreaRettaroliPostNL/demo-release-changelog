#!/usr/bin/env node
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

// Get the current tag from environment variables
const currentTag = process.env.GITHUB_REF_NAME || process.env.RELEASE_TAG || "";
if (!currentTag) {
  console.error(
    "No current tag provided. Set GITHUB_REF_NAME or RELEASE_TAG environment variable."
  );
  process.exit(1);
}

console.log(`Processing changelog for tag: ${currentTag}`);

// Check if the tag exists
try {
  sh(`git rev-parse ${currentTag}`);
} catch (error) {
  console.error(`Tag ${currentTag} does not exist in the repository.`);
  process.exit(1);
}

// Find previous tag (sorted by version)
const tags = sh("git tag --list --sort=-v:refname").split("\n").filter(Boolean);
const currentIdx = tags.indexOf(currentTag);

if (currentIdx === -1) {
  console.error(`Current tag ${currentTag} not found in tag list.`);
  process.exit(1);
}

const prevTag = currentIdx < tags.length - 1 ? tags[currentIdx + 1] : "";

console.log(`Previous tag: ${prevTag || "none (first release)"}`);

// Build conventional-changelog command for a specific range
const preset = fs.existsSync(path.join(process.cwd(), ".versionrc.json"))
  ? ""
  : "-p conventionalcommits";

// Generate the changelog for this specific tag range only
const cmd = prevTag
  ? `npx conventional-changelog ${preset} -i CHANGELOG.md -s --from ${prevTag} --to ${currentTag}`
  : `npx conventional-changelog ${preset} -i CHANGELOG.md -s -r 0`;

console.log(`Running: ${cmd}`);

try {
  sh(cmd);
  
  // Post-process the changelog to fix the version header
  let changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  
  // Replace the empty version header with the actual tag
  const versionWithoutV = currentTag.replace(/^v/, '');
  const today = new Date().toISOString().split('T')[0];
  
  // Look for the pattern "##  (YYYY-MM-DD)" and replace with proper version
  changelog = changelog.replace(
    /^##\s+\(\d{4}-\d{2}-\d{2}\)/m,
    `## [${versionWithoutV}] - ${today}`
  );
  
  fs.writeFileSync('CHANGELOG.md', changelog);
  
  console.log("CHANGELOG.md updated successfully.");
} catch (error) {
  console.error("Error generating changelog:", error.message);
  process.exit(1);
}
