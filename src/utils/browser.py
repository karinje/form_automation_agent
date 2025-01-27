from playwright.sync_api import sync_playwright, Browser, Page
from typing import Optional, Dict, Any
import logging
from .form_mapping import FormMapping, FormPage
import os
from dotenv import load_dotenv
from PIL import Image
import base64
import io

class BrowserHandler:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.current_page: Optional[FormPage] = None
        
        # Load base URL from environment
        load_dotenv()
        self.base_url = os.getenv('DS160_BASE_URL', 'https://ceac.state.gov/GenNIV/Default.aspx')
    
    def __enter__(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            slow_mo=50  # Add slight delay for stability
        )
        self.page = self.browser.new_page()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            self.browser.close()
        self.playwright.stop()
        
    def navigate(self, url: str):
        """Navigate to URL with error handling"""
        try:
            # Increase timeout and add retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # Navigate with longer timeout
                    self.page.goto(url, timeout=60000)  # 60 seconds
                    
                    # Wait for the language dropdown to be present and visible
                    self.page.wait_for_selector("#ctl00_ddlLanguage", 
                        state="visible", 
                        timeout=30000
                    )
                    
                    # Additional wait for page stability
                    self.page.wait_for_timeout(500)
                    logging.info(f"Successfully navigated to {url}")
                    return
                    
                except Exception as e:
                    if attempt == max_retries - 1:  # Last attempt
                        raise
                    logging.warning(f"Navigation attempt {attempt + 1} failed: {str(e)}. Retrying...")
                    self.page.wait_for_timeout(5000)  # Wait 5 seconds before retry
                
        except Exception as e:
            logging.error(f"Navigation failed after {max_retries} attempts: {str(e)}")
            raise
            
    def verify_page(self, page: FormPage) -> bool:
        """Verify we're on the expected page"""
        form_mapping = FormMapping()
        identifier = form_mapping.get_page_identifier(page)
        try:
            self.page.wait_for_selector(identifier["verify_element"], timeout=5000)
            self.current_page = page
            return True
        except Exception:
            return False
            
    def fill_field(self, selector: str, value: str):
        """Fill form field with retry logic"""
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                self.page.fill(selector, value)
                break
            except Exception as e:
                if attempt == max_attempts - 1:
                    logging.error(f"Failed to fill field {selector}: {str(e)}")
                    raise
                self.page.wait_for_timeout(1000)  # Wait 1s before retry
                
    def select_option(self, selector: str, value: str):
        """Select option from dropdown"""
        try:
            self.page.select_option(selector, value)
        except Exception as e:
            logging.error(f"Failed to select option {value} in {selector}: {str(e)}")
            raise
            
    def click_button(self, button_type: str):
        """Click navigation button"""
        selector = FormMapping.NAV_BUTTONS.get(button_type)
        if not selector:
            raise ValueError(f"Unknown button type: {button_type}")
        try:
            self.page.click(selector)
            self.page.wait_for_load_state('networkidle')
        except Exception as e:
            logging.error(f"Failed to click {button_type} button: {str(e)}")
            raise
            
    def fill_page_fields(self, page: FormPage, data: Dict[str, Any]):
        """Fill all fields on a page"""
        if not self.verify_page(page):
            raise ValueError(f"Not on expected page: {page.value}")
            
        # Process dropdown fields first
        for field_name, value in data.items():
            selector = FormMapping.get_field_selector(page, field_name)
            if not selector:
                logging.warning(f"No selector found for field: {field_name}")
                continue
                
            if isinstance(selector, str) and selector.startswith("select"):
                self.select_option(selector, str(value))
                # Add a small delay after dropdown selection
                self.page.wait_for_timeout(1000)
        
        # Then process other fields
        for field_name, value in data.items():
            selector = FormMapping.get_field_selector(page, field_name)
            if not selector or (isinstance(selector, str) and selector.startswith("select")):
                continue
                
            self.fill_field(selector, str(value))
                
    def upload_file(self, selector: str, file_path: str):
        """Handle file upload"""
        try:
            self.page.set_input_files(selector, file_path)
        except Exception as e:
            logging.error(f"Failed to upload file {file_path}: {str(e)}")
            raise 

    def check_checkbox(self, selector: str):
        """Check a checkbox"""
        try:
            self.page.check(selector)
            logging.info(f"Checked checkbox: {selector}")
        except Exception as e:
            logging.error(f"Failed to check checkbox {selector}: {str(e)}")
            raise

    def fill_input(self, selector: str, value: str):
        """Fill an input field"""
        try:
            self.page.fill(selector, value)
            logging.info(f"Filled input {selector} with value: {value}")
        except Exception as e:
            logging.error(f"Failed to fill input {selector}: {str(e)}")
            raise

    def select_dropdown_option(self, selector: str, label: str):
        """Select option from dropdown by label"""
        try:
            self.page.select_option(selector, label=label)
            logging.info(f"Selected dropdown option '{label}' for selector: {selector}")
        except Exception as e:
            logging.error(f"Failed to select dropdown option '{label}' for selector {selector}: {str(e)}")
            raise 

    def select_radio(self, selector: str, value: str, button_id: str):
        """Select a radio button by its specific button ID"""
        try:
            self.page.click(f"#{button_id}")
            logging.info(f"Selected radio button {button_id} with value: {value}")
        except Exception as e:
            logging.error(f"Failed to select radio button {button_id}: {str(e)}")
            raise

    def get_input_value(self, selector: str) -> str:
        """Get value from input field"""
        try:
            logging.debug(f"Getting input value for selector: {selector}")
            value = self.page.input_value(selector)
            logging.debug(f"Got value: {value}")
            return value
        except Exception as e:
            logging.error(f"Failed to get input value for {selector}: {str(e)}")
            return ""

    def wait(self, seconds: int):
        """Wait for specified number of seconds"""
        logging.debug(f"Waiting for {seconds} seconds...")
        self.page.wait_for_timeout(seconds * 1000)  # Convert to milliseconds
        logging.debug(f"Completed {seconds} second wait")

    def click(self, selector: str):
        """Click an element"""
        try:
            self.page.click(selector)
            logging.info(f"Clicked element: {selector}")
            return True
        except Exception as e:
            logging.error(f"Failed to click element {selector}: {str(e)}")
            raise

    def wait_for_page_load(self):
        """Wait for page to be fully loaded"""
        try:
            # Wait for network to be idle
            self.page.wait_for_load_state("domcontentloaded", timeout=30000)
            
            # Wait for no network requests for 500ms
            self.page.wait_for_load_state("networkidle", timeout=30000)
            
            # Additional wait for any JavaScript
            self.page.wait_for_timeout(2000)
            
        except Exception as e:
            logging.warning(f"Page load wait warning: {str(e)}")

    def get_captcha_image(self) -> str:
        """Get CAPTCHA image as base64 string"""
        try:
            # Find the CAPTCHA image element
            captcha_div = self.page.locator(".LBD_CaptchaImageDiv").first
            if not captcha_div:
                raise ValueError("CAPTCHA image div not found")

            # Take screenshot of the CAPTCHA
            screenshot_bytes = captcha_div.screenshot()
            # Save screenshot for testing/debugging
            with open('captcha_debug.png', 'wb') as f:
                f.write(screenshot_bytes)
            # Convert to base64
            base64_image = base64.b64encode(screenshot_bytes).decode('utf-8')
            # Save base64 for debugging
            with open('captcha_base64.txt', 'w') as f:
                f.write(base64_image)
            return base64_image
            
        except Exception as e:
            logging.error(f"Failed to get CAPTCHA image: {str(e)}")
            raise

    def fill_captcha(self, text: str) -> None:
        """Fill CAPTCHA text into input field"""
        try:
            selector = "#ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox"
            self.page.fill(selector, text)
            logging.info(f"Filled CAPTCHA field with text: {text}")
        except Exception as e:
            logging.error(f"Failed to fill CAPTCHA: {str(e)}")
            raise