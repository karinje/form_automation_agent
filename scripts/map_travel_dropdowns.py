from playwright.sync_api import sync_playwright
import json
import time
import os
from dotenv import load_dotenv
from src.utils.form_handler import FormHandler
from src.utils.form_mapping import FormMapping, FormPage
from src.utils.browser import BrowserHandler
import yaml
import logging


def load_json(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return json.load(f)

def load_yaml(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return yaml.safe_load(f)

def extract_second_dropdown_options(page, first_option):
    """Extract options from second dropdown and related text fields after selecting first dropdown option"""
    first_dropdown = page.locator("#ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip")
    first_dropdown.select_option(first_option)
    time.sleep(2)
    
    second_dropdown = page.locator("#ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlOtherPurpose")
    
    try:
        # Get dropdown options
        options = second_dropdown.evaluate("select => Array.from(select.options).map(o => ({value: o.value, text: o.text}))")
        
        # For each second dropdown option, get associated text fields
        second_dropdown_data = {}
        for option in options:
            if not option['value']:  # Skip empty/placeholder options
                continue
                
            # Select the current option
            second_dropdown.select_option(option['value'])
            time.sleep(2)  # Wait for fields to appear
            
            # Get text fields for this combination
            text_fields = page.evaluate("""() => {
                const fields = [];
                const container = document.querySelector('#ctl00_SiteContentPlaceHolder_FormView1_upnlPrincipalApplicant');
                if (!container) return fields;
                
                const inputs = container.querySelectorAll('input[type="text"]');
                for (const input of inputs) {
                    // Get the corresponding label span ID by replacing 'tbx' with 'lbl'
                    const labelId = input.id.replace('tbx', 'lbl');
                    const labelSpan = document.getElementById(labelId);
                    
                    if (labelSpan) {
                        fields.push({
                            id: input.id,
                            label: labelSpan.textContent.trim(),
                            required: input.hasAttribute('required') || 
                                    input.closest('tr')?.textContent.includes('*') || false
                        });
                    }
                }
                return fields;
            }""")
            
            second_dropdown_data[option['value']] = {
                'text': option['text'],
                'text_fields': text_fields
            }
            
        return second_dropdown_data
        
    except Exception as e:
        print(f"Error extracting fields: {str(e)}")
        return None

def map_all_dropdowns():
    load_dotenv()
    test_data = load_yaml('data/input/test_application.yaml')
    
    pages = [
        ('start_page', 'json_files/start_page.json'),
        ('retrieve_page', 'json_files/retrieve_page.json'),
        ('personal_page', 'json_files/personal_page.json'),
        ('personal_page2', 'json_files/personal_page2.json'),
        ('travel_page', 'json_files/travel_page.json')
    ]
    
    page_definitions = {
        name: load_json(json_file) for name, json_file in pages
    }

    form_handler = FormHandler()
    form_mapping = FormMapping()

    with BrowserHandler(headless=False) as browser:
        form_handler.set_browser(browser)
        browser.navigate("https://ceac.state.gov/GenNIV/Default.aspx")
        
        try:
            # Process start page with CAPTCHA
            print("Processing start page...")
            page_data = form_mapping.map_form_data(test_data['start_page'], FormPage.START)
            form_handler.field_values = page_data
            form_handler.handle_start_page(page_definitions['start_page'])
            time.sleep(2)
            
            # Process retrieve page
            print("Processing retrieve page...")
            page_data = form_mapping.map_form_data(test_data['retrieve_page'], FormPage.RETRIEVE)
            form_handler.field_values = page_data
            form_handler.handle_retrieve_page(page_definitions['retrieve_page'])
            time.sleep(2)
            
            # Now proceed with dropdown mapping
            print("Navigating to travel page...")
            browser.navigate("https://ceac.state.gov/GenNIV/General/complete/complete_travel.aspx?node=Travel")
            
            # Wait for travel page dropdowns to be loaded
            print("Waiting for first dropdown...")
            first_dropdown_selector = "#ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip"
            browser.page.wait_for_selector(first_dropdown_selector, state="visible", timeout=30000)
            browser.page.wait_for_load_state("networkidle")
            time.sleep(2)
            
            print("Getting first dropdown options...")
            first_dropdown = browser.page.locator(first_dropdown_selector)
            try:
                first_options = first_dropdown.evaluate("""select => {
                    return Array.from(select.options).map(option => ({
                        value: option.value,
                        text: option.text.trim()
                    }));
                }""")
                print(f"Raw first options: {first_options}")
            except Exception as e:
                print(f"Error getting first options: {str(e)}")
                raise
            
            # Filter out empty/None options
            first_options = [opt for opt in first_options if opt['value'] and opt['text']]
            print(f"Filtered first options: {first_options}")
            
            dropdown_mapping = {}
            for option in first_options:
                print("\nReloading page...")
                try:
                    browser.page.reload()
                    browser.page.wait_for_selector(first_dropdown_selector, state="visible", timeout=30000)
                    browser.page.wait_for_load_state("networkidle")
                    time.sleep(1)
                    print(f"Processing option: {option['text']} (value: {option['value']})")
                    
                    second_options = extract_second_dropdown_options(browser.page, option['value'])
                    print(f"Got second options: {second_options}")
                    if second_options:  # Only add if we got valid options
                        dropdown_mapping[option['value']] = {
                            'text': option['text'],
                            'second_dropdown_options': {
                                key: {
                                    'text': value['text'],
                                    'text_fields': value['text_fields']
                                }
                                for key, value in second_options.items()
                            }
                        }
                        print(f"Added to mapping. Current size: {len(dropdown_mapping)}")
                except Exception as e:
                    print(f"Error processing option {option['text']}: {str(e)}")
                    continue
                
            # Move this outside the loop
            print("\n=== FINAL MAPPING ===")
            #print(json.dumps(dropdown_mapping, indent=2))
            with open('json_files/travel_dropdown_mapping.json', 'w', encoding='utf-8') as f:
                json.dump(dropdown_mapping, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            print(f"Error during mapping: {str(e)}")
            raise

if __name__ == "__main__":
    map_all_dropdowns()