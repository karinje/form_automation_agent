from typing import Dict, Any, List, Set
import logging
from enum import Enum
from mappings.form_mapping import FormMapping, FormPage
import json
import os
from utils.openai_handler import OpenAIHandler
import time
from mappings.page_mappings.personal_page1_mapping import form_mapping as personal_page1_mapping
# Import other page mappings...

logger = logging.getLogger(__name__)

class FormHandler:
    def __init__(self):
        self.field_values = {}
        self.browser = None
        self.current_page = None
        self.application_id = None
        self.page_errors = {}  # Track errors by page
        # Initialize OpenAIHandler without arguments
        self.openai_handler = OpenAIHandler()  # Changed from OpenAIHandler(self)

    def set_browser(self, browser):
        self.browser = browser

    async def process_form_pages(self, test_data: dict, page_definitions: dict) -> None:
        """Process all form pages in sequence"""
        try:
            # Store original test_data for recovery
            self.test_data = test_data
            self.page_definitions = page_definitions
            
            async def handle_timeout_recovery(current_page):
                logger.info("Detected timeout page, initiating recovery...")
                # Click cancel button from timeout page definition
                timeout_button = self.page_definitions[FormPage.TIMEOUT.value]['buttons'][0]
                logger.info(f"timeout_button: {timeout_button}")
                await self.browser.click(f"#{timeout_button['id']}")
                await self.browser.wait(1)
                
                # Create modified start page data for retrieval
                start_page_data = self.test_data[FormPage.START.value].copy()
                start_page_data['button_clicks'] = [1]  # Force retrieve button (index 1)
                
                # Re-run start page process with modified data
                logger.info("Re-running start page process...")
                self.field_values = start_page_data
                await self.handle_start_page(self.page_definitions[FormPage.START.value])
                await self.browser.wait(0.5)
                
                # Re-run retrieve page with stored application ID
                logger.info("Re-running retrieve page process...")
                retrieve_page_data = self.test_data[FormPage.RETRIEVE.value].copy()
                retrieve_page_data['application_id'] = self.application_id
                self.field_values = retrieve_page_data
                await self.handle_retrieve_page(self.page_definitions[FormPage.RETRIEVE.value])
                await self.browser.wait(0.5)
                
                # Navigate back to the page where timeout occurred
                if current_page:
                    form_mapping = FormMapping()
                    page_url = form_mapping.page_urls.get(current_page)
                    logger.info(f"current page: {current_page}, page_url: {page_url}")
                    if page_url:
                        logger.info(f"Returning to page where timeout occurred: {page_url}")
                        await self.browser.navigate(page_url)
                        await self.browser.page.wait_for_load_state("networkidle")
                        await self.browser.wait(1)

            # Handle start/retrieve/security pages first
            logger.info("Processing start page...")
            page_data = test_data['start_page']  # Use YAML key
            self.field_values = page_data
            await self.handle_start_page(page_definitions[FormPage.START.value])  # Use 'start_page'
            self.browser.wait(0.5)

            # Handle either retrieve or security page
            is_new_application = page_data['button_clicks'][0] == 0
            second_page = FormPage.SECURITY.value if is_new_application else FormPage.RETRIEVE.value
            
            logger.info(f"Processing {second_page}...")
            page_data = test_data[second_page]  # Use YAML key
            self.field_values = page_data
            await self.handle_retrieve_page(page_definitions[second_page])  # Use 'security_page'
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
                            break

                        # Navigate to page URL first
                        page_url = form_mapping.page_urls.get(page_name)
                        if page_url:
                            logger.info(f"Navigating to {page_url}")
                            await self.browser.navigate(page_url)
                            await self.browser.page.wait_for_load_state("networkidle")
                            await self.browser.wait(1)
                        else:
                            logger.warning(f"No URL found for page {page_name}")
                            break

                        logger.info(f"Processing {page_name}...")
                        self.current_page = page_name
                        self.field_values = test_data[page_name]
                        await self.fill_form(page_definitions[page_name])
                        await self.handle_page_navigation(page_definitions[page_name])
                        await self.browser.wait(0.5)

                        # Add timeout detection after each page action
                        if self.browser.page.url.endswith("SessionTimedOut.aspx"):
                            logger.warning(f"Session timeout detected on page {page_name}")
                            await handle_timeout_recovery(self.current_page)
                            retry_count += 1
                            continue

                        break  # Success - exit retry loop

                    except Exception as e:
                        if ("timeout" in str(e).lower() or 
                            self.browser.page.url.endswith("SessionTimedOut.aspx") or 
                            self.browser.page.url.endswith("Default.aspx")):
                            
                            if retry_count < max_retries - 1:
                                logger.warning(f"Timeout detected, attempt {retry_count + 1} of {max_retries}")
                                await handle_timeout_recovery(self.current_page)
                                retry_count += 1
                                continue
                        raise  # Re-raise other exceptions

                if retry_count == max_retries:
                    raise Exception(f"Failed to recover from timeout after {max_retries} attempts")

            # After processing all pages, log error summary if any errors occurred
            if self.page_errors:
                logger.error("\n    === FORM VALIDATION ERROR SUMMARY ===")
                for page, errors in self.page_errors.items():
                    logger.error(f"\nPage: {page}")
                    for i, error in enumerate(errors, 1):
                        logger.error(f"{i}. {error}")
                logger.error("\n===================================")

        except Exception as e:
            logger.error(f"Error processing forms: {str(e)}")
            raise

    async def handle_page_navigation(self, page_definition: dict) -> None:
        """Handle standard page navigation including continue page handling"""
        try:
            button_clicks = self.field_values.get('button_clicks', [])
            for i, button_index in enumerate(button_clicks):
                button = page_definition['buttons'][button_index]
                logger.info(f"Clicking button: {button['value']}")
                await self.browser.click(f"#{button['id']}")
                await self.browser.wait(1)
                
                # Check for validation errors
                error_messages = []
                
                # Check validation summary
                validation_summary = self.browser.page.locator(".validation-summary-errors")
                summary_count = await validation_summary.count()
                if summary_count > 0:
                    for error in await validation_summary.locator("li").all():
                        error_messages.append(await error.text_content())
                
                # Check individual field errors
                field_errors = self.browser.page.locator(".error-message")
                field_count = await field_errors.count()
                if field_count > 0:
                    for error in await field_errors.all():
                        if await error.is_visible():
                            error_messages.append(await error.text_content())
                
                if error_messages:
                    if self.current_page not in self.page_errors:
                        self.page_errors[self.current_page] = []
                    self.page_errors[self.current_page].extend(error_messages)
                    logger.warning(f"Validation errors found on {self.current_page}: {error_messages}")
                    return  # Don't proceed if there are errors

                # Handle continue page between clicks
                if i < len(button_clicks) - 1:
                    try:
                        continue_button = self.browser.page.locator("#ctl00_btnContinueApp")
                        is_visible = await continue_button.is_visible()
                        if is_visible:
                            logger.info("Continue page detected, clicking Continue Application")
                            await continue_button.click()
                            await self.browser.wait(1)
                            
                            # Wait for return to original page
                            await self.browser.page.wait_for_load_state("networkidle")
                            await self.browser.wait(1)
                    except Exception as e:
                        logger.info(f"Not on continue page or error clicking continue: {str(e)}")

        except Exception as e:
            logger.error(f"Error during page navigation: {str(e)}")
            raise

    async def handle_field(self, field_id: str, field_type: str, value: Any) -> None:
        try:
            logger.info(f"Handling field {field_id} of type {field_type} with value {value}")
            
            # Check if element exists first
            element = self.browser.page.locator(f"#{field_id}")
            if not element.count():
                logger.warning(f"Field {field_id} not found, skipping...")
                return
            
            # Check if element is disabled
            is_disabled = await self.browser.page.evaluate(f"""() => {{
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
                    await self.browser.click(f"#{field_id}")
                elif field_type == 'dropdown':
                    await self.browser.select_dropdown_option(f"#{field_id}", str(value))
                elif field_type == 'checkbox':
                    checkbox_value = value if isinstance(value, bool) else str(value).lower() == 'true'
                    if checkbox_value:
                        logger.info(f"checkbox value: {checkbox_value}")
                        await self.browser.click(f"#{field_id}")
                else:  # text, textarea
                    await self.browser.fill_input(f"#{field_id}", str(value))

                await self.browser.wait(0.1)
                
            except Exception as e:
                logger.warning(f"Failed to interact with field {field_id}: {str(e)}, skipping...")
                return
            
        except Exception as e:
            logger.error(f"Error handling field {field_id}: {str(e)}")
            # Don't raise the exception, just log it and continue
            return

    async def handle_start_page(self, form_data: dict) -> bool:
        """Handle start page with CAPTCHA validation and retry logic"""
        logger.info("Starting to process start page...")
        
        max_retries = 5
        for attempt in range(max_retries):
            try:
                # First ensure we're on the start page and it's fully loaded
                if not self.browser.page.url.endswith("Default.aspx"):
                    logger.info("Navigating to DS-160 start page...")
                    await self.browser.navigate("https://ceac.state.gov/GenNIV/Default.aspx")
                    await self.browser.page.wait_for_load_state("domcontentloaded")
                    await self.browser.wait(2)

                # Fill language and location fields
                language = self.field_values.get('language', 'English')
                location = self.field_values.get('location', 'HYDERABAD, INDIA')
                
                logger.info(f"Setting language to: {language}")
                await self.browser.page.select_option('#ctl00_ddlLanguage', language)
                await self.browser.wait(2)
                
                logger.info(f"Setting location to: {location}")
                await self.browser.page.select_option('#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation', location)
                await self.browser.wait(2)

                # Handle CAPTCHA
                captcha_base64 = await self.browser.get_captcha_image()
                if not captcha_base64:
                    logger.error("Failed to get CAPTCHA image")
                    continue
                
                logger.info("Got CAPTCHA image, sending to OpenAI for solving...")
                captcha_text = await self.openai_handler.solve_captcha(captcha_base64)
                if not captcha_text:
                    logger.error("Failed to get CAPTCHA solution from OpenAI")
                    continue
                
                logger.info(f"Got CAPTCHA solution: {captcha_text}")
                await self.browser.fill_captcha(captcha_text)
                await self.browser.wait(1)

                # Click button
                button_index = self.field_values['button_clicks'][0]
                button = form_data['buttons'][button_index]
                await self.browser.click(f"#{button['id']}")
                await self.browser.wait(1)

                # Check for CAPTCHA error
                error_element = await self.browser.page.query_selector('.error-message')
                if error_element:
                    error_text = await error_element.text_content()
                    if error_text and ("CAPTCHA" in error_text or "code" in error_text.lower()):
                        logger.warning(f"CAPTCHA attempt {attempt + 1} failed. Error: {error_text}")
                        if attempt < max_retries - 1:
                            continue
                        raise Exception("Max CAPTCHA retries exceeded")

                logger.info("CAPTCHA validation successful")
                return True

            except Exception as e:
                logger.error(f"Error during start page handling (attempt {attempt + 1}): {str(e)}")
                if attempt < max_retries - 1:
                    logger.info("Retrying entire start page process...")
                    await self.browser.page.reload()
                    await self.browser.wait(1)
                else:
                    raise Exception(f"Failed to process start page after {max_retries} attempts")

        return False

    async def fill_text_field(self, field_name: str, value: str, maxlength: int = None) -> None:
        """Fill a text input field with validation for maxlength"""
        if maxlength:
            maxlength = int(maxlength)
            if len(str(value)) > maxlength:
                raise ValueError(f"Value '{value}' exceeds maximum length of {maxlength}")
        
        selector = f"#{field_name}"
        await self.browser.fill_input(selector, str(value))
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

    async def fill_form(self, page_definition: dict) -> None:
        try:
            form_mapping = FormMapping()
            # Just use current_page directly since form_mapping now uses string keys
            page_mappings = form_mapping.form_mapping.get(self.current_page, {})
            logger.info(f"page: {self.current_page} mappings: {page_mappings}")
            logger.info(f"page_definition: {page_definition}")
            logger.info(f"field values: {self.field_values}")
            
            processed_fields = set()
            
            for field_def in page_definition['fields']:
                await self._process_field_and_dependencies(
                    field_def,
                    page_mappings,
                    page_definition.get('dependencies', {}),
                    processed_fields
                )
            
        except Exception as e:
            logger.error(f"Error filling form: {str(e)}")
            raise

    async def _process_field_and_dependencies(self, field_def: Dict[str, Any], 
                                                page_mappings: Dict[str, str],
                                                dependencies: Dict[str, Any], 
                                                processed_fields: Set[str]) -> None:
        field_id = field_def['name']
        
        if field_id in processed_fields:
            return
        
        field_name = next((k for k, v in page_mappings.items() 
                          if (v == field_id or v == field_id.replace('$','_'))), None)
        
        if field_name:
            value = await self._get_nested_value(field_name)
            if value is not None:
                logger.info(f"Filling field {field_name} ({field_id}) with value {value}")
                
                # For radio buttons, get the specific button ID
                if field_def['type'] == 'radio':
                    field_id = field_def.get('button_ids', {}).get(str(value))
                
                await self.handle_field(field_id, field_def['type'], value)
                await self.browser.wait(0.1)
                
                # Handle dependencies using the updated field_id for radio buttons
                dependency_key = f"{field_id}.{value}"
                if dependencies and dependency_key in dependencies:
                    dependency_data = dependencies.get(dependency_key, {})
                    for dependent_field in dependency_data.get('shows', []):
                        if dependent_field:
                            await self._process_field_and_dependencies(
                                dependent_field,
                                page_mappings,
                                dependency_data.get('dependencies', {}),
                                processed_fields
                            )
        
        processed_fields.add(field_id)

    async def _get_nested_value(self, field_name: str) -> Any:
        """Get value from nested YAML structure using dot notation"""
        parts = field_name.split('.')
        value = self.field_values
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        return value

    async def handle_retrieve_page(self, form_data: dict) -> bool:
        """Handle either retrieve or security page process"""
        logger.info("Starting to process retrieve/security page...")
        
        if not self.browser:
            logger.error("Browser not initialized")
            raise ValueError("Browser not set")
        
        try:
            # Determine if this is retrieve or security page based on field values
            is_retrieve = 'application_id' in self.field_values
            
            if is_retrieve:
                # Validate required fields for retrieve page
                required_fields = ['application_id', 'surname', 'year', 'security_question', 'security_answer']
                missing_fields = [f for f in required_fields if not self.field_values.get(f)]
                if missing_fields:
                    raise ValueError(f"Missing required fields for retrieve: {', '.join(missing_fields)}")

                # Stage 1: Enter application ID
                logger.info("Processing retrieve page - Stage 1: Entering application ID...")
                app_id_field = "ctl00_SiteContentPlaceHolder_ApplicationRecovery1_tbxApplicationID"
                application_id = self.field_values.get('application_id')
                logger.info(f"Application ID: {application_id}")
                
                # Fill application ID
                await self.fill_text_field(app_id_field, application_id)
                
                # Click first retrieve button
                button_index = 0  # Get first button click index from input
                logger.info(f"Clicking initial retrieve button...{form_data['buttons'][button_index]['id']}")
                await self.browser.click(f"#{form_data['buttons'][button_index]['id']}")
                
                # Wait for security fields to appear
                logger.info("Waiting for security fields to appear...")
                await self.browser.wait(3)  # Initial wait
                
                # Wait for surname field to be visible before proceeding
                surname_field = "#ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbSurname"
                try:
                    await self.browser.page.wait_for_selector(surname_field, state="visible", timeout=10000)
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
                    await self.handle_field(field_id, 'text', value)

            else:
                # Handle security page for new applications
                logger.info("Processing security page...")
                
                # Validate required fields for security page
                required_fields = ['security_question', 'security_answer']
                missing_fields = [f for f in required_fields if not self.field_values.get(f)]
                if missing_fields:
                    raise ValueError(f"Missing required fields for security page: {', '.join(missing_fields)}")
                
                # Wait for page to be ready and visible
                await self.browser.page.wait_for_load_state("networkidle")
                await self.browser.page.wait_for_selector("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct", 
                                                        state="visible", 
                                                        timeout=30000)
                
                # Handle privacy agreement checkbox
                if self.field_values.get('privacy_agreement'):
                    await self.browser.click("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct")
                    await self.browser.wait(5)  # Extra wait after checkbox
                    
                # Select security question
                security_question = self.field_values.get('security_question')
                if security_question:
                    await self.browser.select_dropdown_option("#ctl00_SiteContentPlaceHolder_ddlQuestions", security_question)
                    await self.browser.wait(5)
                    
                # Fill security answer
                security_answer = self.field_values.get('security_answer')
                if security_answer:
                    await self.browser.fill_input("#ctl00_SiteContentPlaceHolder_txtAnswer", security_answer)
                    await self.browser.wait(5)

            # Click continue button
            button_index = self.field_values['button_clicks'][-1]
            button_id = form_data['buttons'][button_index]['id']
            logger.info(f"Clicking retrieve/security continue button: {button_id}")
            await self.browser.click(f"#{button_id}")
            await self.browser.wait(3)
                
            logger.info("Second page completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error processing page: {str(e)}")
            raise

    async def handle_security_page(self, form_data: dict) -> bool:
        """Handle security page for new applications"""
        logger.info("Processing security page...")
        
        try:
            # Wait for page to be ready
            await self.browser.page.wait_for_selector("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct", timeout=30000)
            
            # Handle privacy agreement checkbox
            if self.field_values.get('privacy_agreement'):
                await self.browser.click("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct")
                await self.browser.wait(5)  # Extra wait after checkbox
                
            # Select security question
            security_question = self.field_values.get('security_question')
            if security_question:
                await self.browser.select_dropdown_option("#ctl00_SiteContentPlaceHolder_ddlQuestions", security_question)
                await self.browser.wait(5)
                
            # Fill security answer
            security_answer = self.field_values.get('security_answer')
            if security_answer:
                await self.browser.fill_input("#ctl00_SiteContentPlaceHolder_txtAnswer", security_answer)
                await self.browser.wait(5)

            # Click continue button
            button_index = self.field_values['button_clicks'][-1]
            button_id = form_data['buttons'][button_index]['id']
            await self.browser.click(f"#{button_id}")
            await self.browser.wait(3)
            
            logger.info("Security page completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error processing security page: {str(e)}")
            raise