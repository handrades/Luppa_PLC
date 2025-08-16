# Command Check Fix Push

- Can you review latest PR
- Check for any failed github actions
- Check for any coderabbitai comments (including nested) that are still unresolved
- Resolve all outstanding comments
- If PSake isn't installed: Install-Module PSake -Scope CurrentUser (run in PowerShell)
- Run 'invoke-psake CICollectAll' and successfully resolved all linting errors and test failures
- you can run psake as many times as you need to solve all errors/failures
- Commit changes
- Push
