from playwright.async_api import async_playwright, Browser, Page
from typing import Optional, Dict, Any
import logging
from mappings.form_mapping import FormMapping, FormPage
import os
from dotenv import load_dotenv
from PIL import Image
import base64
import io

logger = logging.getLogger(__name__)

class BrowserHandler:
    def __init__(self):
        # Check environment variable for headless mode setting
        self.headless = os.environ.get("HEADLESS_BROWSER", "true").lower() == "true"
        logger.info(f"Browser running in headless mode: {self.headless}")
        self.browser = None
        self.context = None
        self.page = None
        self.current_page: Optional[FormPage] = None
        self.playwright = None
        self.default_timeout = 1000  # 1 second default timeout
        self.page_timeout = 5000  # 5 seconds page timeout
        
        # Load base URL from environment
        load_dotenv()
        self.base_url = os.getenv('DS160_BASE_URL', 'https://ceac.state.gov/GenNIV/Default.aspx')
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.playwright, self.browser, self.context = await self.launch_browser()
        self.page = await self.context.new_page()
        # Set default timeout after page is initialized
        self.page.set_default_timeout(self.page_timeout)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        
    async def launch_browser(self):
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ]
        )
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )
        return playwright, browser, context

    async def navigate(self, url: str):
        """Navigate to URL with error handling"""
        try:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    await self.page.goto(url, timeout=60000)
                    await self.page.wait_for_selector("#ctl00_ddlLanguage", 
                        state="visible", 
                        timeout=30000
                    )
                    await self.page.wait_for_timeout(500)
                    logging.info(f"Successfully navigated to {url}")
                    return
                    
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    logging.warning(f"Navigation attempt {attempt + 1} failed: {str(e)}. Retrying...")
                    await self.page.wait_for_timeout(5000)
                
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

    async def fill_input(self, selector: str, value: str) -> None:
        try:
            element = await self.page.wait_for_selector(
                selector, 
                timeout=self.default_timeout,
                state="visible"
            )
            if element:
                max_attempts = 2
                for attempt in range(max_attempts):
                    try:
                        # 1. Set value through JavaScript first to ensure model binding
                        await self.page.evaluate(f"""() => {{
                            const el = document.querySelector("{selector}");
                            if (el) {{
                                // Set value property
                                el.value = "{value}";
                                // Set attribute for persistence
                                el.setAttribute('value', "{value}");
                                // Trigger all relevant events in correct order
                                el.dispatchEvent(new Event('focus', {{ bubbles: true }}));
                                el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                                el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                                el.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                                // Force any Angular/React bindings to update
                                el.dispatchEvent(new CustomEvent('input', {{ 
                                    bubbles: true,
                                    detail: {{ value: "{value}" }}
                                }}));
                            }}
                        }}""")
                        
                        await self.page.wait_for_timeout(10)  # Let events propagate
                        
                        # 2. Then use Playwright's fill for good measure
                        await element.fill(value)
                        await self.page.wait_for_timeout(10)
                        
                        # 3. Verify through multiple methods
                        js_value = await self.page.evaluate(f"""() => {{
                            const el = document.querySelector("{selector}");
                            return {{
                                value: el.value,
                                attribute: el.getAttribute('value'),
                                isConnected: el.isConnected,
                                isVisible: el.offsetParent !== null,
                                isEnabled: !el.disabled
                            }};
                        }}""")
                        
                        # Check all verification points
                        if (js_value['value'] != value or 
                            js_value['attribute'] != value or 
                            not js_value['isConnected'] or 
                            not js_value['isVisible'] or 
                            not js_value['isEnabled']):
                            raise Exception(f"Value verification failed: {js_value}")
                        
                        # 4. Final DOM check through Playwright
                        dom_value = await element.input_value()
                        if dom_value != value:
                            raise Exception(f"DOM value mismatch: {dom_value}")
                            
                        logger.info(f"Successfully filled {selector} with value: {value} (verified through JS and DOM)")
                        return
                        
                    except Exception as e:
                        if attempt == max_attempts - 1:
                            raise
                        logger.warning(f"Fill attempt {attempt + 1} failed: {str(e)}")
                        await self.page.wait_for_timeout(200)
                        
                raise Exception(f"Failed to fill {selector} after {max_attempts} attempts")
            else:
                raise Exception(f"Element not found: {selector}")
            
        except Exception as e:
            logger.error(f"Error filling input {selector}: {str(e)}")
            raise

    async def select_dropdown_option(self, selector: str, value: str) -> None:
        try:
            element = await self.page.wait_for_selector(selector, timeout=self.default_timeout)
            if element:
                await element.select_option(value=value)
            else:
                logger.warning(f"Dropdown {selector} not found after {self.default_timeout/1000} seconds")
        except TimeoutError:
            logger.warning(f"Timeout waiting for dropdown {selector}")

    async def select_radio(self, selector: str, value: str, button_id: str):
        """Select a radio button by its specific button ID"""
        try:
            await self.page.wait_for_selector(f"#{button_id}", timeout=self.default_timeout)
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

    async def wait(self, seconds: float):
        """Wait for specified number of seconds"""
        try:
            await self.page.wait_for_timeout(seconds * 1000)  # Convert to milliseconds
            logging.debug(f"Completed {seconds} second wait")
        except Exception as e:
            logging.error(f"Wait failed: {str(e)}")
            raise

    async def click(self, selector: str):
        """Click an element"""
        try:
            await self.page.click(selector)
            #self.page.wait_for_selector(selector, timeout=self.default_timeout)
            logging.info(f"Clicked element: {selector}")
            return True
        except Exception as e:
            logging.error(f"Failed to click element {selector}: {str(e)}")
            raise

    async def wait_for_page_load(self):
        """Wait for page to be fully loaded"""
        try:
            # Wait for network to be idle
            await self.page.wait_for_load_state("domcontentloaded", timeout=30000)
            
            # Wait for no network requests for 500ms
            await self.page.wait_for_load_state("networkidle", timeout=30000)
            
            # Additional wait for any JavaScript
            await self.page.wait_for_timeout(2000)
            
        except Exception as e:
            logging.warning(f"Page load wait warning: {str(e)}")

    async def get_captcha_image(self) -> str:
        """Get CAPTCHA image as base64 string"""
        try:
            # Find the CAPTCHA image element
            logger.info(f"Attempting to locate CAPTCHA element in {self.page}")
            captcha_div = self.page.locator(".LBD_CaptchaImageDiv").first
            logger.info(f"CAPTCHA div found: {captcha_div}")
            if not captcha_div:
                raise ValueError("CAPTCHA image div not found")

            # Take screenshot of the CAPTCHA
            screenshot_bytes = await captcha_div.screenshot()
            
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
            logger.error(f"Failed to get CAPTCHA image: {str(e)}")
            raise

    async def fill_captcha(self, text: str) -> None:
        """Fill CAPTCHA text into input field"""
        try:
            selector = "#ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox"
            
            # Wait for element to be visible
            await self.page.wait_for_selector(selector, state="visible", timeout=10000)
            
            # Clear field first
            await self.page.fill(selector, "")
            
            # Fill with CAPTCHA text
            await self.page.fill(selector, text)
            
            logging.info(f"Filled CAPTCHA field with text: {text}")
            
        except Exception as e:
            logging.error(f"Failed to fill CAPTCHA: {str(e)}")
            raise

    async def click_radio(self, selector: str) -> None:
        """Click a radio button with specific timeout handling"""
        try:
            element = await self.page.wait_for_selector(selector, timeout=self.default_timeout)
            if element:
                await element.click()
                logging.info(f"Clicked radio button: {selector}")
            else:
                logger.warning(f"Radio button {selector} not found after {self.default_timeout/1000} seconds")
        except Exception as e:
            logger.error(f"Failed to click radio button {selector}: {str(e)}")
            raise