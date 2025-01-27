# Form Dependency Handling Reference

## Core Issues & Solutions

### 1. Radio Button Dependencies
Problem: Dependencies not triggering when radio buttons clicked
Solution: Proper handling of $ to _ conversion in field names

Reference: 

### 2. Nested Dependencies
Problem: Child dependencies not showing when parent dependencies triggered
Solution: Added parent dependency lookup and recursive traversal

Reference:

### 3. Dependency Cleanup
Problem: Fields remained visible when toggling between Y/N
Solution: Added comprehensive cleanup of all dependent fields

Reference:

### 4. Form State Management
Problem: Form state retained for hidden fields
Solution: Added form state cleanup when removing fields

Reference:

### 5. Recursive Dependencies
Problem: Nested dependencies not properly tracked
Solution: Added recursive dependency collection

Reference:

### 6. Dropdown Dependencies
Problem: Dropdown dependencies not showing when selection made
Solution: Added specific handling for dropdown dependency keys and cleanup

Reference:

## Best Practices

1. Always handle both Y and N dependencies
2. Clean up form state when removing fields
3. Check for parent dependencies first
4. Use recursive functions for nested dependencies
5. Maintain proper field order when adding/removing
6. Handle both direct and nested dependencies in getAllDependentFields
7. Use correct dependency key format for different field types

## Common Gotchas

1. Forgetting to normalize field names ($ vs _)
2. Not cleaning up child dependencies
3. Missing parent dependency lookups
4. Improper form state management
5. Incorrect dependency key construction
6. Not maintaining field order
7. Wrong dependency key format for dropdowns vs radio buttons

## Testing Checklist

1. Toggle Y/N multiple times - verify cleanup
2. Test nested dependencies (parent Y -> child Y/N)
3. Verify form state matches visible fields
4. Check field order preservation
5. Test multiple levels of nesting
6. Test dropdown selections and dependency chains
7. Verify cleanup between different dropdown selections