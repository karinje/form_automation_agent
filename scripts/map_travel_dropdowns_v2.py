from playwright.sync_api import sync_playwright
import json
import time
import os
from dotenv import load_dotenv
import yaml
from backend.src.automation.form_handler import FormHandler
from backend.src.mappings.form_mapping import FormMapping
from backend.src.automation.browser import BrowserHandler
import logging

logging.basicConfig(level=logging.INFO)

# Exactly same JSON/YAML loader functions as in map_travel_dropdowns.py:
def load_json(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return json.load(f)

def load_yaml(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return yaml.safe_load(f)

def get_all_visible_fields(page):
    """
    Extract all visible form fields (input, select, textarea) from the entire page.
    Returns a list of dictionaries formatted like the form definitions.
    """
    try:
        fields = page.evaluate("""() => {
            const formElements = [];
            const elems = Array.from(document.querySelectorAll('input, select, textarea'));
            elems.forEach(e => {
                const style = window.getComputedStyle(e);
                if (e.offsetParent === null || style.display === 'none' || style.visibility === 'hidden') return;
                let field = {};
                if (e.tagName.toLowerCase() === 'select') {
                    field.type = 'dropdown';
                    field.value = Array.from(e.options).map(o => o.text.trim()).filter(t => t);
                } else if (e.tagName.toLowerCase() === 'textarea') {
                    field.type = 'textarea';
                    field.value = "";
                } else if (e.tagName.toLowerCase() === 'input') {
                    if (e.type.toLowerCase() === 'text') {
                        field.type = 'text';
                        field.value = "";
                    } else if (e.type.toLowerCase() === 'radio') {
                        field.type = 'radio';
                        field.value = e.value;
                    } else {
                        field.type = e.type;
                        field.value = e.value || "";
                    }
                }
                field.name = e.id || e.name || "";
                let labelEl = document.querySelector('label[for="' + e.id + '"]');
                field.text_phrase = labelEl ? labelEl.textContent.trim() : "";
                field.parent_text_phrase = "";
                field.maxlength = e.getAttribute('maxlength') || "";
                field.has_na_checkbox = document.getElementById(e.id + "_NA") ? true : false;
                formElements.push(field);
            });
            return formElements;
        }""");
        
    except Exception as e:
        logging.error(f"Error extracting visible fields: {str(e)}")
        return []
    return fields;

def extract_text_fields(page):
    """
    Extract text fields that appear after selecting a second dropdown option.
    Returns a list of dictionaries with keys: "id", "label", "required".
    """
    try:
        text_fields = page.evaluate("""() => {
            const fields = [];
            const container = document.querySelector('#ctl00_SiteContentPlaceHolder_FormView1_upnlPrincipalApplicant');
            if (!container) return fields;
            const inputs = container.querySelectorAll('input[type="text"]');
            for (const input of inputs) {
                const labelId = input.id.replace('tbx', 'lbl');
                const labelSpan = document.getElementById(labelId);
                if (labelSpan) {
                    fields.push({
                        id: input.id,
                        label: labelSpan.textContent.trim(),
                        required: input.hasAttribute('required') || false
                    });
                }
            }
            return fields;
        }""")
        return text_fields
    except Exception as e:
        logging.error(f"Error extracting text fields: {str(e)}")
        return []

def map_travel_dropdowns_v2():
    load_dotenv()
    
    # Selectors and IDs for the two dropdowns
    first_dropdown_selector = "#ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip"
    second_dropdown_selector = "#ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlOtherPurpose"
    first_dropdown_id = "ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip"
    second_dropdown_id = "ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlOtherPurpose"
    
    # Define the mapping structure (fields, dependencies, buttons)
    mapping_output = {
        "fields": [],
        "dependencies": {},
        "buttons": []
    }
    form_handler = FormHandler()
    form_mapping = FormMapping()  # (Copied exactly as in original)
    
    with BrowserHandler(headless=False) as browser:
        form_handler.set_browser(browser)
        browser.navigate("https://ceac.state.gov/GenNIV/Default.aspx")
        time.sleep(2)
        
        # ---------- Login / Retrieve Flow (exact copy from map_travel_dropdowns.py) ----------
        test_data = load_yaml('data/input/test_application.yaml')
        pages = [
            ('start_page', '/Users/sanjaykarinje/git/form_automation_agent/form_definitions/p0_start_page_definition.json'),
            ('retrieve_page', '/Users/sanjaykarinje/git/form_automation_agent/form_definitions/p0_retrieve_page_definition.json'),
            ('travel_page', '/Users/sanjaykarinje/git/form_automation_agent/form_definitions/p3_travel_definition.json'),
        ]
        page_definitions = {
            name: load_json(json_file) for name, json_file in pages
        }
        
        print("Processing start page...")
        form_handler.field_values = test_data['start_page']
        form_handler.handle_start_page(page_definitions['start_page'])
        time.sleep(2)
        
        print("Processing retrieve page...")
        form_handler.field_values = test_data['retrieve_page']
        form_handler.handle_retrieve_page(page_definitions['retrieve_page'])
        time.sleep(2)
        
        print("Navigating to travel page...")
        browser.navigate("https://ceac.state.gov/GenNIV/General/complete/complete_travel.aspx?node=Travel")
        browser.page.wait_for_selector(first_dropdown_selector, state="visible", timeout=30000)
        browser.page.wait_for_load_state("networkidle")
        time.sleep(2)
        # ---------- End of Login Flow ----------
        
        # Reset both dropdowns to no selection before capturing baseline fields.
        logging.info("Resetting both dropdowns to no selection before capturing baseline fields.")
        browser.page.locator(first_dropdown_selector).select_option("")
        browser.page.locator(second_dropdown_selector).select_option("")
        time.sleep(2)
        
        baseline_fields = get_all_visible_fields(browser.page)
        initial_field_names = { field['name'] for field in baseline_fields }
        logging.info(f"Initial field names: {initial_field_names}")
        # Begin new dropdown mapping logic
        # Extract first dropdown options
        first_options = browser.page.locator(first_dropdown_selector).evaluate("""select => {
            return Array.from(select.options).map(option => ({
                value: option.value,
                text: option.text.trim()
            }));
        }""")
        first_options = [opt for opt in first_options if opt['value'] and opt['text']]
        logging.info(f"Found first dropdown options: {first_options}")
        
        # Create a field for the first dropdown (structure similar to p1_personal1_definition.json)
        first_field = {
            "name": first_dropdown_id,
            "type": "dropdown",
            "value": [opt['text'] for opt in first_options],
            "text_phrase": "Purpose of Trip to the U.S.",
            "parent_text_phrase": ""
        }
        mapping_output["fields"].append(first_field)
        
        # Process every option from the first dropdown
        for first_opt in first_options[:10]:
            first_value = first_opt['value']
            logging.info(f"\nProcessing first dropdown option: {first_opt['text']} ({first_value})")
            
            # Reload the page to reset state
            browser.page.reload()
            browser.page.wait_for_selector(first_dropdown_selector, state="visible", timeout=30000)
            browser.page.wait_for_load_state("networkidle")
            time.sleep(1)
            
            # Select current first dropdown option
            first_dropdown = browser.page.locator(first_dropdown_selector)
            first_dropdown.select_option(first_value)
            time.sleep(2)
            
            # Obtain second dropdown options (when first dropdown is set)
            second_options = browser.page.locator(second_dropdown_selector).evaluate("""select => {
                return Array.from(select.options).map(option => ({
                    value: option.value,
                    text: option.text.trim()
                }));
            }""")
            second_options = [opt for opt in second_options if opt['value'] and opt['text']]
            logging.info(f"  Found second dropdown options: {second_options}")
            
            # Create a field definition for the second dropdown (for use in "shows")
            second_field_def = {
                "name": second_dropdown_id,
                "type": "dropdown",
                "value": [opt['text'] for opt in second_options],
                "text_phrase": "Specify",
                "parent_text_phrase": ""
            }
            
            # For every option in the second dropdown, capture related text fields
            second_deps = {}
            for second_opt in second_options:
                second_value = second_opt['value']
                logging.info(f"    Processing second dropdown option: {second_opt['text']} ({second_value})")
                browser.page.locator(second_dropdown_selector).select_option(second_value)
                time.sleep(2)
                
                # Capture all visible fields after selecting this second dropdown option
                new_fields = get_all_visible_fields(browser.page)
                # Compute difference: fields that are newly visible compared to baseline
                diff_fields = [field for field in new_fields if field['name'] not in initial_field_names]
                logging.info(f"      Extracted diff fields: {diff_fields}")
                
                # Build dependency for the second dropdown option using diff_fields as "shows"
                dep_key_second = f"{second_dropdown_id}.{second_opt['text']}"
                second_deps[dep_key_second] = {
                    "shows": diff_fields,
                    "hides": [],
                    "dependencies": None
                }
            
            # Build dependency for the first dropdown option using nested dependencies
            dep_key_first = f"{first_dropdown_id}.{first_opt['text']}"
            mapping_output["dependencies"][dep_key_first] = {
                "shows": [second_field_def],
                "hides": [],
                "dependencies": second_deps if second_deps else None
            }
        
        # Save the final mapping to travel_dropdown_mappings_v2.json
        output_file = "travel_dropdown_mappings_v2.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(mapping_output, f, indent=2, ensure_ascii=False)
        logging.info(f"\nMapping saved to {output_file}")

if __name__ == "__main__":
    map_travel_dropdowns_v2() 