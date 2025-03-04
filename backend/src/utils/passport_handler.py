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

class PassportHandler:
    def __init__(self):
        self.openai_handler = OpenAIHandler()
        self.log_dir = Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
        # Create a passport subfolder for storing document copies
        self.passport_log_dir = self.log_dir / "passport"
        self.passport_log_dir.mkdir(exist_ok=True)
        self.templates_dir = Path(__file__).parent.parent / "templates" / "yaml_files"
        
    async def process_data(self, files_data: Dict[str, bytes], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process uploaded passport documents and metadata in a single OpenAI call"""
        # Initialize prepared_files at the beginning to avoid reference errors
        prepared_files = {}
        
        try:
            logger.info(f"Processing {len(files_data)} passport documents with metadata")
            
            # Create a session directory for logs
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            session_dir = self.passport_log_dir / f"session_{timestamp}"
            session_dir.mkdir(exist_ok=True)
            logger.info(f"Created passport document log directory: {session_dir}")
            
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
            templates_text = self._load_personal_templates()
            
            # Prepare metadata YAML
            yaml_metadata = ""
            if 'yamlData' in metadata:
                yaml_str = yaml.dump(metadata['yamlData'], sort_keys=False)
                yaml_metadata = f"\nPRE-FORMATTED YAML DATA:\n{yaml_str}"
                # Save for logging
                yaml_input_file = session_dir / "input_yaml_data.yaml"
                with open(yaml_input_file, "w") as f:
                    f.write(yaml_str)
            
            # Create the system message
            system_message = f"""
            Process these passport images and create DS-160 YAML for personal sections:
            - personal_page1
            - personal_page2
            - address_phone_page
            - pptvisa_page
            - relatives_page
            - spouse_page
            
            
            
            YAML TEMPLATES:
            personal_page1:
                surname: ""                      # Surnames (max 33 chars)
                given_name: ""                    # Given Names (max 33 chars)
                full_name_native_alphabet: ""         # Full Name in Native Alphabet (max 100 chars)
                full_name_native_alphabet_na: ""      # Check if Full Name is native alphabet  DOES NOT APPLY. choose "true" if full name in native alphabet is not available in passport document. 
                has_other_names_used: ""            # Have you ever used other names? (Y/N) If other names are prsent in passport fill section else leave empty and dont add any array elements. Add as many array element as there are other names. 
                other_names:                   
                    - surname: ""               # Other Surnames Used - only if has_other_names_used is Y (max 33 chars)
                      givenname: ""
                    - surname: ""               # Add this second element of array only if has more than one other name. Other Surnames Used - only if has_other_names_used is Y (max 33 chars) 
                      givenname: ""
                has_telecode: ""                    # Do you have a telecode that represents your name? (Y/N)
                telecode_surname: ""                  # Telecode Surnames - only if has_telecode is Y (max 20 chars) leave blank if not informatio isnt available in passport document.
                telecode_given: ""                   # Telecode Given Names - only if has_telecode is Y (max 20 chars) leave blank if not informatio isnt available in passport document.
                sex: ""                            # Sex (MALE/FEMALE)
                marital_status: ""             # Marital Status (MARRIED/COMMON LAW MARRIAGE/CIVIL UNION/DOMESTIC PARTNERSHIP/SINGLE/WIDOWED/DIVORCED/LEGALLY SEPARATED/OTHER)
                birth_date_mm: ""                 # Date of Birth - Month (JAN-DEC)
                birth_date_dd: ""                  # Date of Birth - Day (01-31)
                birth_date_yyyy: ""              # Date of Birth - Year (4 digits)
                birth_city: ""               # City of Birth (max 20 chars)
                birth_state_province: ""     # State/Province of Birth (max 20 chars)
                birth_state_province_na: ""       # Check if state/province not applicable
                birth_country: ""  # Country/Region of Birth (from dropdown list) 
            
            personal_page2:
                nationality: ""  # Country/Region of Origin (Nationality) - Select from dropdown list below 

            address_phone_page:
                # Home Address
                home_address:
                    street1: ""  # Street Address (Line 1) - max 40 chars
                    street2: ""  # Street Address (Line 2) - max 40 chars, optional
                    city: ""     # City - max 20 chars
                    state: ""    # State/Province - max 20 chars
                    state_na: ""  # Check if State/Province is not applicable
                    postal_code: ""  # Postal Zone/ZIP Code - max 10 chars
                    postal_code_na: ""  # Check if Postal Zone/ZIP Code is not applicable
                    country: ""  # Country/Region - Select from dropdown list
                
            pptvisa_page:
                passport_type: ""  #Allowed: REGULAR, OFFICIAL, DIPLOMATIC, LAISSEZ-PASSER, OTHER (choose appropriate type based on TYPE in passport document, map whatever is present in passport document to one of the types)
                passport_number: ""  # Max length: 20 chars
                passport_book_number: ""  # Max length: 20 chars, Optional (can be NA)
                passport_book_number_na: ""  # Set to true if not applicable
                issuance_country: ""  # Country that issued passport (map country code or country name in passport document above to one fo the countries in list below)
                issuance_location:
                    city: ""  # Max length: 25 chars
                    state: ""  # Max length: 25 chars
                    country: ""  # Country where passport was issued 
                issuance:
                    month: ""  # Format: JAN, FEB, MAR, etc.
                    day: ""  # Format: 01-31
                    year: ""  # 4-digit year
                expiration:
                    month: ""  # Format: JAN, FEB, MAR, etc.
                    day: ""  # Format: 01-31
                    year: ""  # 4-digit year
                expiration_na: ""  # Set to true if not applicable
                lost_passport: ""  # Y/N - Have you ever lost a passport or had one stolen?
                lost_passport_details:  # Only required if lost_passport is Y
                    number: ""  # Previous passport number
                    country: ""  # Country that issued lost passport (based in input in passport document pick one country from list below)
                    explanation: ""  # Explain circumstances of loss/theft
            
            relatives_page:
                father_surname: ""  # Father's surname, max 33 chars
                father_surname_na: "" # Father's surname not available DO NOT KNOW
                father_given_name: ""  # Father's given name, max 33 chars
                father_given_name_na: "" # Father's given name not available DO NOT KNOW
                mother_surname: ""  # Mother's surname, max 33 chars
                mother_surname_na: "" # Mother's surname not available DO NOT KNOW
                mother_given_name: ""  # Mother's given name, max 33 chars
                mother_given_name_na: "" # Mother's given name not available DO NOT KNOW

            spouse_page:
                spouse_surname: ""  # Spouse's Surnames
                spouse_given_name: ""  # Spouse's Given Names
                                
                          
            Rules:
            1. If PRE-FORMATTED YAML DATA is provided above, use it as a starting point
            2. Use "Y"/"N" for yes/no fields
            3. Use "true"/"false" for boolean fields (yaml fields ending with _na)
            4. Add button_clicks: [1, 2] at the end of each section
            5. For dates: day format uses 2 digits (01-31), month uses 3-letter format (JAN, FEB), year uses 4 digits
            6. Extract passport information like full name, passport number, nationality, date of birth, place of birth, issuance and expiration dates
            7. If values aren't clearly visible, leave blank
            8. Only generate YAML structure without any comments or explanations before or after 
            9. For country dropdown use one of the following:  For country dropdown use one of the following: ["AFGHANISTAN", "ALBANIA", "ALGERIA",
            "AMERICAN SAMOA", "ANDORRA", "ANGOLA", "ANGUILLA", "ANTIGUA AND BARBUDA", "ARGENTINA", "ARMENIA", "ARUBA", "AUSTRALIA", "AUSTRIA", "AZERBAIJAN",
            "BAHAMAS", "BAHRAIN", "BANGLADESH", "BARBADOS", "BELARUS", "BELGIUM", "BELIZE", "BENIN", "BERMUDA", "BHUTAN", "BOLIVIA", "BONAIRE", "BOSNIA-HERZEGOVINA",
            "BOTSWANA", "BRAZIL", "BRITISH INDIAN OCEAN TERRITORY", "BRUNEI", "BULGARIA", "BURKINA FASO", "BURMA", "BURUNDI", "CAMBODIA", "CAMEROON", "CANADA", "CABO VERDE",
            "CAYMAN ISLANDS", "CENTRAL AFRICAN REPUBLIC", "CHAD", "CHILE", "CHINA", "CHRISTMAS ISLAND", "COCOS KEELING ISLANDS", "COLOMBIA", "COMOROS", "CONGO, DEMOCRATIC REPUBLIC OF THE",
            "CONGO, REPUBLIC OF THE", "COOK ISLANDS", "COSTA RICA", "COTE D`IVOIRE", "CROATIA", "CUBA", "CURACAO", "CYPRUS", "CZECH REPUBLIC", "DENMARK", "DJIBOUTI", "DOMINICA",
            "DOMINICAN REPUBLIC", "ECUADOR", "EGYPT", "EL SALVADOR", "EQUATORIAL GUINEA", "ERITREA", "ESTONIA", "ESWATINI", "ETHIOPIA", "FALKLAND ISLANDS", "FAROE ISLANDS",
            "FIJI", "FINLAND", "FRANCE", "FRENCH GUIANA", "FRENCH POLYNESIA", "FRENCH SOUTHERN AND ANTARCTIC TERRITORIES", "GABON", "GAMBIA, THE", "GAZA STRIP", "GEORGIA",
            "GERMANY", "GHANA", "GIBRALTAR", "GREECE", "GREENLAND", "GRENADA", "GUADELOUPE", "GUAM", "GUATEMALA", "GUINEA", "GUINEA - BISSAU", "GUYANA", "HAITI", "HEARD AND MCDONALD ISLANDS",
            "HOLY SEE (VATICAN CITY)", "HONDURAS", "HONG KONG", "HOWLAND ISLAND", "HUNGARY", "ICELAND", "INDIA", "INDONESIA", "IRAN", "IRAQ", "IRELAND", "ISRAEL", "ITALY", "JAMAICA",
            "JAPAN", "JERUSALEM", "JORDAN", "KAZAKHSTAN", "KENYA", "KIRIBATI", "KOREA, DEMOCRATIC REPUBLIC OF (NORTH)", "KOREA, REPUBLIC OF (SOUTH)", "KOSOVO", "KUWAIT", "KYRGYZSTAN",
            "LAOS", "LATVIA", "LESOTHO", "LIBERIA", "LIBYA", "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", "MACAU", "MACEDONIA, NORTH", "MADAGASCAR", "MALAWI", "MALAYSIA", "MALDEN ISLAND",
            "MALDIVES", "MALI", "MALTA", "MARSHALL ISLANDS", "MARTINIQUE", "MAURITANIA", "MAURITIUS", "MAYOTTE", "MEXICO", "MICRONESIA", "MIDWAY ISLANDS", "MOLDOVA", "MONACO", "MONGOLIA",
            "MONTENEGRO", "MONTSERRAT", "MOROCCO", "MOZAMBIQUE", "NAMIBIA", "NAURU", "NEPAL", "NETHERLANDS", "NEW CALEDONIA", "NEW ZEALAND", "NICARAGUA", "NIGER", "NIGERIA", "NIUE",
            "NORFOLK ISLAND", "NORTH MARIANA ISLANDS", "NORTHERN IRELAND", "NORWAY", "OMAN", "PAKISTAN", "PALAU", "PALMYRA ATOLL", "PANAMA", "PAPUA NEW GUINEA", "PARAGUAY", "PERU",
            "PHILIPPINES", "PITCAIRN ISLANDS", "POLAND", "PORTUGAL", "PUERTO RICO", "QATAR", "REUNION", "ROMANIA", "RUSSIA", "RWANDA", "SABA ISLAND", "SAINT MARTIN", "SAMOA", "SAN MARINO",
            "SAO TOME AND PRINCIPE", "SAUDI ARABIA", "SENEGAL", "SERBIA", "SEYCHELLES", "SIERRA LEONE", "SINGAPORE", "SLOVAKIA", "SLOVENIA", "SOLOMON ISLANDS", "SOMALIA", "SOUTH AFRICA",
            "SOUTH GEORGIA AND THE SOUTH SANDWICH ISLAND", "SOUTH SUDAN", "SPAIN", "SRI LANKA", "ST. EUSTATIUS", "ST. HELENA", "ST. KITTS AND NEVIS", "ST. LUCIA", "ST. PIERRE AND MIQUELON",
            "ST. VINCENT AND THE GRENADINES", "SUDAN", "SURINAME", "SVALBARD", "SWEDEN", "SWITZERLAND", "SYRIA", "TAIWAN", "TAJIKISTAN", "TANZANIA", "THAILAND", "TIMOR-LESTE",
            "TOGO", "TOKELAU", "TONGA", "TRINIDAD AND TOBAGO", "TUNISIA", "TURKEY", "TURKMENISTAN", "TURKS AND CAICOS ISLANDS", "TUVALU", "UGANDA", "UKRAINE", "UNITED ARAB EMIRATES",
            "UNITED KINGDOM", "UNITED STATES OF AMERICA", "URUGUAY", "UZBEKISTAN", "VANUATU", "VENEZUELA", "VIETNAM", "VIRGIN ISLANDS (U.S.)", "VIRGIN ISLANDS, BRITISH", "WAKE ISLAND",
            "WALLIS AND FUTUNA ISLANDS", "WEST BANK", "WESTERN SAHARA", "YEMEN", "ZAMBIA", "ZIMBABWE"]
            """
            
            # Save the system message for logging
            system_file = session_dir / "system_message.txt"
            with open(system_file, "w") as f:
                f.write(system_message)
            
            # Prepare the user message with images
            user_message = []
            user_message.append({
                "type": "text", 
                "text": "Extract information from these passport documents and create YAML for DS-160 personal sections. Focus on names, passport details, dates, place of birth, and nationality."
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
            logger.info(f"Calling OpenAI with {len(prepared_files)} passport documents")
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
            logger.error(f"Error processing passport documents: {str(e)}", exc_info=True)
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
            pdf_conversion_dir = self.passport_log_dir / "pdf_conversions"
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
    
    def _load_personal_templates(self) -> str:
        """Load the personal related YAML templates"""
        try:
            if not self.templates_dir.exists():
                raise FileNotFoundError(f"Template directory not found at: {self.templates_dir}")
            
            # Load the personal related templates
            personal_templates = [
                "personal_page1.yaml",
                "personal_page2.yaml", 
                "relatives_page.yaml"
            ]
            
            all_templates = []
            for template_name in personal_templates:
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
                raise FileNotFoundError(f"No personal templates found in {self.templates_dir}")
                
            return "\n\n".join(all_templates)
            
        except Exception as e:
            logger.error(f"Error loading templates: {str(e)}", exc_info=True)
            raise
    
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
        if 'passport' in type_lower:
            return '.jpg'  # Assume passport pages are images
        
        # Default to jpg as a fallback
        return '.jpg' 