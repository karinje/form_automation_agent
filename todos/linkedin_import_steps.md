# LinkedIn Import Steps for Work/Education Integration

This document describes the sequential steps to add the "Import Work/Education from LinkedIn" functionality. It covers UI changes, backend automation using Playwright for LinkedIn scraping, conversion of extracted text into YAML, and updating the DS‑160 form for Work/Education pages.

---

## Step 1: UI Changes on the Education Tab

✅ COMPLETED
- **Add Section Header:**  
✅ Added section header at the top of Education tab with label "Import Work/Education from LinkedIn:"
- **Input Field:**  
✅ Added text box for LinkedIn profile URL input
- **Action Button:**  
✅ Added "Import Data and Fill Form" button with loading state
✅ Created separate LinkedInImport.tsx component
✅ Integrated component into Education tab

---

## Step 2: API Route for LinkedIn Import ⬅️ CURRENT TASK

- **Create New Endpoint:**  
  Develop an API route (e.g., `/api/linkedin_import`) that accepts the LinkedIn URL from the client.

- **Validation and Trigger:**  
  On receiving a valid URL, the API route should trigger the backend process to import data.

Next steps:
1. Create `/api/linkedin_import/route.ts`
2. Implement URL validation
3. Set up connection to Python backend
4. Add error handling and logging

---

## Step 3: Implement a Playwright Script for LinkedIn Extraction

- **Login to LinkedIn:**  
  Use credentials stored in the `.env` file (similar to OpenAI API credentials) to log into LinkedIn.

- **Navigate to the Profile:**  
  After login, navigate to the LinkedIn profile URL provided by the user.

- **Extract Data:**  
  Scrape the **Experience** and **Education** sections of the profile.  
  - Collate the extracted information as plain text (or store it in a temporary text file).

---

## Step 4: Data Conversion Via OpenAI

- **Load YAML Templates:**  
  Read the YAML templates for `workeducation1_page.yaml` and `workeducation2_page.yaml`.

- **Build Conversion Prompt:**  
  Construct a prompt that instructs OpenAI to convert the extracted LinkedIn text into YAML that fits the Work/Education pages.

- **Call OpenAI Backend:**  
  Trigger an OpenAI API call (using the existing DS‑160 conversion method) to convert the LinkedIn data to YAML.

- **Receive and Validate YAML:**  
  Retrieve the generated YAML. Validate that the output only contains fields relevant to the Work/Education pages.

---

## Step 5: Partial YAML Update

- **Enable Partial Update:**  
  Modify the YAML uploading logic so that if the input YAML only contains a subset of pages (i.e. Work/Education pages), only those pages are updated.

- **Merge YAML Data:**  
  Merge the generated Work/Education YAML with the current DS‑160 form data.

---

## Step 6: Form Update and Interaction

- **Trigger Form Refresh:**  
  Update the UI to re-render the Work/Education pages based on the new YAML data.

- **Verification via Logs:**  
  Utilize detailed logging (focus on critical events, similar to `debugLog("previous_travel_page", ...)`) to log:
  - Successful extraction of LinkedIn data.
  - Conversion events (OpenAI call and YAML generation).
  - Merging of YAML data.
  - Final update of Work/Education fields.

- **User Feedback:**  
  Provide indication to the user (via UI or logs) confirming the data has been imported and the form updated.

---

## Step 7: Testing & Verification

- **Integration Testing:**  
  Perform end-to-end tests:
  1. Enter a LinkedIn URL in the provided text box.
  2. Click the "Import Data and Fill Form" button.
  3. Verify that the Playwright script logs into LinkedIn, extracts data, and sends it for OpenAI conversion.
  4. Confirm that the resulting YAML updates only the Work/Education pages.
  
- **Log Verification:**  
  Inspect logs (e.g., in "@logs/console_debug.json") to ensure each step is executed and to pinpoint any errors.

---

## References

- See [todos/addgroup_steps.md](./addgroup_steps.md) for similar mapping and add group logic.
- Consult existing DS‑160 automation scripts such as `main.py`, `form_handler.py`, and `form_mapping.py` for integration patterns and error handling.

--- 