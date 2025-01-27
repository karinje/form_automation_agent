# DS-160 Form Handler Architecture Guide

## Core Components & Flow

### 1. Process Flow
Reference: `src/utils/form_handler.py` (lines 21-99)

The form automation follows this sequence:
1. Start page handling (with CAPTCHA)
2. Retrieve/Security page handling based on application type
3. Sequential page processing (p1-p16)

### 2. Key Components

#### Form Handler (`src/utils/form_handler.py`)
- `process_form_pages`: Main orchestrator (lines 21-99)
- `fill_form`: Field processing coordinator (lines 254-286) 
- `handle_field`: Individual field handler (lines 161-182)
- `process_dependencies`: Dependency chain processor (lines 137-160)
- `verify_page`: Page validation (lines 288-297)

#### Form Mapping (`src/utils/form_mapping.py`)
Maintains:
- Field name to element ID mappings
- Page identifiers and URLs
- Navigation logic

#### Form Analyzer (`scripts/analyze_form_structure.py`)
Handles:
- Form structure analysis (lines 573-631)
- Field type detection (lines 35-40)
- Dependency mapping
- State tracking

## Data Flow & Dependencies

### 1. Input Processing Chain


### 2. Dependency Processing
**Problem**: Lost dependencies during field processing
**Solution**: 
- Process after field fill
- Maintain dependency chain
- Handle nested dependencies
- Clean up form state
- Track parent dependencies

### 3. State Management
**Problem**: Inconsistent form state
**Solution**:
- Verify page before filling
- Track current page state
- Handle field dependencies
- Maintain form state during navigation

## Best Practices

### 1. Field Processing
- Get element IDs from form_mapping
- Use field definitions for type info
- Handle dependencies after fill
- Wait between interactions
- Validate field values
- Handle missing mappings
- Clear error messages

### 2. Error Handling
- Log all processing attempts
- Validate values before filling
- Handle missing mappings
- Clear error messages
- Retry unstable elements
- Save partial progress

### 3. State Management
- Verify page before operations
- Track current page state
- Handle dependencies properly
- Maintain state during navigation
- Clean up removed fields
- Track visibility state

## Testing Guidelines

### 1. Field Types
Test coverage for:
- All input types (text, radio, dropdown, checkbox)
- Dependency chains
- Field order preservation
- State transitions
- Error cases

### 2. Navigation
Verify:
- Page sequence
- Page identifiers
- URL navigation
- State preservation
- Error recovery

### 3. Error Cases
Test handling of:
- Missing mappings
- Invalid field types
- Dependency failures
- Network issues
- Validation errors

## Future Improvements

### 1. Code Structure
- Better separation of concerns
- More robust error recovery
- Cleaner dependency handling
- Enhanced validation
- State preservation
- Progress tracking

### 2. Features
- Document parsing (Gemini Vision API)
- Passport OCR
- Immigration document extraction
- Multi-applicant support
- GUI for data entry
- Secure data storage

## Technical Requirements
- Python 3.8+
- Playwright
- JSON/YAML parser
- Logging framework
- Test framework (pytest)

## Notes & Limitations
- Manual CAPTCHA handling required
- Rate limiting consideration
- Terms of use compliance
- Secure data storage needed
- Session handling required