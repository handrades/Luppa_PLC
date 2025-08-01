# GitHub Repository Setup Instructions

This document provides step-by-step instructions for configuring GitHub repository settings that cannot be automated through code.

## Branch Protection Rules

To configure branch protection for the main branch:

### 1. Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/handrades/Luppa_PLC`
2. Click on **Settings** tab
3. In the left sidebar, click **Branches**

### 2. Add Branch Protection Rule

1. Click **Add rule** button
2. In **Branch name pattern**, enter: `main`

### 3. Configure Protection Settings

Enable the following options:

#### Required Status Checks

- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- In the search box, add these required status checks:
  - `lint`
  - `type-check`
  - `test`
  - `build`

#### Pull Request Requirements

- ✅ **Require a pull request before merging**
- ✅ **Require approvals**: Set to `1`
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from code owners** (if you have a CODEOWNERS file)

#### Additional Restrictions

- ✅ **Restrict pushes that create files larger than 100 MB**
- ✅ **Require linear history** (recommended for clean git history)
- ✅ **Include administrators** (applies rules to repository admins)

### 4. Save Changes

Click **Create** to save the branch protection rule.

## Required Secrets

For the CI/CD workflows to function properly, configure these repository secrets:

### 1. Navigate to Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

### 2. Add Required Secrets

Add the following secrets (if needed for your specific setup):

- `CODECOV_TOKEN`: For code coverage reporting (if using private repo)
- `DOCKER_REGISTRY_TOKEN`: For Docker image pushing (if using private registry)

## GitHub Actions Permissions

Configure Actions permissions:

### 1. Navigate to Actions Settings

1. Go to **Settings** → **Actions** → **General**

### 2. Configure Permissions

- **Actions permissions**: Select "Allow enterprise, and select non-enterprise, actions and reusable workflows"
- **Fork pull request workflows**: Select "Require approval for first-time contributors"
- **Workflow permissions**: Select "Read and write permissions"
- ✅ **Allow GitHub Actions to create and approve pull requests**

## Dependabot Configuration

Dependabot is already configured via `.github/dependabot.yml`, but verify it's enabled:

### 1. Navigate to Security Settings

1. Go to **Settings** → **Security & analysis**
2. Ensure **Dependabot alerts** and **Dependabot security updates** are enabled

### 2. Configure Auto-merge (Optional)

For automatic merging of Dependabot PRs:

1. Go to **Settings** → **General**
2. Under **Pull Requests**, enable:
   - ✅ **Allow auto-merge**
   - ✅ **Automatically delete head branches**

## Verification Steps

After configuration, verify the setup:

### 1. Test Branch Protection

1. Create a test branch and push changes
2. Open a pull request to main
3. Verify that CI checks are required and must pass
4. Confirm that the PR cannot be merged until all status checks pass

### 2. Test Dependabot

1. Check if Dependabot creates PRs for outdated dependencies
2. Verify PRs are properly grouped according to configuration

### 3. Test Release Workflow

1. Create and push a version tag: `git tag v0.1.0 && git push origin v0.1.0`
2. Verify the release workflow runs and creates a GitHub release
3. Check that Docker images are built and pushed (if configured)

## Repository Settings Summary

Key settings configured:

- ✅ Branch protection on main branch
- ✅ Required CI status checks (lint, type-check, test, build)
- ✅ PR approval requirements
- ✅ Linear history enforcement
- ✅ Dependabot security updates
- ✅ GitHub Actions with proper permissions
- ✅ Auto-merge capability for Dependabot PRs

## Troubleshooting

### Common Issues

1. **Status checks not appearing**: Ensure the workflow has run at least once to register the job names
2. **Dependabot not creating PRs**: Check that security alerts are enabled and dependencies are actually outdated
3. **Release workflow not triggering**: Verify tag format matches `v*` pattern
4. **Docker builds failing**: Ensure GITHUB_TOKEN has package write permissions

### Getting Help

- Check GitHub Actions logs in the **Actions** tab
- Review branch protection settings if PRs can't be merged
- Verify Dependabot logs in **Security** → **Dependabot**
