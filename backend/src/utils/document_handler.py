import os
import asyncio
import logging
import time
import shutil
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import json
import yaml
from datetime import datetime
import tempfile
import re
import base64
import mimetypes
from PIL import Image
import io

# Initialize mimetypes
mimetypes.init()

from .openai_handler import OpenAIHandler

logger = logging.getLogger(__name__)

class DocumentHandler:
    def __init__(self):
        self.openai_handler = OpenAIHandler()
        self.log_dir = Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
        # Create a documents subfolder for storing document copies
        self.docs_log_dir = self.log_dir / "documents"
        self.docs_log_dir.mkdir(exist_ok=True)
        self.templates_dir = Path(__file__).parent.parent / "templates" / "yaml_files"
        
    async def process_data(self, files_data: Dict[str, bytes], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process uploaded documents and metadata in a single OpenAI call"""
        # Initialize prepared_files at the beginning to avoid reference errors
        prepared_files = {}
        
        try:
            logger.info(f"Processing {len(files_data)} documents with metadata")
            
            # Create a session directory for logs
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            session_dir = self.docs_log_dir / f"session_{timestamp}"
            session_dir.mkdir(exist_ok=True)
            logger.info(f"Created document log directory: {session_dir}")
            
            # Save original documents WITH PROPER EXTENSIONS
            for file_type, file_content in files_data.items():
                if file_content:
                    # Determine appropriate extension
                    extension = self._get_extension_for_file_type(file_type, file_content)
                    original_file_path = session_dir / f"original_{file_type}{extension}"
                    with open(original_file_path, "wb") as f:
                        f.write(file_content)
                    logger.info(f"Saved original {file_type} document to {original_file_path}")
            
            # Prepare images for OpenAI processing
            for file_type, file_content in files_data.items():
                if file_content:
                    if file_content.startswith(b'%PDF'):
                        # Handle PDF conversion
                        logger.info(f"Converting PDF for {file_type}")
                        try:
                            image_paths = await self.convert_pdf_to_images(file_content, file_type)
                            if image_paths:  # Add check to make sure paths were returned
                                for i, path in enumerate(image_paths):
                                    key = f"{file_type}_page{i}" if i > 0 else file_type
                                    prepared_files[key] = path
                                    # Save converted image
                                    suffix = f"_page{i}" if i > 0 else ""
                                    log_path = session_dir / f"converted_{file_type}{suffix}.jpg"
                                    shutil.copy2(path, log_path)
                            else:
                                # Fallback: If PDF conversion fails, save the PDF directly
                                logger.warning(f"PDF conversion failed for {file_type}, sending PDF directly to OpenAI")
                                
                                # Save PDF for processing
                                pdf_path = session_dir / f"original_{file_type}.pdf"
                                with open(pdf_path, "wb") as f:
                                    f.write(file_content)
                                
                                # Add to prepared files
                                prepared_files[file_type] = str(pdf_path)
                        except Exception as e:
                            # Another fallback in case of conversion errors
                            logger.error(f"Error converting PDF: {str(e)}")
                            logger.warning(f"Sending PDF directly to OpenAI as fallback")
                            
                            # Save PDF for processing
                            pdf_path = session_dir / f"original_{file_type}.pdf"
                            with open(pdf_path, "wb") as f:
                                f.write(file_content)
                            
                            # Add to prepared files
                            prepared_files[file_type] = str(pdf_path)
                    else:
                        # Handle image files directly
                        extension = self._get_extension_for_file_type(file_type, file_content)
                        temp_path = session_dir / f"temp_{file_type}{extension}"
                        with open(temp_path, "wb") as f:
                            f.write(file_content)
                        prepared_files[file_type] = str(temp_path)
            
            # Load YAML templates
            templates_text = self._load_travel_templates()
            logger.info("Loaded travel YAML templates with comments")
            
            # Build prompt with document data and metadata
            documents_text = "\n\n=== DOCUMENT CONTENT ===\n"
            for doc_type, text in prepared_files.items():
                documents_text += f"\n--- {doc_type.upper()} ---\n{text}\n"
                
                # Save each document's text separately
                doc_file = session_dir / f"document_{doc_type}_text.txt"
                with open(doc_file, "w") as f:
                    f.write(text)
            
            # Format metadata for the prompt
            metadata_text = "\n\n=== SELECTED DATA ===\n"
            
            # Include YAML-ready data if available
            if 'yamlData' in metadata:
                yaml_data = metadata['yamlData']
                metadata_text += "\nUse this information to populate output YAML. Use address in input yaml to populate 'Address Where You Will Stay in the U.S.' and travel companions to populate 'companions' array in travel_companions_page section"
                yaml_str = yaml.dump(yaml_data, sort_keys=False)
                metadata_text += yaml_str
                
                # Save the yaml data
                yaml_input_file = session_dir / "input_yaml_data.yaml"
                with open(yaml_input_file, "w") as f:
                    f.write(yaml_str)
            
            # Create the system message
            system_message = f"""
            Convert these document contents and selected data to DS-160 YAML format for these sections:
            - travel_page
            - travel_companions_page
            - previous_travel_page
            
            Document content and selected data:
            {documents_text}
            
            {metadata_text}
            
            YAML TEMPLATES:
            travel_page:
                specific_travel_plans: ""  # Have you made specific travel plans? Select "Y" if air ticket or itinerary is available in the documents above
                #for specific travel plans, get details from the flight arriving in the US from the documents above 
                specific_travel_plans_details: # Add this section of yaml only if air ticket or itinerary is available in the documents above
                    arrival:
                        month: ""  # Select from JAN-DEC
                        day: ""  # Select from 01-31
                        year: ""  # 4-digit year
                        flight: ""  # Optional: Flight number if known
                        city: ""  # U.S. arrival city
                    departure:
                    month: ""  # Select from JAN-DEC #departure city needs to be in the US and date needs to be after arrival date if that's not the case then leave this empty 
                    day: ""  # Select from 01-31
                    year: ""  # 4-digit year
                    flight: ""  # Optional: Flight number if known
                    city: ""  # U.S. departure city
                locations_to_visit: # get this also based on the cities in the air ticket or travel itinerary documents
                    - location: ""  # Locations you plan to visit - first location. Only include US cities in Air ticket or travel itinerary documents
                    - location: ""  # Add this array element only if second location exists, if not dont even add this array element. List locations you plan to visit
                stay_address: # select this address from YAML DATA section above
                    street1: ""  # Street address line 1
                    street2: ""  # Optional: Street address line 2
                    city: ""  # City
                    state: ""  # U.S. state - select from state list
                    zip: ""  # U.S. ZIP code

            travel_companions_page:
                traveling_with_others: ""  # Are there other persons traveling with you? (Y/N) Select "Y" if companions are available in the YAML DATA section above else select "N" if note: "None Chosen" if no data is available leave blank
                travel_companions:  # Details of person traveling with you if not traveling as group ; Populate this array based on YAML DATA section above. Only include as many array elements as there are travel companions. 
                    - surname: ""  # Surnames of Person Traveling With You (max 33 chars)
                      given_name: ""  # Given Names of Person Traveling With You (max 33 chars) 
                      relationship: ""  # Relationship options: PARENT/SPOUSE/CHILD/OTHER RELATIVE/FRIEND/BUSINESS ASSOCIATE/OTHER
                    - surname: ""  # Surnames of Person Traveling With You (max 33 chars)
                      given_name: ""  # Given Names of Person Traveling With You (max 33 chars) 
                      relationship: ""  # Relationship options: PARENT/SPOUSE/CHILD/OTHER RELATIVE/FRIEND/BUSINESS ASSOCIATE/OTHER
                    - surname: ""  # Surnames of Person Traveling With You (max 33 chars)
                      given_name: ""  # Given Names of Person Traveling With You (max 33 chars) 
                      relationship: ""  # Relationship options: PARENT/SPOUSE/CHILD/OTHER RELATIVE/FRIEND/BUSINESS ASSOCIATE/OTHER

            previous_travel_page:
                drivers_license: "Y"  # Do you or did you ever hold a U.S. Driver's License? If drivers license is available in documents above select "Y" else select "N"
                license_details:
                    - number: "" # Driver's License Number (1) Driver's License Number
                      number_na: "" # set to true if Driver's License Number (1) is not available else set to false
                      state: "" # Driver's License Number (1)State of Driver's License needs to be full state name not abbreviation
                previous_visa: ""   # Have you ever been issued a U.S. Visa? If visa is available in documents above select "Y" else select "N"
                visa_number: ""  # Visa Number
                visa_number_na: "" # Set to true if Visa Number is Do not know
                visa_issue_date:
                    month: ""  # Date Last Visa Was Issued - Month   
                    day: ""     # Date Last Visa Was Issued - Day
                    year: ""  # Date Last Visa Was Issued - Year
                                            
            Rules:
            1. If PRE-FORMATTED YAML DATA is provided above, use it as a starting point and prioritize that data.
            2. Create YAML for each of the four travel sections following the template format
            3. Use "Y"/"N" for yes/no fields
            4. Use "true"/"false" for boolean fields (yaml fields that end with _na)
            5. Add button_clicks: [1, 2] at the end of each section
            6. For dates, use day format as 2 digits (01-31) if date is unavailable (if only year and month or only year is provided) use 01
            7. For month use 3-letter format (JAN, FEB, etc.), if only year is provided and no month is included use "JAN"
            8. For year use 4 digits such as 2020, 2021, 2022, etc.
            9. Use the provided address data to populate contact fields if applicable
            10. If the selected companions are available, use them in the travel_companions_page section
            11. Extract previous travel information like visa numbers, dates of entry/exit from the documents if available
            12. Only generate YAML structure without any comments or explanations before or after 
            
            Output format:
            travel_page:
              # travel fields from template
              button_clicks: [1, 2]
              
            travel_companions_page:
              # travel companions fields from template
              button_clicks: [1, 2]
              
            previous_travel_page:
              # previous travel fields from template
              button_clicks: [1, 2]
              
            us_contact_page:
              # us contact fields from template
              button_clicks: [1, 2]
            """

            
            # Save the system message for logging
            system_file = session_dir / "system_message.txt"
            with open(system_file, "w") as f:
                f.write(system_message)
            
            # Prepare the user message with images
            user_message = []
            user_message.append({
                "type": "text", 
                "text": "Extract information from these documents and create YAML for DS-160 travel sections. Focus on names, dates, addresses, ID/visa numbers, and travel information."
            })
            
            # Add each image
            for file_type, file_path in prepared_files.items():
                with open(file_path, "rb") as img_file:
                    base64_image = base64.b64encode(img_file.read()).decode('utf-8')
                    
                    user_message.append({
                        "type": "text", 
                        "text": f"Document type: {file_type.upper()}"
                    })
                    user_message.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    })
            
            # Log the user message structure (without base64 data)
            user_message_log = []
            for item in user_message:
                if item["type"] == "text":
                    user_message_log.append({"type": "text", "text": item["text"]})
                else:
                    user_message_log.append({"type": "image", "description": "image data (base64)"})
            
            user_msg_file = session_dir / "user_message.json"
            with open(user_msg_file, "w") as f:
                json.dump(user_message_log, f, indent=2)
            
            # Make a single API call with the system message and user message+images
            logger.info(f"Calling OpenAI with {len(prepared_files)} documents")
            response = await self.openai_handler.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=4000
            )
            
            # Get the response and clean it
            result = response.choices[0].message.content
            
            # Save raw response
            raw_file = session_dir / "openai_response.txt"
            with open(raw_file, "w") as f:
                f.write(result)
            
            # Clean up YAML code block markers
            result = result.strip()
            if result.startswith('```yaml'):
                result = result[7:]
            if result.startswith('```'):
                result = result[3:]
            if result.endswith('```'):
                result = result[:-3]
            result = result.strip()
            
            # Save cleaned YAML
            yaml_file = session_dir / "final_yaml.yaml"
            with open(yaml_file, "w") as f:
                f.write(result)
            
            # Parse YAML data
            try:
                parsed_yaml = yaml.safe_load(result)
                return {
                    "status": "success",
                    "data": parsed_yaml
                }
            except Exception as e:
                logger.error(f"Error parsing YAML data: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Error parsing YAML data: {str(e)}",
                    "raw_yaml": result
                }
                
        except Exception as e:
            logger.error(f"Error processing documents: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": str(e)
            }
        finally:
            # Clean up temporary files
            for file_path in prepared_files.values():
                if os.path.exists(file_path) and not str(file_path).startswith(str(session_dir)):
                    try:
                        os.unlink(file_path)
                    except Exception as e:
                        logger.error(f"Error removing temp file: {str(e)}")
    
    async def convert_pdf_to_images(self, pdf_content: bytes, file_type: str) -> List[str]:
        """Convert PDF content to a list of image file paths"""
        try:
            # Import pdf2image here to avoid dependency issues if not installed
            from pdf2image import convert_from_bytes
            
            # Create a directory for PDF conversions
            pdf_conversion_dir = self.docs_log_dir / "pdf_conversions"
            pdf_conversion_dir.mkdir(exist_ok=True)
            
            # Create a timestamped subdirectory for this specific conversion
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            conversion_dir = pdf_conversion_dir / f"{file_type}_{timestamp}"
            conversion_dir.mkdir(exist_ok=True)
            
            # Save original PDF for reference
            pdf_path = conversion_dir / f"original_{file_type}.pdf"
            with open(pdf_path, "wb") as f:
                f.write(pdf_content)
            logger.info(f"Saved original PDF to {pdf_path}")
            
            # Convert PDF bytes to images
            logger.info(f"Converting PDF for {file_type} to images")
            images = convert_from_bytes(
                pdf_content,
                dpi=200,  # Adjust DPI as needed for clarity vs file size
                fmt="jpeg",
                transparent=False
            )
            
            image_paths = []
            for i, image in enumerate(images):
                # Save each page as an image with proper extension directly in the conversion directory
                output_path = conversion_dir / f"{file_type}_page{i}.jpg"
                image.save(str(output_path), "JPEG")
                logger.info(f"Saved PDF page {i+1} for {file_type} to {output_path}")
                
                # Also save to a temp file for processing
                with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file_type}_page{i}.jpg") as temp:
                    image.save(temp.name, "JPEG")
                    image_paths.append(temp.name)
            
            # Save a summary file with paths
            summary_path = conversion_dir / "conversion_summary.txt"
            with open(summary_path, "w") as f:
                f.write(f"Original PDF: {pdf_path}\n\n")
                f.write(f"Converted {len(images)} pages to images:\n")
                for i in range(len(images)):
                    f.write(f"Page {i+1}: {conversion_dir / f'{file_type}_page{i}.jpg'}\n")
            
            return image_paths
            
        except ImportError:
            logger.error("pdf2image is not installed. Please install it with: pip install pdf2image")
            return []
        except Exception as e:
            logger.error(f"Error converting PDF to images: {str(e)}", exc_info=True)
            return []
    
    def _load_travel_templates(self) -> str:
        """Load the travel related YAML templates"""
        try:
            if not self.templates_dir.exists():
                raise FileNotFoundError(f"Template directory not found at: {self.templates_dir}")
            
            # Load the travel related templates
            travel_templates = [
                "travel_page.yaml",
                "travel_companions_page.yaml", 
                "previous_travel_page.yaml",
                "us_contact_page.yaml"
            ]
            
            all_templates = []
            for template_name in travel_templates:
                file_path = self.templates_dir / template_name
                if file_path.exists():
                    try:
                        with open(file_path, 'r') as f:
                            template_content = f.read()
                            all_templates.append(template_content)
                            logger.info(f"Loaded template: {file_path.name}")
                    except Exception as e:
                        logger.error(f"Error loading template {file_path}: {str(e)}")
                        raise
                else:
                    logger.warning(f"Template file not found: {file_path}")
            
            if not all_templates:
                raise FileNotFoundError(f"No travel templates found in {self.templates_dir}")
                
            return "\n\n".join(all_templates)
            
        except Exception as e:
            logger.error(f"Error loading templates: {str(e)}", exc_info=True)
            raise
    
    async def generate_yaml_from_documents(self, document_data: Dict[str, str], metadata: Dict[str, Any]) -> Optional[str]:
        """Convert document data and metadata to DS-160 YAML format using OpenAI"""
        try:
            # Create a session-specific log directory for this YAML generation
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            yaml_log_dir = self.docs_log_dir / f"yaml_gen_{timestamp}"
            yaml_log_dir.mkdir(exist_ok=True)
            
            # Load travel related YAML templates with comments
            templates_text = self._load_travel_templates()
            logger.info("Loaded travel YAML templates with comments")
            
            # Build prompt with document data and metadata
            documents_text = "\n\n=== DOCUMENT CONTENT ===\n"
            for doc_type, text in document_data.items():
                documents_text += f"\n--- {doc_type.upper()} ---\n{text}\n"
                
                # Save each document's text separately
                doc_file = yaml_log_dir / f"document_{doc_type}_text.txt"
                with open(doc_file, "w") as f:
                    f.write(text)
            
            # Format metadata for the prompt
            metadata_text = "\n\n=== SELECTED DATA ===\n"
            
            # Include YAML-ready data if available
            if 'yamlData' in metadata:
                yaml_data = metadata['yamlData']
                metadata_text += "\nUse this information to populate output YAML. Use address in input yaml to populate 'Address Where You Will Stay in the U.S.' and travel companions to populate 'companions' array in travel_companions_page section"
                yaml_str = yaml.dump(yaml_data, sort_keys=False)
                metadata_text += yaml_str
                
                # Save the yaml data
                yaml_input_file = yaml_log_dir / "input_yaml_data.yaml"
                with open(yaml_input_file, "w") as f:
                    f.write(yaml_str)
            
            # Complete prompt
            prompt = f"""
            Convert these document contents and selected data to DS-160 YAML format for these sections:
            - travel_page
            - travel_companions_page
            - previous_travel_page
            - us_contact_page
            
            Document content and selected data:
            {documents_text}
            
            {metadata_text}
            
            YAML TEMPLATES:
            travel_page:
                specific_travel_plans: ""  # Have you made specific travel plans? Select "Y" if air ticket or itinerary is available in the documents above
                #for specific travel plans, get details from the flight arriving in the US from the documents above 
                specific_travel_plans_details: # Add this section of yaml only if air ticket or itinerary is available in the documents above
                    arrival:
                        month: ""  # Select from JAN-DEC
                        day: ""  # Select from 01-31
                        year: ""  # 4-digit year
                        flight: ""  # Optional: Flight number if known
                        city: ""  # U.S. arrival city
                    departure:
                    month: ""  # Select from JAN-DEC
                    day: ""  # Select from 01-31
                    year: ""  # 4-digit year
                    flight: ""  # Optional: Flight number if known
                    city: ""  # U.S. departure city
                locations_to_visit: # get this also based on the cities in the air ticket or travel itinerary documents
                    - location: ""  # Locations you plan to visit - first location
                    - location: ""  # Add this array element only if second location exists, if not dont even add this array element. List locations you plan to visit
                stay_address: # select this address from YAML DATA section above
                    street1: ""  # Street address line 1
                    street2: ""  # Optional: Street address line 2
                    city: ""  # City
                    state: ""  # U.S. state - select from state list
                    zip: ""  # U.S. ZIP code

            travel_companions_page:
                traveling_with_others: ""  # Are there other persons traveling with you? (Y/N) Select "Y" if companions are available in the YAML DATA section above else select "N" if note: "None Chosen" if no data is available leave blank
                travel_companions:  # Details of person traveling with you if not traveling as group ; Populate this array based on YAML DATA section above. Only include as many array elements as there are travel companions. 
                    - surname: ""  # Surnames of Person Traveling With You (max 33 chars)
                      given_name: ""  # Given Names of Person Traveling With You (max 33 chars) 
                      relationship: ""  # Relationship options: PARENT/SPOUSE/CHILD/OTHER RELATIVE/FRIEND/BUSINESS ASSOCIATE/OTHER
                    - surname: ""  # Surnames of Person Traveling With You (max 33 chars)
                      given_name: ""  # Given Names of Person Traveling With You (max 33 chars) 
                      relationship: ""  # Relationship options: PARENT/SPOUSE/CHILD/OTHER RELATIVE/FRIEND/BUSINESS ASSOCIATE/OTHER
                    - surname: ""  # Surnames of Person Traveling With You (max 33 chars)
                      given_name: ""  # Given Names of Person Traveling With You (max 33 chars) 
                      relationship: ""  # Relationship options: PARENT/SPOUSE/CHILD/OTHER RELATIVE/FRIEND/BUSINESS ASSOCIATE/OTHER

            previous_travel_page:
                drivers_license: "Y"  # Do you or did you ever hold a U.S. Driver's License? If drivers license is available in documents above select "Y" else select "N"
                license_details:
                    - number: "" # Driver's License Number (1) Driver's License Number
                      number_na: "" # set to true if Driver's License Number (1) is not available else set to false
                      state: "" # Driver's License Number (1)State of Driver's License
                previous_visa: ""   # Have you ever been issued a U.S. Visa? If visa is available in documents above select "Y" else select "N"
                visa_number: ""  # Visa Number
                visa_number_na: "" # Set to true if Visa Number is Do not know
                visa_issue_date:
                    month: ""  # Date Last Visa Was Issued - Month   
                    day: ""     # Date Last Visa Was Issued - Day
                    year: ""  # Date Last Visa Was Issued - Year
                                            
            Rules:
            1. If PRE-FORMATTED YAML DATA is provided above, use it as a starting point and prioritize that data.
            2. Create YAML for each of the four travel sections following the template format
            3. Use "Y"/"N" for yes/no fields
            4. Use "true"/"false" for boolean fields (yaml fields that end with _na)
            5. Add button_clicks: [1, 2] at the end of each section
            6. For dates, use day format as 2 digits (01-31) if date is unavailable (if only year and month or only year is provided) use 01
            7. For month use 3-letter format (JAN, FEB, etc.), if only year is provided and no month is included use "JAN"
            8. For year use 4 digits such as 2020, 2021, 2022, etc.
            9. Use the provided address data to populate contact fields if applicable
            10. If the selected companions are available, use them in the travel_companions_page section
            11. Extract previous travel information like visa numbers, dates of entry/exit from the documents if available
            
            Output format:
            travel_page:
              # travel fields from template
              button_clicks: [1, 2]
              
            travel_companions_page:
              # travel companions fields from template
              button_clicks: [1, 2]
              
            previous_travel_page:
              # previous travel fields from template
              button_clicks: [1, 2]
              
            us_contact_page:
              # us contact fields from template
              button_clicks: [1, 2]
            """
            
            # Save prompt to file for debugging
            prompt_file = yaml_log_dir / "prompt.txt"
            with open(prompt_file, 'w') as f:
                f.write(prompt)
                
            logger.info(f"Saved document prompt to {prompt_file}")
            
            # Call OpenAI API
            response = await self.openai_handler.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt}
                ]
            )
            
            result = response.choices[0].message.content
            
            # Save raw response
            raw_response_file = yaml_log_dir / "raw_openai_response.txt"
            with open(raw_response_file, "w") as f:
                f.write(result)
            
            # Clean up YAML code block markers
            result = result.strip()
            if result.startswith('```yaml'):
                result = result[7:]  # Remove ```yaml prefix
            if result.startswith('```'):
                result = result[3:]  # Remove ``` prefix
            if result.endswith('```'):
                result = result[:-3]  # Remove ``` suffix
            result = result.strip()
            
            # Save cleaned YAML
            cleaned_yaml_file = yaml_log_dir / "cleaned_yaml.yaml"
            with open(cleaned_yaml_file, "w") as f:
                f.write(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating YAML from document data: {str(e)}", exc_info=True)
            return None 

    def _get_extension_for_file_type(self, file_type: str, file_content: bytes) -> str:
        """Determine the appropriate file extension based on file type and content"""
        # Check if file_type already has an extension
        if '.' in file_type:
            return ''
        
        # First check content magic bytes
        if file_content.startswith(b'%PDF'):
            return '.pdf'
        elif file_content.startswith(b'\xff\xd8\xff'):  # JPEG signature
            return '.jpg'
        elif file_content.startswith(b'\x89PNG\r\n\x1a\n'):  # PNG signature
            return '.png'
        
        # If we can't determine from bytes, use file_type as a hint
        type_lower = file_type.lower()
        if 'license' in type_lower or 'id' in type_lower:
            return '.jpg'  # Assume licenses/IDs are images
        elif 'visa' in type_lower:
            return '.jpg'  # Assume visas are images
        elif 'i797' in type_lower:
            return '.pdf'  # Assume I-797 is PDF
        elif 'ticket' in type_lower:
            return '.pdf'  # Assume tickets are PDFs
        
        # Default to jpg as a fallback
        return '.jpg' 