# Linting Workflows

This document describes the matching lint workflows available for both local development (psake) and continuous integration (GitHub Actions).

## Overview

Both workflows perform identical linting checks across multiple file types:

- **Markdown files** (`.md`) - Using markdownlint
- **JSON files** (`.json`) - Using jsonlint  
- **YAML files** (`.yml`, `.yaml`) - Using yaml-lint
- **TypeScript/JavaScript files** - Using pnpm workspace lint scripts

## Local Development (psake)

### Prerequisites

Install required tools as project dependencies:

```powershell
# Install Node.js dependencies (includes all linting tools)
pnpm install

# Verify psake is installed
Install-Module -Name psake -Scope CurrentUser
```

**Note:** The project uses pinned versions of all linting tools as Node.js dev dependencies to ensure reproducibility. All tools are available via local scripts rather than global installs.

### Available Tasks

| Task | Alias | Description |
|------|-------|-------------|
| `Invoke-psake` | | Run all linting checks (default) |
| `Invoke-psake Lint` | | Run all linting checks |
| `Invoke-psake Markdown` | `md` | Run only markdown linting |
| `Invoke-psake Json` | | Run only JSON linting |
| `Invoke-psake Yaml` | `yml` | Run only YAML linting |
| `Invoke-psake TypeScript` | `ts` | Run only TypeScript/JavaScript linting |
| `Invoke-psake FixMarkdown` | `fix-md` | Run markdown linting with auto-fix |
| `Invoke-psake CheckDependencies` | | Check if all tools are installed |
| `Invoke-psake CI` | | Run complete CI checks (dependencies + all linting) |
| `Invoke-psake ?` | `help` | Show available tasks |

### Usage Examples

```powershell
# Run all linting checks
Invoke-psake

# Run only markdown linting
Invoke-psake Markdown

# Fix markdown issues automatically
Invoke-psake FixMarkdown

# Check if all dependencies are installed
Invoke-psake CheckDependencies

# Run CI checks (matches GitHub workflow)
Invoke-psake CI

# Show help
Invoke-psake ?
```

## GitHub Actions Workflow

### Trigger Events

The GitHub workflow runs on:

- Push to `main`, `master`, or `develop` branches
- Pull requests targeting `main`, `master`, or `develop` branches  
- Manual workflow dispatch

### Workflow Steps

1. **Setup Environment**
   - Checkout repository
   - Setup Node.js v20.x
   - Setup pnpm package manager

2. **Install Dependencies**
   - Install all linting tools via pnpm (includes markdownlint-cli, jsonlint, yaml-lint with pinned versions)

3. **Run Linting Checks**
   - Lint all markdown files (excluding node_modules and .bmad-core)
   - Lint all JSON files (excluding node_modules and .bmad-core)
   - Lint all YAML files (excluding node_modules and .bmad-core)
   - Lint TypeScript/JavaScript files using pnpm workspace scripts

4. **Report Results**
   - Display summary of all completed checks

### File Exclusions

Both workflows exclude the same directories:

- `node_modules/`
- `.bmad-core/`

## Workflow Matching

Both workflows are designed to produce identical results:

| Check Type | psake Command | GitHub Action Step |
|------------|---------------|-------------------|
| All Linting | `Invoke-psake` | Full workflow run |
| Dependencies | `Invoke-psake CheckDependencies` | Setup steps |
| Markdown | `Invoke-psake Markdown` | "Lint Markdown files" step |
| JSON | `Invoke-psake Json` | "Lint JSON files" step |
| YAML | `Invoke-psake Yaml` | "Lint YAML files" step |
| TypeScript/JS | `Invoke-psake TypeScript` | "Lint TypeScript/JavaScript files" step |
| CI Process | `Invoke-psake CI` | Complete workflow |

## Configuration Files

### Markdown Linting

- Configuration: `.markdownlint.json`
- Rules: Relaxed rules with 120 character line limit

### JSON Linting

- No configuration needed - validates JSON syntax

### YAML Linting

- Configuration: `config/.yaml-lint.json`
- Validates YAML syntax and formatting using yaml-lint

### TypeScript/JavaScript Linting

- Uses workspace-level lint scripts defined in `package.json`
- Leverages ESLint configuration in `.eslintrc.js`
- Prettier formatting rules in `.prettierrc`

## Best Practices

1. **Run locally before pushing**: Use `Invoke-psake` to catch issues early
2. **Fix markdown automatically**: Use `Invoke-psake FixMarkdown` for quick fixes
3. **Check dependencies**: Run `Invoke-psake CheckDependencies` after environment changes
4. **Use CI task for validation**: Run `Invoke-psake CI` to match GitHub workflow exactly

## Troubleshooting

### Missing Dependencies

If you see dependency errors, ensure all tools are installed as project dependencies:

```powershell
# Check what's missing
Invoke-psake CheckDependencies

# Reinstall project dependencies (includes all linting tools)
pnpm install
```

**Note:** All linting tools are installed as local project dependencies with pinned versions. Avoid global installs to ensure reproducibility and prevent environment pollution.

### PowerShell Execution Policy

If psake fails to run, update execution policy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### pnpm Not Found

Ensure pnpm is available. Use one of these options:

```powershell
# Option 1: Use npm/npx (recommended for CI environments)
npx pnpm --version

# Option 2: Install globally if needed for development
npm install -g pnpm
pnpm --version

# Option 3: Use Corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
```
