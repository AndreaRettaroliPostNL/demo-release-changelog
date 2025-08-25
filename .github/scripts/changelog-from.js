#!/usr/bin/env node
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const currentTag = process.env.GITHUB_REF_NAME || process.env.RELEASE_TAG || "";
if (!currentTag) {
  console.error(
    "No current tag provided. Set GITHUB_REF_NAME via release event."
  );
  process.exit(1);
}

// Find previous tag (sorted by version)
const tags = sh("git tag --list --sort=-v:refname").split("\n").filter(Boolean);
const currentIdx = tags.indexOf(currentTag);
const prevTag = currentIdx === -1 ? tags[1] || "" : tags[currentIdx + 1] || "";

// Build conventional-changelog command for a specific range
const preset = fs.existsSync(path.join(process.cwd(), ".versionrc.json"))
  ? ""
  : "-p conventionalcommits";

const rangeArgs = prevTag
  ? `--from ${prevTag} --to ${currentTag}`
  : `--tag ${currentTag}`;

const cmd = `npx conventional-changelog ${preset} -i CHANGELOG.md -s ${rangeArgs}`;
console.log(`Running: ${cmd}`);
sh(cmd);

console.log("CHANGELOG.md updated.");
