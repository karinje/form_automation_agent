import yaml
import json
from src.utils.form_handler import FormHandler
from src.utils.form_mapping import FormMapping
from src.utils.browser import BrowserHandler
import logging
from src.utils.form_mapping import FormPage
from dotenv import load_dotenv
import os

logger = logging.getLogger(__name__)


def load_json(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return json.load(f)

def load_yaml(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return yaml.safe_load(f)

def main():
    # Load environment variables from .env file
    load_dotenv()
    
    # Verify OpenAI API key is set
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError("OPENAI_API_KEY not found in environment variables")
    
    logger.info("Starting DS-160 form automation...")
    try:
        # Load test data
        test_data = load_yaml('data/input/ds160_from_o1.yaml')
        #test_data = load_yaml('data/input/full_application.yaml')
        
        # Load all form definitions
        page_definitions = {}
        form_definitions_dir = 'form_definitions'
        
        # Log available files
        logger.info(f"Looking for form definitions in: {form_definitions_dir}")
        available_files = os.listdir(form_definitions_dir)
        logger.info(f"Found files: {available_files}")

        # Map enum values to actual file names (now with _definition suffix)
        page_name_mappings = {
            "start_page": "p0_start_page_definition",
            "retrieve_page": "p0_retrieve_page_definition",
            "security_page": "p0_security_page_definition",
            "timeout_page": "p0_timeout_page_definition",
            "personal_page1": "p1_personal1_definition",
            "personal_page2": "p2_personal2_definition",
            "travel_page": "p3_travel_definition",
            "travel_companions_page": "p4_travelcompanions_definition",
            "previous_travel_page": "p5_previousustravel_definition",
            "address_phone_page": "p6_addressphone_definition",
            "pptvisa_page": "p7_pptvisa_definition",
            "us_contact_page": "p8_uscontact_definition",
            "relatives_page": "p9_relatives_definition",
            "spouse_page": "p18_spouse_definition",
            "workeducation1_page": "p10_workeducation1_definition",
            "workeducation2_page": "p11_workeducation2_definition",
            "workeducation3_page": "p12_workeducation3_definition",
            "security_background1_page": "p13_securityandbackground1_definition",
            "security_background2_page": "p14_securityandbackground2_definition",
            "security_background3_page": "p15_securityandbackground3_definition",
            "security_background4_page": "p16_securityandbackground4_definition",
            "security_background5_page": "p17_securityandbackground5_definition"
        }

        # Load form definitions
        for enum_value, file_prefix in page_name_mappings.items():
            file_path = os.path.join(form_definitions_dir, f"{file_prefix}.json")
            
            if os.path.exists(file_path):
                logger.info(f"Loading definition for {enum_value} from {file_path}")
                page_definitions[enum_value] = load_json(file_path)
            else:
                logger.warning(f"Definition file not found: {file_path}")

        if not page_definitions:
            raise ValueError("No form definitions were loaded")

        logger.info(f"Loaded definitions for pages: {list(page_definitions.keys())}")

        # Initialize handlers
        form_handler = FormHandler()
        
        # Process pages
        logger.info("Starting browser session...")
        with BrowserHandler(headless=False) as browser:
            form_handler.set_browser(browser)
            logger.info("Navigating to DS-160 start page...")
            browser.navigate("https://ceac.state.gov/GenNIV/Default.aspx")
            
            # Process all pages using form_handler's process_form_pages method
            form_handler.process_form_pages(test_data, page_definitions)

        logger.info("DS-160 form automation completed successfully")
        
    except Exception as e:
        logger.error(f"Error in main process: {str(e)}")
        raise

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('ds160_automation.log'),
            logging.StreamHandler()
        ]
    )
    main()
