from typing import Dict, Any, List, Set
import logging
from enum import Enum
from src.utils.form_mapping import FormMapping, FormPage
import json
import os
from .openai_handler import OpenAIHandler
import time

logger = logging.getLogger(__name__)

class FormHandler:
    def __init__(self):
        self.field_values = {}
        self.browser = None
        self.current_page = None
        self.application_id = None
        self.page_errors = {}  # Track errors by page

    def set_browser(self, browser):
        self.browser = browser

    def process_form_pages(self, test_data: dict, page_definitions: dict) -> None:
        """Process all form pages in sequence"""
        try:
            # Store original test_data for recovery
            self.test_data = test_data
            self.page_definitions = page_definitions
            
            def handle_timeout_recovery(current_page):
                logger.info("Detected timeout page, initiating recovery...")
                # Click cancel button from timeout page definition
                timeout_button = page_definitions[FormPage.TIMEOUT.value]['buttons'][0]
                logger.info(f"timeout_button: {timeout_button}")
                self.browser.click(f"#{timeout_button['id']}")
                self.browser.wait(1)
                
                # Create modified start page data for retrieval
                start_page_data = test_data[FormPage.START.value].copy()
                start_page_data['button_clicks'] = [1]  # Force retrieve button (index 1)
                
                # Re-run start page process with modified data
                logger.info("Re-running start page process...")
                self.field_values = start_page_data
                self.handle_start_page(page_definitions[FormPage.START.value])
                self.browser.wait(0.5)
                
                # Re-run retrieve page with stored application ID
                logger.info("Re-running retrieve page process...")
                retrieve_page_data = test_data[FormPage.RETRIEVE.value].copy()
                retrieve_page_data['application_id'] = self.application_id
                self.field_values = retrieve_page_data
                self.handle_retrieve_page(page_definitions[FormPage.RETRIEVE.value])
                self.browser.wait(0.5)
                
                # Navigate back to the page where timeout occurred
                if current_page:
                    form_mapping = FormMapping()
                    page_url = form_mapping.page_urls.get(current_page.value)
                    if page_url:
                        logger.info(f"Returning to page where timeout occurred: {page_url}")
                        self.browser.navigate(page_url)
                        self.browser.page.wait_for_load_state("networkidle")
                        self.browser.wait(1)

            # Handle start/retrieve/security pages first
            logger.info("Processing start page...")
            page_data = test_data[FormPage.START.value]
            self.field_values = page_data
            self.handle_start_page(page_definitions[FormPage.START.value])
            self.browser.wait(0.5)

            # Handle either retrieve or security page
            is_new_application = page_data['button_clicks'][0] == 0
            second_page = FormPage.SECURITY if is_new_application else FormPage.RETRIEVE
            
            logger.info(f"Processing {second_page.value}...")
            page_data = test_data[second_page.value]
            self.field_values = page_data
            self.handle_retrieve_page(page_definitions[second_page.value])
            self.browser.wait(2)

            # Get form mapping for URLs
            form_mapping = FormMapping()

            # Process remaining pages in sequence
            page_sequence = [
                FormPage.PERSONAL1.value,  # p1
                FormPage.PERSONAL2.value,  # p2
                FormPage.TRAVEL.value,  # p3
                FormPage.TRAVEL_COMPANIONS.value,  # p4
                FormPage.PREVIOUS_TRAVEL.value,  # p5
                FormPage.ADDRESS_PHONE.value,  # p6
                FormPage.PPTVISA.value,  # p7
                FormPage.USCONTACT.value,  # p8
                FormPage.RELATIVES.value,  # p9
                FormPage.SPOUSE.value,  # p18
                FormPage.WORK_EDUCATION1.value,  # p10
                FormPage.WORK_EDUCATION2.value,  # p11
                FormPage.WORK_EDUCATION3.value,  # p12
                FormPage.SECURITY_BACKGROUND1.value,  # p13
                FormPage.SECURITY_BACKGROUND2.value,  # p14
                FormPage.SECURITY_BACKGROUND3.value,  # p15
                FormPage.SECURITY_BACKGROUND4.value,  # p16
                FormPage.SECURITY_BACKGROUND5.value  # p17
            ]

            for page_name in page_sequence:
                retry_count = 0
                max_retries = 3
                
                while retry_count < max_retries:
                    try:
                        if page_name not in test_data:
                            logger.warning(f"Skipping {page_name} - not found in test data")
                            continue
                        if page_name not in page_definitions:
                            logger.warning(f"Skipping {page_name} - no page definition found")
                            continue
                            
                        # Get the FormPage enum directly from the page_name
                        current_page = None
                        for enum_member in FormPage:
                            if enum_member.value == page_name:
                                current_page = enum_member
                                break
                        
                        if not current_page:
                            logger.error(f"Invalid page name mapping: {page_name}")
                            continue
                            
                        # Navigate to page URL
                        page_url = form_mapping.page_urls.get(page_name)
                        if page_url:
                            logger.info(f"Navigating to {page_url}")
                            self.browser.navigate(page_url)
                            self.browser.page.wait_for_load_state("networkidle")
                            self.browser.wait(1)
                            
                            # Verify we landed on the correct page
                            if not self.browser.verify_page(current_page):
                                logger.error(f"Failed to verify page after navigation: {page_name}")
                                continue
                        else:
                            logger.warning(f"No URL found for page {page_name}")
                            continue
                            
                        logger.info(f"Processing {page_name}...")
                        self.current_page = current_page
                        self.field_values = test_data[page_name]
                        self.fill_form(page_definitions[page_name])
                        self.handle_page_navigation(page_definitions[page_name])  # Pass page definition
                        self.browser.wait(0.5)

                        # Add timeout detection after each page action
                        if self.browser.page.url.endswith("SessionTimedOut.aspx"):
                            logger.warning(f"Session timeout detected on page {page_name}")
                            handle_timeout_recovery(self.current_page)
                            retry_count += 1
                            continue
                        
                        break  # Success - exit retry loop
                        
                    except Exception as e:
                        if "timeout" in str(e).lower() or self.browser.page.url.endswith("SessionTimedOut.aspx") or self.browser.page.url.endswith("Default.aspx"):
                            if retry_count < max_retries - 1:
                                logger.warning(f"Timeout detected, attempt {retry_count + 1} of {max_retries}")
                                handle_timeout_recovery(self.current_page)
                                retry_count += 1
                                continue
                        raise  # Re-raise other exceptions
                    
                if retry_count == max_retries:
                    raise Exception(f"Failed to recover from timeout after {max_retries} attempts")

            # After processing all pages, log error summary if any errors occurred
            if self.page_errors:
                logger.error("\n=== FORM VALIDATION ERROR SUMMARY ===")
                for page, errors in self.page_errors.items():
                    logger.error(f"\nPage: {page}")
                    for i, error in enumerate(errors, 1):
                        logger.error(f"{i}. {error}")
                logger.error("\n===================================")

        except Exception as e:
            logger.error(f"Error processing forms: {str(e)}")
            raise

    def handle_page_navigation(self, page_definition: dict) -> None:
        """Handle standard page navigation including continue page handling"""
        try:
            button_clicks = self.field_values.get('button_clicks', [])
            for i, button_index in enumerate(button_clicks):
                button = page_definition['buttons'][button_index]
                logger.info(f"Clicking button: {button['value']}")
                self.browser.click(f"#{button['id']}")
                self.browser.wait(1)
                
                # Check for validation errors
                error_messages = []
                
                # Check validation summary
                validation_summary = self.browser.page.locator(".validation-summary-errors")
                if validation_summary.count() > 0:
                    for error in validation_summary.locator("li").all():
                        error_messages.append(error.text_content())
                
                # Check individual field errors
                field_errors = self.browser.page.locator(".error-message")
                if field_errors.count() > 0:
                    for error in field_errors.all():
                        if error.is_visible():
                            error_messages.append(error.text_content())
                
                if error_messages:
                    if self.current_page.value not in self.page_errors:
                        self.page_errors[self.current_page.value] = []
                    self.page_errors[self.current_page.value].extend(error_messages)
                    logger.warning(f"Validation errors found on {self.current_page.value}: {error_messages}")

                # Rest of the continue page handling remains the same
                if i < len(button_clicks) - 1:
                    try:
                        continue_button = self.browser.page.locator("#ctl00_btnContinueApp")
                        if continue_button:
                            logger.info("Continue page detected, clicking Continue Application")
                            continue_button.click()
                            self.browser.wait(1)
                    except:
                        logger.info("Not on continue page, continue normal flow")
                        pass

        except Exception as e:
            logger.error(f"Error during page navigation: {str(e)}")
            raise

    def handle_field(self, field_id: str, field_type: str, value: Any) -> None:
        try:
            logger.info(f"Handling field {field_id} of type {field_type} with value {value}")
            
            # Check if element exists first
            element = self.browser.page.locator(f"#{field_id}")
            if not element.count():
                logger.warning(f"Field {field_id} not found, skipping...")
                return
            
            # Check if element is disabled
            is_disabled = self.browser.page.evaluate(f"""() => {{
                const el = document.getElementById('{field_id}');
                return el && (el.disabled || el.hasAttribute('disabled'));
            }}""")
            
            if is_disabled:
                logger.warning(f"Field {field_id} is disabled, skipping...")
                return

            # Determine wait time based on page and field type
            wait_time = 0.5  # Default wait time
            # if self.current_page == FormPage.TRAVEL:
            #     if field_type == 'radio':
            #         wait_time = 3
            #     elif field_type == 'dropdown':
            #         wait_time = 4
            #     elif field_type == 'checkbox':
            #         wait_time = 2
            #     else:  # text, textarea
            #         wait_time = 2

            # Handle field based on type
            try:
                if field_type == 'radio':
                    self.browser.click(f"#{field_id}")
                elif field_type == 'dropdown':
                    self.browser.select_dropdown_option(f"#{field_id}", str(value))
                elif field_type == 'checkbox':
                    checkbox_value = value if isinstance(value, bool) else str(value).lower() == 'true'
                    if checkbox_value:
                        logger.info(f"checkbox value: {checkbox_value}")
                        self.browser.click(f"#{field_id}")
                else:  # text, textarea
                    self.browser.fill_input(f"#{field_id}", str(value))

                # Apply the determined wait time
                self.browser.wait(wait_time)
                
            except Exception as e:
                logger.warning(f"Failed to interact with field {field_id}: {str(e)}, skipping...")
                return
            
        except Exception as e:
            logger.error(f"Error handling field {field_id}: {str(e)}")
            # Don't raise the exception, just log it and continue
            return

    def handle_start_page(self, form_data: dict) -> bool:
        """Handle start page with CAPTCHA validation and retry logic"""
        logger.info("Starting to process start page...")
        max_retries = 5
        
        for attempt in range(max_retries):
            try:
                # Fill language and location fields
                language_field = self.browser.page.locator('#ctl00_ddlLanguage')
                location_field = self.browser.page.locator('#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation')
                
                language_field.select_option(self.field_values.get('language', 'English'))
                location_field.select_option(self.field_values.get('location', 'ENGLAND, LONDON'))
                self.browser.wait(1)
                
                # Handle CAPTCHA
                captcha_base64 = self.browser.get_captcha_image()
                openai_handler = OpenAIHandler(os.getenv('OPENAI_API_KEY'))
                captcha_text = openai_handler.solve_captcha(captcha_base64)
                self.browser.fill_captcha(captcha_text)
                self.browser.wait(0.5)

                # Get button index from input data
                button_index = self.field_values['button_clicks'][0]
                button = form_data['buttons'][button_index]
                self.browser.click(f"#{button['id']}")
                self.browser.wait(1)  # Wait longer to check for errors

                # Check for CAPTCHA error
                error_message = self.browser.page.locator(".error-message").first
                if error_message and error_message.is_visible():
                    error_text = error_message.text_content()
                    if "CAPTCHA" in error_text or "code" in error_text.lower():
                        logger.warning(f"CAPTCHA attempt {attempt + 1} failed. Error: {error_text}")
                        if attempt < max_retries - 1:
                            logger.info("Retrying CAPTCHA...")
                            continue
                        else:
                            raise ValueError("Max CAPTCHA retries exceeded")

                # If we get here, CAPTCHA was successful
                logger.info("CAPTCHA validation successful")
                return True

            except Exception as e:
                logger.error(f"Error during start page handling (attempt {attempt + 1}): {str(e)}")
                if attempt < max_retries - 1:
                    logger.info("Retrying entire start page process...")
                    # Refresh page to get new CAPTCHA
                    self.browser.page.reload()
                    self.browser.wait(1)
                else:
                    raise ValueError(f"Failed to process start page after {max_retries} attempts")

        return False

    def fill_text_field(self, field_name: str, value: str, maxlength: int = None) -> None:
        """Fill a text input field with validation for maxlength"""
        if maxlength:
            maxlength = int(maxlength)  # Convert string maxlength to integer
            if len(str(value)) > maxlength:
                raise ValueError(f"Value '{value}' exceeds maximum length of {maxlength}")
        
        selector = f"#{field_name}"
        self.browser.fill_input(selector, str(value))
        logger.info(f"Filled text field '{field_name}' with value '{value}'")

    def select_dropdown(self, field_name: str, value: str, valid_values: list) -> None:
        """Select a dropdown option with validation"""
        if value not in valid_values:
            logger.error(f"Invalid value {value} for dropdown {field_name}")
            return
        selector = f"#{field_name}"
        self.browser.select_dropdown_option(selector, value)

    def select_radio(self, field_name: str, value: str, field_def: dict) -> None:
        """Select a radio button option with validation"""
        if value not in field_def["value"]:
            logger.error(f"Invalid value {value} for radio {field_name}")
            return
        
        # Get the specific button ID for this value
        button_id = field_def["button_ids"][value]
        self.browser.click(f"#{button_id}")

    def check_checkbox(self, field_name: str, value: bool) -> None:
        """Check/uncheck a checkbox"""
        selector = f"#{field_name}"
        if value:
            self.browser.check_checkbox(selector)

    def get_field_value(self, field_name: str) -> Any:
        """Get the current value of a field"""
        return self.field_values.get(field_name)

    def fill_form(self, form_data: Dict[str, Any]) -> None:
        """Fill form fields based on field type"""
        try:
            logger.info(f"Starting to fill form with form definition containing {len(form_data.get('fields', []))} fields")
            
            form_mapping = FormMapping()
            page_mappings = form_mapping.form_mapping.get(self.current_page, {})
            
            processed_fields = set()
            logger.info(f"All field_def: {form_data.get('fields')}")
            
            for field_def in form_data.get('fields', []):
                logger.info(f"Starting Field: {field_def.get('name')} processed fields: {processed_fields}")
                self._process_field_and_dependencies(
                    field_def,
                    page_mappings,
                    form_data.get('dependencies', {}),
                    processed_fields
                )
            
        except Exception as e:
            logger.error(f"Error filling form: {str(e)}")
            raise

    def _process_field_and_dependencies(self, field_def: Dict[str, Any], page_mappings: Dict[str, str], 
                                      dependencies: Dict[str, Any], processed_fields: Set[str]) -> None:
        field_id = field_def['name']
        logger.info(f'at begining of _process_field.. with field_id: {field_id}')
        if field_id in processed_fields:
            return
        
        processed_fields.add(field_id)
        
        field_name = next((k for k, v in page_mappings.items() if (v == field_id or v == field_id.replace('$','_'))), None)
        
        if field_name:
            value = self._get_nested_value(field_name)
            #logger.info(f'Got nested value: {value} for field_name: {field_name}')
            if value is not None:
                logger.info(f"Filling field {field_name} ({field_id}) with value {value}")
                if field_def['type'] == 'radio':
                    field_id = field_def.get('button_ids', {}).get(str(value))
                self.handle_field(field_id, field_def['type'], value)
                self.browser.wait(0.1)
                #logger.info(f'dependencies are: {dependencies}')
                dependency_key = f"{field_id}.{value}"
                if dependencies and dependency_key in dependencies:
                    dependency_data = dependencies.get(dependency_key, [])
                    #logger.info(f'dependency data for {dependency_key}: {dependency_data}')
                    for dependent_field in dependency_data.get('shows', []):
                        if dependent_field:
                            self._process_field_and_dependencies(
                                dependent_field,
                                page_mappings,
                                dependency_data.get('dependencies', {}),
                                processed_fields
                            )

    def handle_retrieve_page(self, form_data: dict) -> bool:
        """Handle either retrieve or security page process"""
        logger.info("Starting to process retrieve/security page...")
        
        if not self.browser:
            logger.error("Browser not initialized")
            raise ValueError("Browser not set")
        
        try:
            # Store application ID when first retrieving
            self.application_id = self.field_values.get('application_id')
            
            # Determine if this is retrieve or security page based on field values
            is_retrieve = 'application_id' in self.field_values
            
            if is_retrieve:
                # Stage 1: Enter application ID
                logger.info("Processing retrieve page - Stage 1: Entering application ID...")
                app_id_field = "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_tbxApplicationID"
                application_id = self.field_values.get('application_id')
                logger.info(f"Application ID: {application_id}")
                if not application_id:
                    raise ValueError("Application ID is required in retrieve_page section of YAML")
                
                # Fill application ID
                self.fill_text_field(app_id_field, application_id)
                
                # Click first retrieve button
                button_index = 0  # Get first button click index from input
                logger.info(f"Clicking initial retrieve button...{form_data['buttons'][button_index]['id']}")
                self.browser.click(f"#{form_data['buttons'][button_index]['id']}")
                
                # Wait for security fields to appear
                logger.info("Waiting for security fields to appear...")
                self.browser.wait(3)  # Initial wait
                
                # Wait for surname field to be visible before proceeding
                surname_field = "#ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbSurname"
                try:
                    self.browser.page.wait_for_selector(surname_field, state="visible", timeout=10000)
                except Exception as e:
                    logger.error(f"Security fields did not appear after clicking retrieve: {str(e)}")
                    raise
                
                # Stage 2: Fill security fields
                logger.info("Stage 2: Filling security fields...")
                security_fields = {
                    "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbSurname": self.field_values.get('surname'),
                    "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbDOBYear": self.field_values.get('year'),
                    "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbAnswer": self.field_values.get('security_answer')
                }
                
                for field_id, value in security_fields.items():
                    if not value:
                        logger.warning(f"Missing value for field: {field_id}")
                        continue
                    self.handle_field(field_id, 'text', value)

            else:
                # Handle security page for new applications
                logger.info("Processing security page...")
                
                # Handle privacy agreement checkbox using handle_field
                if self.field_values.get('privacy_agreement'):
                    self.handle_field("ctl00_SiteContentPlaceHolder_chkbxPrivacyAct", 'checkbox', True)
                    logger.info("privacy agreement checkbox checked..waiting for 5 seconds")
                    self.browser.wait(5)  # Extra wait after checkbox
                    
                # Select security question
                security_question = self.field_values.get('security_question')
                if security_question:
                    self.handle_field("ctl00_SiteContentPlaceHolder_ddlQuestions", 'dropdown', security_question)
                    logger.info("security question selected..waiting for 5 seconds")
                    self.browser.wait(5)  # Extra wait after checkbox
                    
                # Fill security answer
                security_answer = self.field_values.get('security_answer')
                if security_answer:
                    self.handle_field("ctl00_SiteContentPlaceHolder_txtAnswer", 'text', security_answer)
                    logger.info("security answer filled..waiting for 5 seconds")
                    self.browser.wait(5)  # Extra wait after checkbox

            # Click final button
            button_index = self.field_values['button_clicks'][-1]  # Get last button click index
            button_id = form_data['buttons'][button_index]['id']
            logger.info(f"Clicking final button: {button_id}")
            self.browser.click(f"#{button_id}")
            self.browser.wait(3)  # Wait for page transition
                
            logger.info("Page processing completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error processing page: {str(e)}")
            raise

    def _get_nested_value(self, field_name: str) -> Any:
        """Get value from nested dictionary using dot notation"""
        parts = field_name.split('.')
        value = self.field_values
        for part in parts:
            #logger.info(f'inside get_nested - part: {part} value: {value}')
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return None
        return value