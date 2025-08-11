# Command Check Fix Push

- Can you review latest PR
- Check for any failed github actions
- Check for any coderabbitai comments (including nested) that are still unresolved
- Resolve all outstanding comments
- If PSake isn't installed: Install-Module PSake -Scope CurrentUser (run in PowerShell)
- Invoke-psake CI
- Run Invoke-psake as many times as needed to resolve all errors
- Commit changes
- Push
