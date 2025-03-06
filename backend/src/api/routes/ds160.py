from fastapi import FastAPI, UploadFile, File, APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import tempfile
import subprocess
import os
import sys
import json
import asyncio
from pathlib import Path
import logging
import yaml
from typing import AsyncGenerator

# Add the project root to Python path
src_path = Path(__file__).parent.parent.parent
sys.path.append(str(src_path))

# Now we can import our modules
from automation.browser import BrowserHandler
from automation.form_handler import FormHandler
from mappings.form_mapping import FormPage

logger = logging.getLogger(__name__)
router = APIRouter()

# Load form definitions
page_definitions = {}
form_definitions_dir = Path(__file__).parent.parent.parent.parent.parent / 'shared/form_definitions'

# Load all form definitions
def load_form_definitions():
    try:
        # Map enum values to actual file names
        page_json_mappings = {
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
            "workeducation1_page": "p10_workeducation1_definition",
            "workeducation2_page": "p11_workeducation2_definition",
            "workeducation3_page": "p12_workeducation3_definition",
            "security_background1_page": "p13_securityandbackground1_definition",
            "security_background2_page": "p14_securityandbackground2_definition",
            "security_background3_page": "p15_securityandbackground3_definition",
            "security_background4_page": "p16_securityandbackground4_definition",
            "security_background5_page": "p17_securityandbackground5_definition",
            "spouse_page": "p18_spouse_definition"
        }

        # First log FormPage enum values
        logger.info("FormPage enum values:")
        for page in FormPage:
            logger.info(f"  {page.name}: {page.value}")

        # Log mapping between files and keys
        logger.info("Page definition mapping:")
        for yaml_key, file_prefix in page_json_mappings.items():
            logger.info(f"  YAML key: {yaml_key} -> File: {file_prefix}.json")

        # Load and verify each definition
        for enum_value, file_prefix in page_json_mappings.items():
            file_path = form_definitions_dir / f"{file_prefix}.json"
            if file_path.exists():
                with open(file_path) as f:
                    definition = json.load(f)
                    page_definitions[enum_value] = definition
                    logger.info(f"Loaded {enum_value} with {len(definition.get('fields', []))} fields")
            else:
                logger.error(f"MISSING DEFINITION: {file_path}")  # Error not warning - this is critical

        # Verify all FormPage enum values have definitions
        missing_defs = [page.value for page in FormPage if page.value not in page_definitions]
        if missing_defs:
            logger.error(f"Missing definitions for FormPage values: {missing_defs}")

        logger.info(f"Loaded {len(page_definitions)} form definitions")
        logger.info(f"Available page definitions: {list(page_definitions.keys())}")
    except Exception as e:
        logger.error(f"Error loading form definitions: {str(e)}")
        raise

# Load definitions when module is imported
load_form_definitions()

async def process_ds160_with_updates(content: bytes, queue: asyncio.Queue = None) -> AsyncGenerator[str, None]:
    """Process DS-160 form and yield progress updates"""
    # Use the provided queue or create a new one if none was provided
    progress_queue = queue or asyncio.Queue()
    
    try:
        # Parse YAML content
        form_data = yaml.safe_load(content)
        logger.info(f"Parsed YAML data with keys: {list(form_data.keys() if form_data else [])}")
        
        # Initialize handlers
        browser_handler = BrowserHandler(headless=False)
        form_handler = FormHandler(progress_queue)  # Pass the request-specific queue
        
        # Start processing in background task
        process_task = asyncio.create_task(
            form_handler.process_with_browser(browser_handler, form_data, page_definitions)
        )
        
        # Stream updates from the queue
        yield json.dumps({"status": "info", "message": "Starting DS-160 form processing..."})
        
        while True:
            try:
                # Get message with timeout to check if process has completed
                message = await asyncio.wait_for(progress_queue.get(), timeout=1.0)
                yield json.dumps(message)
                progress_queue.task_done()
                
                # Break if we receive completion message
                if message.get("status") == "complete":
                    break
                    
            except asyncio.TimeoutError:
                # Check if the process task is done
                if process_task.done():
                    # Get the result or exception
                    try:
                        result = process_task.result()
                        yield json.dumps({"status": "complete", "message": "DS-160 processing completed successfully"})
                    except Exception as e:
                        logger.error(f"Process task failed: {str(e)}")
                        yield json.dumps({"status": "error", "message": f"Processing failed: {str(e)}"})
                    break
        
    except Exception as e:
        logger.error(f"Error in DS-160 processing: {str(e)}", exc_info=True)
        yield json.dumps({"status": "error", "message": f"Processing failed: {str(e)}"})

@router.post("/run-ds160")
async def run_ds160(file: UploadFile = File(...)):
    try:
        logger.info(f"Received DS-160 request with filename: {file.filename}")
        content = await file.read()
        
        # Create a fresh queue for each request
        request_queue = asyncio.Queue()
        
        # Return a streaming response with the request-specific queue
        return StreamingResponse(
            process_ds160_with_updates(content, request_queue),
            media_type="text/event-stream"
        )
            
    except Exception as e:
        logger.error(f"Unexpected error in DS-160 processing: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
