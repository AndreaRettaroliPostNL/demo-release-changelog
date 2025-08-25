# Changelog Automation

This repository uses automated changelog generation based on Git tags and conventional commits.

## How it works

1. **Conventional Commits**: All commits should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
2. **Git Tags**: When you create a new tag (e.g., `v1.0.0`), the automation will generate a changelog entry.
3. **GitHub Releases**: The workflow can be triggered by both tag pushes and GitHub releases.

## Workflows

### 1. `generate-changelog.yml` (Main Workflow)
- **Triggers**: 
  - GitHub releases (`published`)
  - Tag pushes (`v*`)
- **Function**: Generates changelog and commits it back to the main branch
- **Use case**: For releases created through GitHub UI

### 2. `tag-changelog.yml` (Tag-only Workflow)
- **Triggers**: Tag pushes (`v*`)
- **Function**: Generates changelog when tags are pushed directly
- **Use case**: For manual tag creation via git

## Usage

### Method 1: Using GitHub Releases (Recommended)
1. Go to GitHub → Releases → "Create a new release"
2. Choose or create a new tag (e.g., `v1.0.0`)
3. Add release title and description
4. Publish the release
5. The workflow will automatically update `CHANGELOG.md`

### Method 2: Manual Tag Creation
1. Create and push a tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. The workflow will automatically update `CHANGELOG.md`

## Changelog Format

The generated changelog follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
## [1.0.0] - 2025-08-25

### Features
* feat(api): add new endpoint for user management

### Bug Fixes  
* fix(auth): resolve token validation issue

### Documentation
* docs(readme): update installation instructions
```

## Conventional Commit Types

The following commit types are supported (configured in `.versionrc.json`):

- `feat`: New features
- `fix`: Bug fixes
- `perf`: Performance improvements
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

## Configuration

### `.versionrc.json`
Contains the configuration for conventional changelog:
- Defines which commit types appear in the changelog
- Maps commit types to changelog sections
- Controls commit type visibility

### Custom Script
The `/.github/scripts/changelog-from.js` script:
- Handles tag range detection
- Generates changelog for specific version ranges
- Post-processes the changelog format

## Troubleshooting

### No changelog entry generated
- Ensure commits follow conventional commit format
- Check that the tag exists and is properly formatted (`v*`)
- Verify that there are commits between the current and previous tag

### Workflow fails
- Check that the repository has write permissions for GitHub Actions
- Ensure all required dependencies are in `package.json`
- Review the workflow logs for specific error messages

## Manual Changelog Generation

You can also generate the changelog manually:

```bash
# For a specific tag
RELEASE_TAG=v1.0.0 node .github/scripts/changelog-from.js

# Or using npm script
npm run changelog:from
```
