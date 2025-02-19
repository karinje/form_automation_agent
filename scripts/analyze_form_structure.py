from playwright.sync_api import sync_playwright
import json
import time
import os
from dotenv import load_dotenv
from backend.src.automation.form_handler import FormHandler
from backend.src.mappings.form_mapping import FormMapping, FormPage
from backend.src.automation.browser import BrowserHandler
import yaml
import logging
import re
from typing import Dict, List, Set
from enum import Enum
from dataclasses import dataclass, field

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(funcName)s - %(message)s',
    handlers=[
        logging.FileHandler('form_analysis.log'),
        logging.StreamHandler()
    ]
)

# Replace print statements with logging
def print_to_logging(original_print):
    def wrapped(*args, **kwargs):
        message = ' '.join(str(arg) for arg in args)
        logging.info(message)
        original_print(*args, **kwargs)  # Keep console output
    return wrapped

print = print_to_logging(print)

class AnalyzableElementType(Enum):
    TEXT = 'text'
    RADIO = 'radio'
    SELECT = 'select-one'
    CHECKBOX = 'checkbox'
    TEXTAREA = 'textarea'

@dataclass
class FormAnalysisConfig:
    target_page_url: str
    exclude_patterns: List[str]
    input_yaml_path: str = 'data/input/full_application.yaml'
    analyzable_types: Set[AnalyzableElementType] = field(default_factory=lambda: {
        AnalyzableElementType.TEXT,
        AnalyzableElementType.RADIO,
        AnalyzableElementType.SELECT,
        AnalyzableElementType.TEXTAREA
    })

    @property
    def output_json_path(self) -> str:
        node_match = re.search(r'node=([^&]+)', self.target_page_url)
        if not node_match:
            raise ValueError(f"No node parameter found in URL: {self.target_page_url}")
        
        # Get index from configs list
        configs = load_configs_from_yaml('scripts/form_analysis_configs.yaml')
        try:
            index = next(i for i, c in enumerate(configs) if c.target_page_url == self.target_page_url)
            prefix = f"p{index+1}_"
        except StopIteration:
            prefix = ""
        
        return f"form_definitions/{prefix}{node_match.group(1).lower()}_definition.json"

def load_json(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return json.load(f)

def load_yaml(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return yaml.safe_load(f)

def analyze_current_page(page, exclude_pattern: re.Pattern, analyzable_types: Set[AnalyzableElementType]) -> dict:
    """Analyze current page structure and create form definition"""
    form_definition = {
        "fields": [],
        "dependencies": {},
        "buttons": []
    }
    
    print("Getting form elements...")
    type_values = [t.value for t in analyzable_types]
    type_condition = ', '.join([f"'{t}'" for t in type_values])
    elements = page.evaluate(f"""() => {{
        const formElements = [];
        const form = document.querySelector('form');
        if (!form) return formElements;
        
        const isVisible = (el) => {{
            if (!el.offsetParent) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
        }};
        
        const hasNACheckbox = (fieldId) => {{
            const naCheckboxId = fieldId + '_NA';
            const naCheckbox = document.getElementById(naCheckboxId);
            //return naCheckbox && isVisible(naCheckbox);
            return naCheckbox ? true : false;
        }};

        const getParentText = (el) => {{
            // Get direct parent
            let parent = el.parentElement;
            while (parent && !parent.classList.contains('field-group')) {{
                parent = parent.parentElement;
            }}
            if (!parent) return ''; // add parent name if it exists

            // Look for title text in this order:
            // 1. tooltip_text with label inside
            // 2. tooltip_text with span inside
            // 3. h4 with tooltip_text inside
            // 4. Any label with lbl in its ID
            const titleElement = 
                parent.querySelector('h4 .tooltip_text span') ||
                parent.querySelector('.tooltip_text span') ||
                parent.querySelector('.tooltip_text label') ||
                parent.querySelector('label[id*="lbl"]');
            
            if (!titleElement) return '';
            
            const text = titleElement.textContent.trim();
            const parentIdentifier = parent.id || Array.from(parent.classList).join(' ');
            return text ? `${{text}}` : '';
        }};

        const elements = form.querySelectorAll('input[type="radio"], input[type="text"], select, textarea');
        const radioGroups = new Map();
        
        for (const el of elements) {{
            if (!isVisible(el) || el.type === 'hidden' || el.id === 'ctl00_ddlLanguage') continue;
            
            let elementType = el.type;
            if (el.tagName.toLowerCase() === 'select') {{
                elementType = 'select-one';
            }}
            
            let textPhrase = '';
            let labelId = el.name.replace(/\\$/g, '_').replace(/ddl|rbl|tbx|chkbx|cbex/i, 'lbl');
            if (labelId.includes('Day') || labelId.includes('Month') || labelId.includes('Year')) {{
                labelId = labelId.replace(/Day|Month|Year/i, '').trim();
            }}
            const labelElement = document.getElementById(labelId);
            console.log(labelId);
            
            const labelForElement = document.querySelector(`label[for="${{el.name.replace(/\\$/g, '_')}}"]`);
            if (labelForElement) {{
                textPhrase = labelForElement.textContent.trim() ;//+ " [from label-for]" + el.name.replace(/\\$/g, '_');
            }} else if (labelElement) {{
                textPhrase = labelElement.textContent.trim() ;//+ " [from label-id] " + labelId;
            }} else {{
                const tooltipText = el.getAttribute('type') === 'radio' ? 
                    el.closest('.field-group')?.parentElement?.parentElement?.querySelector('.tooltip_text label') : 
                    el.closest('.field-group')?.parentElement?.querySelector('.tooltip_text label');
                if (tooltipText) {{
                    textPhrase = tooltipText.textContent.trim() ;//+ " [from tooltip]";
                }}
            }}
            
            if (el.getAttribute('type') === 'radio') {{
                const baseName = el.name;
                if (!radioGroups.has(baseName)) {{
                    radioGroups.set(baseName, {{
                        name: baseName,
                        type: 'radio',
                        value: ['Y', 'N'],
                        labels: [],
                        button_ids: {{
                            'Y': '',
                            'N': ''
                        }},
                        text_phrase: textPhrase,
                        parent_text_phrase: getParentText(el)
                    }});
                }}
                const group = radioGroups.get(baseName);
                const value = el.id.endsWith('_0') ? 'Y' : 'N';
                const label = document.querySelector(`label[for="${{el.id}}"]`)?.textContent.trim() || null;
                group.labels.push(label);
                group.button_ids[value] = el.id;
                continue;
            }}
            
            const field = {{
                name: el.id,
                type: elementType === 'select-one' ? 'dropdown' : elementType,
                value: '',
                text_phrase: textPhrase,
                parent_text_phrase: getParentText(el)
            }};
            
            if (elementType === 'select-one') {{
                field.value = Array.from(el.options)
                    .filter(o => o.value)
                    .map(o => o.text.trim());
            }} else if (elementType === 'text' || elementType === 'textarea') {{
                field.maxlength = el.getAttribute('maxlength');
                field.has_na_checkbox = hasNACheckbox(el.id);
            }}
            
            formElements.push(field);
        }}
        
        radioGroups.forEach(group => formElements.push(group));
        
        const buttons = form.querySelectorAll('input[type="submit"], button[type="submit"]');
        const finalButtons = Array.from(buttons)
            .filter(btn => btn.offsetParent !== null)
            .map(btn => ({{
                id: btn.id,
                name: btn.name,
                type: btn.type,
                value: btn.value || ''
            }}));
            
        return {{ elements: formElements, buttons: finalButtons }};
    }}""")
    
    form_definition['fields'] = elements['elements']
    form_definition['buttons'] = elements['buttons']
    
    print(f"Found {len(form_definition['fields'])} form elements: {form_definition['fields']}")
    # Filter out fields with excluded patterns

    # Map dependencies by toggling radio/dropdown values
    for element in form_definition['fields']:
        if element['type'] not in ['radio', 'dropdown'] or exclude_pattern.search(element['name']):
            continue
            
        print(f"\nAnalyzing dependencies for {element['name']}")
        initial_state = get_visible_elements(page, analyzable_types)
        
        if element['type'] == 'radio':
            for value in ['Y', 'N']:
                button_id = element['button_ids'][value]
                changes = analyze_field_dependencies(
                    page,
                    button_id,
                    value,
                    initial_state,
                    exclude_pattern,
                    analyzable_types
                )
                if changes:
                    form_definition['dependencies'][f"{button_id}.{value}"] = changes
                    
        elif element['type'] == 'dropdown':
            for option in element['value']:
                changes = analyze_field_dependencies(
                    page,
                    element['name'],
                    option,
                    initial_state,
                    exclude_pattern,
                    analyzable_types
                )
                if changes:
                    form_definition['dependencies'][f"{element['name']}.{option}"] = changes
    
    return form_definition

def get_visible_elements(page, analyzable_types: Set[AnalyzableElementType]) -> set:
    """Get IDs of all currently visible form elements of analyzable types"""
    type_values = [t.value for t in analyzable_types]
    type_condition = ', '.join([f"'{t}'" for t in type_values])
    
    # Build selector based on analyzable types
    selectors = []
    for element_type in analyzable_types:
        if element_type in {AnalyzableElementType.TEXT, AnalyzableElementType.RADIO, AnalyzableElementType.CHECKBOX}:
            selectors.append(f"input[type='{element_type.value}']")
        elif element_type == AnalyzableElementType.SELECT:
            selectors.append('select')
        elif element_type == AnalyzableElementType.TEXTAREA:
            selectors.append('textarea')
    
    selector = ', '.join(selectors)
    
    js_code = f"""() => {{
        const analyzableTypes = [{type_condition}];
        const elements = document.querySelectorAll(`{selector}`);
        return Array.from(elements)
            .filter(el => el.offsetParent !== null)
            .map(el => {{
                if (el.type === 'radio') {{
                    // For radio buttons, use the name attribute with $ separator
                    return el.name.replace(/\\$/g, '\\$');
                }}
                // For other elements, use the ID with $ separator
                return el.id.replace(/\\$/g, '\\$');
            }});
    }}"""
    
    return set(page.evaluate(js_code))

def analyze_field_dependencies(page, field_id: str, value: str, initial_state: set, 
                             exclude_pattern: re.Pattern, 
                             analyzable_types: Set[AnalyzableElementType]) -> dict:
    """Analyze what elements appear/disappear when a field value changes"""
    
    try:
        # Reset state by clicking the opposite radio button first
        if value in ['Y', 'N']:
            base_name = field_id[:-2]
            logging.info(f"Processing radio button: field_id={field_id}, base_name={base_name}, value={value}")
            
            # Get the radio group details first
            radio_group = page.evaluate("""(fieldId) => {
                const currentButton = document.getElementById(fieldId);
                if (!currentButton) return null;
                
                const baseName = currentButton.name;
                const inputs = document.querySelectorAll(`input[name="${baseName}"]`);
                const group = {
                    button_ids: {
                        'Y': '',
                        'N': ''
                    }
                };
                
                for (const input of inputs) {
                    const value = input.value;
                    if (value === 'Y' || value === 'N') {
                        group.button_ids[value] = input.id;
                    }
                }
                
                return group;
            }""", field_id)
            
            logging.info(f"Found radio group: {radio_group}")
            
            # Only try to click opposite if it exists
            opposite_value = 'N' if value == 'Y' else 'Y'
            opposite_id = radio_group['button_ids'][opposite_value]
            if opposite_id:
                logging.info(f"Clicking opposite button: #{opposite_id}")
                try:
                    page.click(f"#{opposite_id}")
                    page.wait_for_timeout(500)
                except Exception as e:
                    logging.error(f"Error clicking opposite button: {str(e)}")
                    return None
            
            logging.info(f"Clicking target button: #{field_id}")
            page.click(f"#{field_id}")
        else:
            # For dropdowns, ensure value is properly set
            page.evaluate(f"""(targetValue) => {{
                const el = document.getElementById('{field_id}');
                if (el) {{
                    const options = Array.from(el.options);
                    const targetOption = options.find(o => o.text.trim() === targetValue);
                    if (targetOption) {{
                        el.value = targetOption.value;
                        el.dispatchEvent(new Event('change'));
                        // Also dispatch input event for good measure
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    }}
                }}
            }}""", value)
            page.wait_for_timeout(1000)  # Increased wait time for dynamic content
        
        page.wait_for_timeout(500)
        
        # Get new state with full element details
        new_state_details = page.evaluate("""() => {
            const details = {};
            const form = document.querySelector('form');
            
            const isVisible = (el) => {
                if (!el.offsetParent) return false;
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            };

            const hasNACheckbox = (fieldId) => {
                const naCheckboxId = fieldId + '_NA';
                const naCheckbox = document.getElementById(naCheckboxId);
                //return naCheckbox && isVisible(naCheckbox);
                return naCheckbox ? true : false;
            };

            const getParentText = (el) => {
                // Get direct parent
                let parent = el.parentElement;
                while (parent && !parent.classList.contains('field-group')) {{
                    parent = parent.parentElement;
                }}
                if (!parent) return ``; // add parent name if it exists
                
                // Look for title text in this order:
                // 1. tooltip_text with label inside
                // 2. tooltip_text with span inside
                // 3. h4 with tooltip_text inside
                // 4. Any label with lbl in its ID
                const titleElement =
                    parent.querySelector('h4 .tooltip_text span') ||
                    parent.querySelector('.tooltip_text span') ||
                    parent.querySelector('.tooltip_text label') ||
                    parent.querySelector('label[id*="lbl"]');
                
                if (!titleElement) return '';
                
                const text = titleElement.textContent.trim();
                const parentIdentifier = parent || Array.from(parent.classList).join(' ');
                //return text ? `${text} [parent: ${parentIdentifier}]` : '';
                return text ? `${text}` : '';
                        
            };

            form.querySelectorAll('input[type="radio"], input[type="text"], select, textarea').forEach(el => {
                if (!isVisible(el)) return;
                
                let elementType = el.type;
                if (el.tagName.toLowerCase() === 'select') {
                    elementType = 'select-one';
                }
                
                // Add text_phrase and parent_text_phrase extraction
                let textPhrase = '';
                let parentTextPhrase = getParentText(el);
                
                let labelId = el.name.replace(/\\$/g, '_').replace(/ddl|rbl|tbx|chkbx|cbex/i, 'lbl');
                if (labelId.includes('Day') || labelId.includes('Month') || labelId.includes('Year')) {
                    labelId = labelId.replace(/Day|Month|Year/i, '').trim();
                }
                const labelElement = document.getElementById(labelId);
                
                const labelForElement = document.querySelector(`label[for="${el.name.replace(/\\$/g, '_')}"]`);
                if (labelForElement) {
                    textPhrase = labelForElement.textContent.trim() ;//+ " [from label-for]" + el.name.replace(/\\$/g, '_');
                } else if (labelElement) {
                    textPhrase = labelElement.textContent.trim() ;//+ " [from label-id]" + labelId;
                } else {
                    const tooltipText = el.getAttribute('type') === 'radio' ? 
                        el.closest('.field-group')?.parentElement?.parentElement?.querySelector('.tooltip_text label') : 
                        el.closest('.field-group')?.parentElement?.querySelector('.tooltip_text label');
                    if (tooltipText) {
                        textPhrase = tooltipText.textContent.trim() ;//+ " [from tooltip]";
                    }
                }
                if (elementType === 'radio') {
                    const baseName = el.name;
                    if (!details[baseName]) {
                        details[baseName] = {
                            name: baseName,
                            type: 'radio',
                            value: ['Y', 'N'],
                            labels: [],
                            button_ids: {
                                'Y': '',
                                'N': ''
                            },
                            text_phrase: textPhrase
                        };
                    }
                    const label = document.querySelector(`label[for="${el.id}"]`)?.textContent.trim() || null;
                    details[baseName].labels.push(label);
                    details[baseName].button_ids[el.id.endsWith('_0') ? 'Y' : 'N'] = el.id;
                    return;
                }
                
                const field = {
                    name: el.id,
                    type: elementType === 'select-one' ? 'dropdown' : elementType,
                    value: '',
                    text_phrase: textPhrase,
                    parent_text_phrase: parentTextPhrase
                };
                
                if (elementType === 'select-one') {
                    field.value = Array.from(el.options)
                        .filter(o => o.value)
                        .map(o => o.text.trim());
                } else if (elementType === 'text' || elementType === 'textarea') {
                    field.maxlength = el.getAttribute('maxlength');
                    field.has_na_checkbox = hasNACheckbox(el.id);
                }
                
                details[el.id] = field;
            });
            return details;
        }""")
        
        new_state = set(new_state_details.keys())
        appeared = new_state - initial_state
        disappeared = initial_state - new_state
        logging.info(f"New state: {new_state}")
        logging.info(f"Initial state: {initial_state}")
        logging.info(f"Appeared: {appeared}")
        logging.info(f"Disappeared: {disappeared}")
        recursive_dependencies = {}
        for element_id in appeared:
            element = new_state_details[element_id]
            print(f"Element: {element}")
            if element['type'] in ['radio', 'dropdown']:
                if exclude_pattern.search(element_id):
                    continue
                    
                if element['type'] == 'radio':
                    # Use the base name since we're now grouping radio buttons
                    base_name = element['name']
                    radio_group = new_state_details[base_name]
                    for value, button_id in radio_group['button_ids'].items():
                        if not button_id:  # Skip if button_id is empty
                            continue
                        child_changes = analyze_field_dependencies(
                            page,
                            button_id,
                            value,
                            new_state,
                            exclude_pattern,
                            analyzable_types
                        )
                        if child_changes:
                            recursive_dependencies[f"{button_id}.{value}"] = child_changes
                
                elif element['type'] == 'dropdown':
                    # Get all current dependencies for this dropdown
                    all_option_dependencies = {}
                    for option in element['value']:
                        # Reset state before analyzing each option
                        page.evaluate(f"""() => {{
                            const el = document.getElementById('{element_id}');
                            if (el) {{
                                // Reset to default/empty value first
                                el.value = '';
                                el.dispatchEvent(new Event('change'));
                            }}
                        }}""")
                        page.wait_for_timeout(500)
                        
                        # Now analyze the specific option
                        child_changes = analyze_field_dependencies(
                            page,
                            element_id,
                            option,
                            new_state,
                            exclude_pattern,
                            analyzable_types
                        )
                        if child_changes:
                            all_option_dependencies[f"{element_id}.{option}"] = child_changes
                    
                    # Add all dependencies if any were found
                    if all_option_dependencies:
                        recursive_dependencies.update(all_option_dependencies)
        
        return {
            "shows": [new_state_details[el_id] for el_id in appeared],
            "hides": list(disappeared),
            "dependencies": recursive_dependencies if recursive_dependencies else None
        }
        
    except Exception as e:
        print(f"Error analyzing dependencies for {field_id}.{value}: {str(e)}")
        return None

def create_exclude_pattern(patterns: List[str]) -> re.Pattern:
    """Create case-insensitive regex pattern from list of strings"""
    if not patterns:
        return re.compile(r"^$")  # Match nothing if no patterns
    pattern = '|'.join(patterns)
    return re.compile(f'({pattern})', re.IGNORECASE)

def analyze_multiple_pages(configs: List[FormAnalysisConfig]):
    load_dotenv()
    test_data = load_yaml(configs[0].input_yaml_path)
    
    # Load predefined form definitions
    page_definitions = {
        'start_page': load_json('/Users/sanjaykarinje/git/ds160_automation/form_definitions/p0_start_page_definition.json'),
        'retrieve_page': load_json('/Users/sanjaykarinje/git/ds160_automation/form_definitions/p0_retrieve_page_definition.json')
    }

    form_handler = FormHandler()
    form_mapping = FormMapping()

    with BrowserHandler(headless=False) as browser:
        form_handler.set_browser(browser)
        browser.navigate("https://ceac.state.gov/GenNIV/Default.aspx")
        
        try:
            # Process start page with CAPTCHA
            print("Processing start page...")
            page_data = test_data['start_page']
            form_handler.field_values = page_data
            form_handler.handle_start_page(page_definitions['start_page'])
            time.sleep(2)
            
            # Process retrieve page
            print("Processing retrieve page...")
            page_data = test_data['retrieve_page']
            form_handler.field_values = page_data
            form_handler.handle_retrieve_page(page_definitions['retrieve_page'])
            time.sleep(2)

            # Continue with analysis of other pages...
            for config in configs:
                exclude_pattern = create_exclude_pattern(config.exclude_patterns)
                
                # Navigate to target page
                print(f"Navigating to {config.target_page_url}...")
                browser.navigate(config.target_page_url)
                browser.page.wait_for_load_state("networkidle")
                time.sleep(2)

                # Start form analysis
                print("Analyzing form structure...")
                form_definition = analyze_current_page(
                    browser.page,
                    exclude_pattern,
                    config.analyzable_types
                )
                
                # Save the form definition
                os.makedirs(os.path.dirname(config.output_json_path), exist_ok=True)
                with open(config.output_json_path, 'w', encoding='utf-8') as f:
                    json.dump(form_definition, f, indent=2, ensure_ascii=False)
                
                print(f"Form definition saved to {config.output_json_path}")
                
        except Exception as e:
            print(f"Error during analysis: {str(e)}")
            raise

def load_configs_from_yaml(config_file: str) -> List[FormAnalysisConfig]:
    with open(config_file, 'r') as f:
        data = yaml.safe_load(f)
    
    return [FormAnalysisConfig(
        target_page_url=config_data['target_page_url'],
        exclude_patterns=[p.strip() for p in config_data['exclude_patterns'].split(',')]
    ) for config_data in data['configs']]

if __name__ == "__main__":
    configs = load_configs_from_yaml('scripts/form_analysis_configs_temp.yaml')
    analyze_multiple_pages(configs) 