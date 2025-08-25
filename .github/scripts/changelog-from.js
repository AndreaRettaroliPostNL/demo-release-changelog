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

// Use conventional-changelog with proper configuration
const preset = fs.existsSync(path.join(process.cwd(), ".versionrc.json"))
  ? "-p conventionalcommits"
  : "-p conventionalcommits";

let changelogContent = "";

if (prevTag) {
  // Generate changelog for the specific range using conventional-changelog
  console.log(`Generating changelog from ${prevTag} to ${currentTag}`);
  
  try {
    // Check if there are commits in the range
    const commits = sh(`git rev-list ${prevTag}..${currentTag} --reverse`).split('\n').filter(Boolean);
    
    if (commits.length === 0) {
      console.log("No commits found between tags, creating empty changelog entry.");
      const versionWithoutV = currentTag.replace(/^v/, '');
      const today = new Date().toISOString().split('T')[0];
      changelogContent = `## [${versionWithoutV}] - ${today}\n\n*No notable changes*\n\n`;
    } else {
      console.log(`Found ${commits.length} commits, generating changelog with conventional-changelog...`);
      
      // Use conventional-changelog to generate changelog for the last 2 releases
      // This approach works without needing git checkout and captures commits properly
      const cmd = `npx conventional-changelog ${preset} --pkg package.json -r 2`;
      console.log(`Running: ${cmd}`);
      
      const conventionalOutput = sh(cmd);
      
      if (conventionalOutput && conventionalOutput.trim()) {
        console.log("✅ conventional-changelog succeeded!");
        
        // Extract only the section for our target version
        const versionWithoutV = currentTag.replace(/^v/, '');
        const lines = conventionalOutput.split('\n');
        let inTargetVersion = false;
        let targetVersionLines = [];
        
        for (const line of lines) {
          // Check if this is the start of our target version
          if (line.includes(`[${versionWithoutV}]`) && line.startsWith('## ')) {
            inTargetVersion = true;
            // Fix the header format
            const today = new Date().toISOString().split('T')[0];
            targetVersionLines.push(`## [${versionWithoutV}] - ${today}`);
            continue;
          }
          
          // Check if this is the start of a different version (stop collecting)
          // Skip empty version headers like ## []
          if (line.startsWith('## [') && !line.includes(`[${versionWithoutV}]`) && !line.includes('## []')) {
            break;
          }
          
          // Collect lines for our target version
          if (inTargetVersion) {
            targetVersionLines.push(line);
          }
        }
        
        if (targetVersionLines.length > 1) {
          changelogContent = targetVersionLines.join('\n').trim();
          console.log("Changelog content extracted successfully from conventional-changelog");
        } else {
          console.log("Target version not found in conventional-changelog output, creating empty entry");
          const today = new Date().toISOString().split('T')[0];
          changelogContent = `## [${versionWithoutV}] - ${today}\n\n*No notable changes*\n\n`;
        }
      } else {
        console.log("conventional-changelog produced no output, creating empty entry");
        const versionWithoutV = currentTag.replace(/^v/, '');
        const today = new Date().toISOString().split('T')[0];
        changelogContent = `## [${versionWithoutV}] - ${today}\n\n*No notable changes*\n\n`;
      }
    }
  } catch (error) {
    console.error("Error generating changelog with conventional-changelog:", error.message);
    process.exit(1);
  }
} else {
  // First release, generate full changelog using conventional-changelog
  console.log("First release detected, generating full changelog...");
  const cmd = `npx conventional-changelog ${preset} -i CHANGELOG.md -s -r 0`;
  console.log(`Running: ${cmd}`);
  
  try {
    sh(cmd);
    console.log("CHANGELOG.md updated successfully for first release.");
    process.exit(0);
  } catch (error) {
    console.error("Error generating changelog:", error.message);
    process.exit(1);
  }
}

// Process and clean up the generated changelog content
if (changelogContent) {
  const versionWithoutV = currentTag.replace(/^v/, '');
  const today = new Date().toISOString().split('T')[0];
  
  // Clean up the changelog content and ensure proper version header
  let cleanContent = changelogContent
    .replace(/^##\s*\[?\]?\s*\([^)]*\)\s*\(\d{4}-\d{2}-\d{2}\)/m, `## [${versionWithoutV}] - ${today}`)
    .replace(/^##\s+\(\d{4}-\d{2}-\d{2}\)/m, `## [${versionWithoutV}] - ${today}`)
    .replace(/^##\s*$/m, `## [${versionWithoutV}] - ${today}`)
    .replace(/^##\s*\[\]\s*\([^)]*\)/m, `## [${versionWithoutV}] - ${today}`)
    .trim();
  
  // If no proper header was found, add one
  if (!cleanContent.startsWith('##')) {
    cleanContent = `## [${versionWithoutV}] - ${today}\n\n${cleanContent}`;
  }
  
  // Ensure there's content after the header
  if (cleanContent === `## [${versionWithoutV}] - ${today}`) {
    cleanContent += '\n\n*No notable changes*\n';
  }
  
  // Read existing changelog
  let existingChangelog = "";
  if (fs.existsSync('CHANGELOG.md')) {
    existingChangelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  }
  
  // Find where to insert (after the title/header section but before any existing version)
  const lines = existingChangelog.split('\n');
  let insertIndex = 0;
  
  // Skip title and intro sections, but stop at first version entry
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## [') || line.match(/^##\s+\d+\.\d+\.\d+/)) {
      // Found an existing version entry, insert before it
      break;
    }
    if (line.startsWith('# ') || line.includes('Changelog') || 
        line.includes('Keep a Changelog') || line.includes('Semantic Versioning') ||
        line === '' || line.startsWith('The format is') ||
        line.startsWith('and this project')) {
      insertIndex = i + 1;
    }
  }
  
  // Remove any duplicate entries for the same version
  const filteredLines = [];
  let skipSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is the start of the version we're adding
    if (line.startsWith(`## [${versionWithoutV}]`) || line.startsWith(`## ${versionWithoutV}`)) {
      skipSection = true;
      continue;
    }
    
    // Check if this is the start of a different version section
    if (line.startsWith('## [') && !line.startsWith(`## [${versionWithoutV}]`)) {
      skipSection = false;
    }
    
    // Only add lines if we're not skipping this section
    if (!skipSection) {
      filteredLines.push(line);
    }
  }
  
  // Insert the new changelog content
  filteredLines.splice(insertIndex, 0, '', cleanContent, '');
  
  fs.writeFileSync('CHANGELOG.md', filteredLines.join('\n'));
  console.log("CHANGELOG.md updated successfully.");
} else {
  console.log("No changelog content generated.");
}
