# DS-160 Form Automation System Maintenance Guide

## System Architecture

### Backend Structure (`/backend/src/`)
```
/api/
  server.py         # FastAPI server setup
  /routes/
    ds160.py        # Form submission endpoints
    linkedin.py     # LinkedIn data import
    pdf.py          # PDF processing

/automation/
  browser.py        # Playwright browser control
  form_handler.py   # Form filling logic

/config/
  settings.py       # Environment config

/mappings/
  form_mapping.py   # Core mapping logic & enums
  /page_mappings/   # Individual page mappings
    address_phone_page_mapping.py
    personal_page1_mapping.py
    personal_page2_mapping.py
    pptvisa_page_mapping.py
    previous_travel_page_mapping.py
    relatives_page_mapping.py
    security_background1_page_mapping.py
    # ... and other page mappings

/templates/
  /yaml_files/      # Form templates

/utils/
  openai_handler.py # OpenAI integration
  linkedin_handler.py # LinkedIn processing
```

### Frontend Structure (`/frontend/`)
```
/app/
  page.tsx          # Main app page
  layout.tsx        # Root layout

/components/
  DynamicForm.tsx   # Form renderer
  FormSection.tsx   # Form sections

/types/
  form-definition.ts # Type definitions
  form-mapping.ts    # Mapping types

/utils/
  api.ts           # API clients
  form-helpers.ts  # Form utilities
```

## Core Systems

### 1. Form Processing Chain
1. PDF/Data Input → YAML Conversion
2. Form Field Mapping
3. Browser Automation
4. DS-160 Form Filling

### 2. Dependency Handling
Common Issues:
- Lost dependencies during field processing
- Inconsistent form state
- Nested dependency chains

Solutions:
```typescript
// Process dependencies after field fill
await processDependencies(field);

// Handle nested dependencies
const allDependents = getAllDependentFields(field);
await cleanupDependentFields(allDependents);

// Track parent dependencies
const parentDeps = getParentDependencies(field);
await validateDependencyChain(parentDeps);
```

### 3. Form State Management
Key Components:
- Page verification
- Field state tracking
- Dependency management
- Navigation state

## Common Issues & Solutions

### 1. Type Safety
Problem: Form field type mismatches
```typescript
// Define strict field types
type FormFieldType = 
  | "text" 
  | "radio" 
  | "dropdown" 
  | "date";

interface FormField {
  type: FormFieldType;
  name: string;
  value: string | string[];
  // ...
}
```

### 2. Dependency Tracking
Problem: Missing or incorrect dependencies
```typescript
// Track dependencies properly
const dependencyMap = new Map<string, string[]>();

function trackDependency(parent: string, child: string) {
  if (!dependencyMap.has(parent)) {
    dependencyMap.set(parent, []);
  }
  dependencyMap.get(parent)!.push(child);
}
```

### 3. State Cleanup
Problem: Lingering form state
```typescript
// Clean up form state
function cleanupFormState(removedFields: string[]) {
  removedFields.forEach(field => {
    delete formData[field];
    cleanupDependencies(field);
  });
}
```

## Testing Guidelines

### 1. Field Types
Test all input types:
- Text inputs
- Radio buttons
- Dropdowns
- Date fields
- Checkboxes

### 2. Dependencies
Verify:
- Parent-child relationships
- Nested dependencies
- State cleanup
- Field order

### 3. Navigation
Test:
- Page sequences
- State preservation
- Error recovery
- Progress tracking

## Best Practices

1. Form Field Processing
```typescript
// Get element IDs from mapping
const elementId = getFormFieldId(fieldName);

// Validate before filling
await validateFieldValue(value, fieldDefinition);

// Handle dependencies
await processDependencies(field);
```

2. Error Handling
```typescript
try {
  await fillFormField(field, value);
} catch (error) {
  logger.error(`Failed to fill field ${field}:`, error);
  await handleFieldError(field, error);
}
```

3. State Management
```typescript
// Verify page before operations
await verifyCurrentPage();

// Track state changes
trackFieldStateChange(field, value);

// Clean up removed fields
cleanupRemovedFields(removedFields);
```

## Future Improvements

1. Code Structure
- Enhanced type safety
- Better error recovery
- Cleaner dependency handling
- Improved validation

2. Features
- Document parsing
- Passport OCR
- Multi-applicant support
- Secure data storage

## Technical Requirements
- Node.js 18+
- Python 3.8+
- Playwright
- FastAPI
- TypeScript
- Next.js 