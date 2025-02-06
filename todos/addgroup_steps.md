# Logical Steps for DS-160 Add Group Implementation

This document defines a set of sequential, discrete steps to implement the YAML-to-formdata mapping for the DS-160 form with add group functionality. It covers both direct YAML upload and YAML generated via PDF→OpenAI. The logging behavior is as follows:
- **Step 1 (Mapping Creation):** Log detection of arrays and the complete mapping structure for **all pages**.
- **Step 2 (Interactive Steps):** Detailed logging for interactive events (such as button clicks and field name transformations during form filling) is enabled **only** for the `previous_travel_page` using a helper (e.g. `debugLog("previous_travel_page", message)`).

Follow these steps one after another and verify the results.

---

## ✅ Step 1: YAML Parsing, Mapping Creation & Field Name Transformation

1. **Parse the YAML Input**
   - Accept the YAML file (whether via direct upload or via the PDF→OpenAI flow).
   - Use a YAML parser (e.g. `js-yaml`) to load the file into a JavaScript object.

2. **Detect YAML Arrays**
   - Analyze the parsed object to identify any array values (i.e. any nested field that uses a hyphen `-` for list items).
   - For each detected array:
     - The first element will be used to populate the main group fields.
     - Subsequent array elements must be stored separately as additional groups.

3. **Create the YAML-to-Formdata Mapping Structure & Transform Field Names**
   - Build a complete mapping that converts the YAML fields into form field IDs using the defined mappings.
   - Retain any detected array groups in the mapping and simultaneously perform field name index transformation:
     - For the first (primary) group, field names remain unchanged.
     - For each additional group, compute the transformed names by replacing the numeric portion after the underscore (e.g. update `_ctl00` to `_ctl01` for the second group, `_ctl02` for the third, etc.)—ensuring that any initial segment (e.g. the very first `ctl`) is ignored.
   - **Logging:**
     - Log the detection of arrays and the complete mapping structure **for all pages**.
     - For the `previous_travel_page`, additionally log detailed information—including each field name transformation (e.g. using `debugLog("previous_travel_page", "Transformed field X -> Y")`).
   - **Verification:**
     - Confirm that every page in the mapping is complete and that for fields represented as arrays, the mapping includes both the main group and additional groups with proper field name transformation.
     - Additionally, verify that flattening the YAML retains the original object structure (e.g. ensure nested objects like `previous_travel_details` remain objects rather than being converted to `"[object Object]"`).

---

## Step 2: Delayed Add Group Interaction at Form Fill Time

1. **Separate Mapping from Interaction**
   - Ensure that the complete mapping from Step 1 is created and stored in memory.
   - Do not attempt any button-click actions during this phase.

2. **Wait for Form Rendering**
   - When the form page is rendered, wait until the "Add Group" button becomes visible for groups that require it.
   - Once visible, detect the button's presence (e.g., via its CSS selector or data attribute).

3. **Trigger the "Add Group" Action**
   - At fill time, programmatically click the "Add Group" button for each additional group stored from the mapping.
   - **Logging:**  
     - Use `debugLog("previous_travel_page", "Add Group button detected and clicked for group X")` to log these interactions on the previous travel page.
     - No extensive logging is needed for other pages at this point.
   - **Verification:**  
     - Manually or via test logs verify that for the previous travel page, the button was detected and clicked for each extra group.

4. **Fill in the Form Fields**
   - After each "Add Group" click, automatically populate the newly generated form fields with the corresponding values from the YAML mapping created in Step 1.
   - Ensure that each extra group's field names (transformed during mapping creation) match the actual form fields, so that the correct value is applied.
   - **Logging:**  
     - For the previous travel page, log the successful population of each field (e.g. using `debugLog("previous_travel_page", "Filled field 'X' with value 'Y'")`).
   - **Verification:**  
     - Confirm that all extra group fields are correctly prefilled with their intended YAML values.

---

## Step 3: Form State

1. **Track array groups in form state**
   - Ensure that the form state is updated to include the newly added groups.
   - **Logging:**  
     - For the previous travel page, log the successful addition of each group (e.g. using `debugLog("previous_travel_page", "Added group X")`).
   - **Verification:**  
     - Confirm that the form state is updated correctly with the new groups.

2. **Update form data when groups are added**
   - Ensure that the form data is updated to include the new groups.
   - **Logging:**  
     - For the previous travel page, log the successful update of form data (e.g. using `debugLog("previous_travel_page", "Form data updated with group X")`).
   - **Verification:**  
     - Confirm that the form data is updated correctly with the new groups.

3. **Handle validation for array groups**
   - Ensure that the form validation is updated to include the new groups.
   - **Logging:**  
     - For the previous travel page, log the successful validation of each group (e.g. using `debugLog("previous_travel_page", "Group X validated successfully")`).
   - **Verification:**  
     - Confirm that the form validation is updated correctly with the new groups.

---

## Step 4: YAML Generation

1. **Convert form data back to YAML**
   - Ensure that the form data is converted back to YAML.
   - **Logging:**  
     - For the previous travel page, log the successful conversion of form data to YAML (e.g. using `debugLog("previous_travel_page", "Form data converted to YAML successfully")`).
   - **Verification:**  
     - Confirm that the form data is converted back to YAML correctly.

2. **Handle array groups in YAML conversion**
   - Ensure that the YAML conversion includes the new groups.
   - **Logging:**  
     - For the previous travel page, log the successful inclusion of each group in the YAML conversion (e.g. using `debugLog("previous_travel_page", "Group X included in YAML conversion")`).
   - **Verification:**  
     - Confirm that the YAML conversion includes the new groups correctly.

---

## General Guidelines

1. **Preserve Existing Functionality:**  
   - The new add group implementation **MUST NOT** break any previously implemented functionality. This includes existing add group / remove group behavior, recursive dependency handling, dependency boundary rendering, and the integrity of mappings for non-array YAML data.
   - You may update the in-memory mapping if needed, but the original mapping configuration must remain unchanged.

2. **Logging Policy:**  
   - **Mapping Creation (Step 1):** Log detection of arrays and complete mapping structure across **all pages**.
   - **Interactive Steps (Step 2):** Detailed logging (for events like button clicks and field name transformations) should be enabled **only** for the `previous_travel_page`. Use a helper (e.g. `debugLog("previous_travel_page", message)`) to keep the logs focused on that page.

3. **Verification:**  
   - All modifications must be validated via integration testing and by inspecting the consolidated log file at `@logs/console_debug.json`.

---

## Conclusion

By executing these steps sequentially and verifying each operation at runtime, you ensure that:
- The YAML (whether uploaded directly or generated via the PDF→OpenAI flow) is parsed and mapped correctly.
- Array fields are detected and additional groups are handled via a delayed button click.
- Field names for extra groups are transformed correctly (e.g. `_ctl00` becomes `_ctl01` for the second group, `_ctl02` for the third, etc.).
- **Existing functionality is preserved** across all modifications. No regression in add group/remove group behavior, dependency handling, or non-array field mappings should occur.
- Mapping creation is logged comprehensively for all pages, while interactive actions use detailed logging only for the `previous_travel_page`.

Review the consolidated logs in `@logs/console_debug.json` to verify each step has been completed as required. 