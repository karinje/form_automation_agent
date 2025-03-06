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
import asyncio

logger = logging.getLogger(__name__)

class FormHandler:
    def __init__(self, progress_queue=None):
        self.field_values = {}
        self.browser = None
        self.current_page = None
        self.application_id = None
        self.page_errors = {}  # Track errors by page
        self.processed_array_indices = {}
        self.completed_pages = set()  # Track successfully completed pages
        self.errored_pages = set()  # Track pages with errors
        self.skipped_pages = set()  # Track skipped pages
        # Initialize OpenAIHandler without arguments
        self.openai_handler = OpenAIHandler()  # Changed from OpenAIHandler(self)
        
        # Add progress queue
        self.progress_queue = progress_queue
        self.page_completion_messages_sent = set()  # Track pages where completion message was already sent

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
                if self.browser.page.url.endswith("SessionTimedOut.aspx"):
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
            await self.send_progress("Starting DS-160 process...")
            logger.info("Processing start page...")
            page_data = test_data['start_page']  # Use YAML key
            self.field_values = page_data
            await self.handle_start_page(page_definitions[FormPage.START.value])  # Use 'start_page'
            await self.send_progress("Start page completed successfully")
            await self.browser.wait(0.5)

            # Handle either retrieve or security page
            is_new_application = page_data['button_clicks'][0] == 0
            second_page = FormPage.SECURITY.value if is_new_application else FormPage.RETRIEVE.value
            
            await self.send_progress(f"Processing {second_page}...")
            logger.info(f"Processing {second_page}...")
            page_data = test_data[second_page]  # Use YAML key
            self.field_values = page_data
            await self.handle_retrieve_page(page_definitions[second_page])  # Use 'security_page'
            await self.send_progress(f"{second_page} completed successfully")
            await self.browser.wait(1)

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
                            await self.send_progress(f"Skipping {page_name} - not found in test data")
                            self.skipped_pages.add(page_name)
                            break

                        # Navigate to page URL first
                        page_url = form_mapping.page_urls.get(page_name)
                        if page_url:
                            # Check if we're already on the correct page
                            current_url = self.browser.page.url
                            if not current_url.endswith(page_url.split('/')[-1]):
                                logger.info(f"Navigating to {page_url}")
                                #await self.send_progress(f"Navigating to {page_name}...")
                                await self.browser.navigate(page_url)
                                await self.browser.page.wait_for_load_state("networkidle")
                                await self.browser.wait(0.3)
                            else:
                                logger.info(f"Already on correct page: {page_url}")
                        else:
                            logger.warning(f"No URL found for page {page_name}")
                            await self.send_progress(f"Error: No URL found for page {page_name}")
                            break

                        logger.info(f"Processing {page_name}...")
                        await self.send_progress(f"Processing {page_name}...")
                        self.current_page = page_name
                        self.field_values = test_data[page_name]
                        
                        # Fill form and handle navigation
                        await self.fill_form(page_definitions[page_name])
                        await self.browser.wait(0.1)
                        
                        # Process navigation and detect errors
                        has_errors = await self.handle_page_navigation(page_definitions[page_name])
                        await self.browser.wait(0.1)
                        
                        # Handle the result based on whether errors were detected
                        if has_errors:
                            # Add page to errored pages, not completed pages
                            self.errored_pages.add(page_name)
                            await self.send_progress(
                                f"Validation errors on {page_name}: {len(self.page_errors[page_name])} issues found", 
                                status="warning"
                            )
                            # We continue to the next page even with errors
                        else:
                            # Only mark as completed if no validation errors
                            self.completed_pages.add(page_name)
                            if page_name not in self.page_completion_messages_sent:
                                await self.send_progress(f"Completed {page_name} successfully")
                                self.page_completion_messages_sent.add(page_name)

                        # Add timeout detection after each page action
                        if self.browser.page.url.endswith("SessionTimedOut.aspx") or self.browser.page.url.endswith("Default.aspx"):
                            logger.warning(f"Session timeout detected on page {page_name}")
                            await self.send_progress(f"Session timeout detected on {page_name}, recovering...")
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
                                await self.send_progress(f"Timeout detected on {page_name}, attempt {retry_count + 1} of {max_retries}")
                                await handle_timeout_recovery(self.current_page)
                                retry_count += 1
                                continue
                        
                        # Add to errored pages
                        self.errored_pages.add(page_name)
                        await self.send_progress(f"Error on {page_name}: {str(e)}", status="error")
                        raise  # Re-raise other exceptions

                if retry_count == max_retries:
                    self.errored_pages.add(page_name)
                    await self.send_progress(f"Failed to recover from timeout on {page_name} after {max_retries} attempts", status="error")
                    raise Exception(f"Failed to recover from timeout after {max_retries} attempts")

            # Generate completion summary
            total_pages = len(page_sequence)
            completed_count = len(self.completed_pages)
            errored_count = len(self.errored_pages)
            skipped_count = len(self.skipped_pages)
            
            summary = f"DS-160 Processing Summary: {completed_count}/{total_pages} pages completed successfully"
            if errored_count > 0:
                summary += f", {errored_count} pages had errors"
            if skipped_count > 0:
                summary += f", {skipped_count} pages were skipped"
            
            # Determine overall status
            overall_status = "success" if errored_count <= 2 else "warning"
            
            # Send summary message
            await self.send_progress(summary, status=overall_status)
            
            # After processing all pages, send detailed error summary if errors occurred
            if self.page_errors:
                error_summary = "=== FORM VALIDATION ERROR SUMMARY ===\n"
                for page, errors in self.page_errors.items():
                    error_summary += f"\nPage: {page}\n"
                    for i, error in enumerate(errors, 1):
                        error_summary += f"{i}. {error}\n"
                error_summary += "\n=== END OF ERROR SUMMARY ==="
                
                logger.error(error_summary)
                await self.send_progress(f"Form completed with validation errors:\n{error_summary}", status="warning")
            else:
                await self.send_progress("DS-160 form completed successfully with no errors!", status="success")

            # Send final completion message
            await self.send_progress("DS-160 processing complete", status="complete", 
                                    summary={
                                        "total": total_pages,
                                        "completed": completed_count,
                                        "errors": errored_count,
                                        "skipped": skipped_count
                                    })

        except Exception as e:
            logger.error(f"Error processing forms: {str(e)}")
            await self.send_progress(f"Error processing forms: {str(e)}", status="error")
            raise

    async def handle_page_navigation(self, page_definition: dict) -> bool:
        """Handle standard page navigation including continue page handling
        Returns True if errors were found, False otherwise"""
        try:
            has_errors = False
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
                    has_errors = True
                    # Continue with navigation despite errors

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

            return has_errors  # Return whether any errors were found

        except Exception as e:
            logger.error(f"Error during page navigation: {str(e)}")
            raise

    async def handle_field(self, field_id: str, field_type: str, value: Any) -> None:
        try:
            selector = f"#{field_id}"
            logger.info(f"field_id: {field_id} field_type: {field_type} value: {value}")

            if field_type in ['text', 'textarea']:
                await self.browser.fill_input(selector, str(value))
            elif field_type == 'dropdown':
                await self.browser.wait(0.5)
                await self.browser.select_dropdown_option(selector, str(value))
            elif field_type == 'radio':
                await self.browser.click_radio(selector)
            elif field_type == 'checkbox':
                element = await self.browser.page.wait_for_selector(selector, timeout=2000)
                if element:
                    current_state = await element.is_checked()
                    if bool(value) != current_state:
                        await self.browser.click(selector)
                        await self.browser.wait(0.5)

        except Exception as e:
            logger.error(f"Error handling field {field_id}: {str(e)}")
            return

    async def handle_start_page(self, form_data: dict) -> bool:
        """Handle start page with CAPTCHA validation and retry logic"""
        logger.info("Starting to process start page...")
        await self.send_progress("Loading DS-160 start page...")
        
        max_retries = 8
        for attempt in range(max_retries):
            try:
                # First ensure we're on the start page and it's fully loaded
                if not self.browser.page.url.endswith("Default.aspx"):
                    logger.info("Navigating to DS-160 start page...")
                    await self.send_progress("Navigating to DS-160 start page...")
                    await self.browser.navigate("https://ceac.state.gov/GenNIV/Default.aspx")
                    await self.browser.page.wait_for_load_state("domcontentloaded")
                    await self.browser.wait(0.5)

                # Fill language and location fields
                language = self.field_values.get('language', 'English')
                location = self.field_values.get('location', 'HYDERABAD, INDIA')
                
                logger.info(f"Setting language to: {language}")
                await self.send_progress(f"Setting language to: {language}")
                await self.browser.page.select_option('#ctl00_ddlLanguage', language)
                await self.browser.wait(0.5)
                
                logger.info(f"Setting location to: {location}")
                await self.send_progress(f"Setting location to: {location}")
                await self.browser.page.select_option('#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation', location)
                await self.browser.wait(0.5)

                # Handle CAPTCHA
                captcha_base64 = await self.browser.get_captcha_image()
                if not captcha_base64:
                    logger.error("Failed to get CAPTCHA image")
                    #await self.send_progress("Failed to get CAPTCHA image, retrying...", status="warning")
                    continue
                
                logger.info("Got CAPTCHA image, sending to OpenAI for solving...")
                #await self.send_progress("Solving CAPTCHA with OpenAI...", status="info")
                captcha_text = await self.openai_handler.solve_captcha(captcha_base64)
                if not captcha_text:
                    logger.error("Failed to get CAPTCHA solution from OpenAI")
                    #await self.send_progress("Failed to get CAPTCHA solution, retrying...", status="warning")
                    continue
                
                # Don't send the actual CAPTCHA value to frontend
                logger.info(f"Got CAPTCHA solution: {captcha_text}")
                await self.browser.fill_captcha(captcha_text)
                await self.browser.wait(0.5)

                # Click button
                button_index = self.field_values['button_clicks'][0]
                button = form_data['buttons'][button_index]
                #await self.send_progress("Submitting CAPTCHA and proceeding...")
                await self.browser.click(f"#{button['id']}")
                await self.browser.wait(0.5)

                # Check for CAPTCHA error
                error_element = await self.browser.page.query_selector('.error-message')
                if error_element:
                    error_text = await error_element.text_content()
                    if error_text and ("CAPTCHA" in error_text or "code" in error_text.lower()):
                        logger.warning(f"CAPTCHA attempt {attempt + 1} failed. Error: {error_text}")
                        await self.send_progress(f"CAPTCHA verification failed (attempt {attempt + 1}): {error_text}", status="warning")
                        if attempt < max_retries - 1:
                            continue
                        raise Exception("Max CAPTCHA retries exceeded")

                logger.info("CAPTCHA validation successful")
                await self.send_progress("CAPTCHA validation successful")
                return True

            except Exception as e:
                logger.error(f"Error during start page handling (attempt {attempt + 1}): {str(e)}")
                await self.send_progress(f"Error on start page (attempt {attempt + 1}): {str(e)}", status="warning")
                if attempt < max_retries - 1:
                    logger.info("Retrying entire start page process...")
                    await self.send_progress("Retrying start page process...", status="info")
                    await self.browser.page.reload()
                    await self.browser.wait(1)
                else:
                    await self.send_progress(f"Failed to process start page after {max_retries} attempts", status="error")
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
            await self.browser.wait(0.2)
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
        
        if not field_name:
            return

        # Get the value to check if it's an array
        value = await self._get_nested_value(field_name)
        logger.info(f"field_name: {field_name} value: {value}")

        if isinstance(value, list) and value:
            logger.info(f"Processing array field {field_name} with {len(value)} items")
            array_name = field_name.split('.')[0]
            
            # Process first element with index 0
            await self._fill_field(field_name, field_def, value[0], page_mappings, array_index=0)
            
            # For remaining elements, check if fields exist before clicking add button
            add_button_id = field_def.get('add_group_button_id')
            if add_button_id and len(value) > 1:
                for idx in range(1, len(value)):
                    if array_name not in self.processed_array_indices:
                        self.processed_array_indices[array_name] = set()
                    
                    if idx not in self.processed_array_indices[array_name]:
                        # Check if first field for this index exists
                        new_field_id = field_def['name'].replace('_ctl00_', f'_ctl{idx:02d}_')
                        field_exists = await self.browser.page.evaluate(f"""() => {{
                            return !!document.getElementById('{new_field_id}');
                        }}""")
                        
                        if not field_exists:
                            logger.info(f"Clicking add group button {add_button_id} for item {idx}")
                            await self.browser.click(f"#{add_button_id}")
                            await self.browser.wait(1)
                        else:
                            logger.info(f"Field for index {idx} already exists, skipping add group button")
                        
                        self.processed_array_indices[array_name].add(idx)
                    
                    # Process the field for this index
                    transformed_field_def = self._transform_field_ids(field_def, idx)
                    await self._fill_field(field_name, transformed_field_def, value[idx], page_mappings, array_index=idx)
        else:
            # Process as single value
            await self._fill_field(field_name, field_def, value, page_mappings)
        
        processed_fields.add(field_id)
        
        # Process dependencies after field is filled
        if field_def['type'] == 'radio':
            # For radio buttons, use the button ID and value
            button_id = field_def.get('button_ids', {}).get(str(value))
            if button_id:
                dependency_key = f"{button_id}.{value}"
        else:
            # For other fields, use the field ID and value directly
            dependency_key = f"{field_id}.{value}"

        logger.info(f"Checking dependencies for key: {dependency_key}")
        logger.info(f"Available dependencies: {list(dependencies.keys()) if dependencies else 'None'}")
        
        if dependencies and dependency_key in dependencies:
            logger.info(f"Found dependencies for {dependency_key}: {dependencies[dependency_key]}")
            dependency_data = dependencies[dependency_key]
            for dependent_field in dependency_data.get('shows', []):
                if dependent_field:
                    logger.info(f"Processing dependent field: {dependent_field}")
                    await self.browser.wait(0.2)
                    await self._process_field_and_dependencies(
                        dependent_field,
                        page_mappings,
                        dependency_data.get('dependencies', {}),
                        processed_fields
                    )
        else:
            logger.info(f"No dependencies found for {dependency_key}")

    async def _fill_field(self, field_name: str, field_def: Dict[str, Any], value: Any, 
                         page_mappings: Dict[str, str], array_index: int = None) -> None:
        field_id = field_def['name']
        
        # For radio buttons, use the specific button ID
        if field_def['type'] == 'radio' and isinstance(value, str):
            field_id = field_def.get('button_ids', {}).get(value)
            if not field_id:
                logger.error(f"No button ID found for radio value {value}")
                return
        
        # Get NA value - check both direct NA field and base field NA
        na_field_name = f"{field_name}_na"
        base_field = field_name.split('.')[0]  # Get base field name after last dot
        base_na_field = f"{base_field}_na"
        
        # Try direct NA field first, then base NA field
        na_value = await self._get_nested_value(na_field_name)
        if na_value is None:
            na_value = await self._get_nested_value(base_na_field)
        
        # If this is an array item, get the specific NA value for this index
        if isinstance(na_value, list) and array_index is not None:
            na_value = na_value[array_index] if array_index < len(na_value) else None
        
        logger.info(f"processing {field_name} with value: {value} and na_value: {na_value}")
        
        # Process NA checkbox if present
        if na_value is not None:
            # Try both direct and base NA field mappings
            na_field_id = page_mappings.get(f"{field_name}_na") or page_mappings.get(f"{base_field}_na")
            if na_field_id:
                # Transform NA field ID for array items
                if array_index is not None and array_index > 0:
                    na_field_id = na_field_id.replace('_ctl00_', f'_ctl{array_index:02d}_')
                
                should_check = str(na_value).lower() == 'true'
                logger.info(f"processing na_field_id: {na_field_id} with value: {na_value} and should_check: {should_check}")
                await self.handle_field(na_field_id, 'checkbox', should_check)
        
        # Only fill value if not NA
        if not na_value or str(na_value).lower() != 'true':
            await self.handle_field(field_id, field_def['type'], value)

    async def _get_nested_value(self, field_name: str) -> Any:
        """Get value from nested YAML structure using dot notation, handling arrays"""
        parts = field_name.split('.')
        value = self.field_values
        
        # If requesting just the array itself (e.g., license_details)
        if len(parts) == 1:
            return value.get(parts[0])
        
        # Handle array access
        array_name = parts[0]
        if array_name in value and isinstance(value[array_name], list):
            array = value[array_name]
            remaining_parts = parts[1:]
            
            # Extract nested values from each array item
            result = []
            for item in array:
                current = item
                for part in remaining_parts:
                    if not isinstance(current, dict):
                        break
                    current = current.get(part)
                if current is not None:
                    result.append(current)
            return result
        
        # Handle regular nested field access
        for part in parts:
            if not value or not isinstance(value, dict):
                return None
            value = value.get(part)
        
        return value

    async def handle_retrieve_page(self, form_data: dict) -> bool:
        """Handle either retrieve or security page process"""
        logger.info("Starting to process retrieve/security page...")
        
        try:
            # For new applications, get and store the application ID from security page
            if self.test_data['start_page']['button_clicks'][0] == 0:  # New application
                try:
                    barcode_element = await self.browser.page.wait_for_selector(
                        "#ctl00_SiteContentPlaceHolder_lblBarcode",
                        timeout=2000
                    )
                    if barcode_element:
                        application_id = await barcode_element.text_content()
                        if application_id:
                            # Update the application_id in retrieve_page data
                            if 'retrieve_page' in self.test_data:
                                self.test_data['retrieve_page']['application_id'] = application_id
                                logger.info(f"Updated application ID to: {application_id}")
                                
                                # Send the application ID to the frontend
                                await self.send_progress(
                                    f"Retrieved application ID: {application_id}",
                                    status="application_id",
                                    application_id=application_id
                                )
                except Exception as e:
                    logger.warning(f"Could not get application ID: {str(e)}")

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
                await self.browser.wait(1)  # Initial wait
                
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
                    await self.browser.wait(1)  # Extra wait after checkbox
                    
                # Select security question
                security_question = self.field_values.get('security_question')
                if security_question:
                    await self.browser.select_dropdown_option("#ctl00_SiteContentPlaceHolder_ddlQuestions", security_question)
                    await self.browser.wait(1)
                    
                # Fill security answer
                security_answer = self.field_values.get('security_answer')
                if security_answer:
                    await self.browser.fill_input("#ctl00_SiteContentPlaceHolder_txtAnswer", security_answer)
                    await self.browser.wait(1)

            # Click continue button
            button_index = self.field_values['button_clicks'][-1]
            button_id = form_data['buttons'][button_index]['id']
            logger.info(f"Clicking retrieve/security continue button: {button_id}")
            await self.browser.click(f"#{button_id}")
            await self.browser.wait(1)
                
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
                await self.browser.wait(0.5)  # Extra wait after checkbox
                
            # Select security question
            security_question = self.field_values.get('security_question')
            if security_question:
                await self.browser.select_dropdown_option("#ctl00_SiteContentPlaceHolder_ddlQuestions", security_question)
                await self.browser.wait(1)
                
            # Fill security answer
            security_answer = self.field_values.get('security_answer')
            if security_answer:
                await self.browser.fill_input("#ctl00_SiteContentPlaceHolder_txtAnswer", security_answer)
                await self.browser.wait(0.5)

            # Click continue button
            button_index = self.field_values['button_clicks'][-1]
            button_id = form_data['buttons'][button_index]['id']
            await self.browser.click(f"#{button_id}")
            await self.browser.wait(0.5)
            
            logger.info("Security page completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error processing security page: {str(e)}")
            raise

    def _transform_field_ids(self, field_def: Dict[str, Any], index: int) -> Dict[str, Any]:
        """Transform field IDs by replacing _ctl00_ with _ctlXX_ in the middle of the ID"""
        new_def = field_def.copy()
        
        # Transform the main field ID
        if 'name' in new_def:
            new_def['name'] = new_def['name'].replace('_ctl00_', f'_ctl{index:02d}_')
        
        # Also transform any na_checkbox_id if present
        if 'na_checkbox_id' in new_def:
            new_def['na_checkbox_id'] = new_def['na_checkbox_id'].replace('_ctl00_', f'_ctl{index:02d}_')
        
        return new_def

    # Add a helper method to send progress updates
    async def send_progress(self, message, status="info", application_id=None, summary=None):
        """Send progress update to queue if available"""
        if self.progress_queue:
            # Skip captcha value messages
            if "CAPTCHA solution:" in message:
                return
                
            progress_data = {"status": status, "message": message}
            if application_id:
                progress_data["application_id"] = application_id
            if summary:
                progress_data["summary"] = summary
            await self.progress_queue.put(progress_data)
            
    # Add a new method to run with browser context manager
    async def process_with_browser(self, browser_handler, test_data, page_definitions):
        """Process form with a browser context manager and report progress"""
        async with browser_handler as browser:
            self.set_browser(browser)
            await self.send_progress("Browser initialized and ready")
            await self.process_form_pages(test_data, page_definitions)
            await self.send_progress("DS-160 form processing completed", status="complete")
        return True