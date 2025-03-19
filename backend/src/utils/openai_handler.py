import os
import openai
import logging
from typing import Optional, Dict, Any
from pathlib import Path
import json
import yaml
from prompts.pdf_to_yaml import PDF_TO_YAML_PROMPT
from datetime import datetime
import asyncio
import re

logger = logging.getLogger(__name__)

class OpenAIHandler:
    def __init__(self):

        self.client = openai.AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        if not os.environ.get('OPENAI_API_KEY'):
            raise ValueError(f"OPENAI_API_KEY not found in environment variables {os.environ.get('OPENAI_API_KEY')}")
        self.templates_dir = Path(__file__).parent.parent / "templates" / "yaml_files"
        logger.info(f"Template directory path: {self.templates_dir}")

    def load_template(self, page_name: str) -> Dict[str, Any]:
        """Load a specific page template"""
        template_path = self.templates_dir / f"{page_name}.yaml"
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")
            
        with open(template_path) as f:
            return yaml.safe_load(f)
            
    async def generate_yaml_from_text(self, text: str) -> str:
        try:
            # Load raw YAML templates with comments
            templates_text = self._load_raw_yaml_templates()
            logger.info("Loaded raw YAML templates with comments")
            
            prompt = f"""
            Convert this PDF text to YAML format matching these templates.
            
            PDF TEXT:
            {text}
            
            YAML TEMPLATES:
            {templates_text}
            
            Rules:
            1. Must include these required sections in order:
               - personal_page1
               - personal_page2
               - travel_page
               - travel_companions_page
               - previous_travel_page
               - address_phone_page
               - pptvisa_page
               - us_contact_page
               - relatives_page
               - spouse_page
               - workeducation1_page
               - workeducation2_page
               - workeducation3_page
               - security_background1_page
               - security_background2_page
               - security_background3_page
               - security_background4_page
               - security_background5_page

            2. Button clicks should be an array of numbers, like:
               button_clicks: [1, 2]

            3. Other rules remain same:
               - Make sure you pay attention to instructions that follow every yaml field after # in same line on the input yaml sample 
               - persona_page1, personal_page2, address_phone_page, pptvisa_page, are found in "Personal, Address, Phone, and Passport/Travel Document Information" sections of the DS-160 input text 
               - us_contact_page is found in "U.S. Contact Information" section of the DS-160 input text
               - travel_page, travel_companions_page, previous_travel_page are found in "Travel Information" section of the DS-160 input text
               - relatives_page, spouse_page are found in "Family Information" section of the DS-160 input text
               - workeducation1_page, workeducation2_page, workeducation3_page are found in "Work/Education/Training Information" section of the DS-160 input text
               - security_background1_page, security_background2_page, security_background3_page, security_background4_page, security_background5_page are found in "Security and Background" section of the DS-160 input text
               - Use "Y"/"N" for yes/no fields
               - Use "true"/"false" for boolean fields (yaml fields that end with _na)
               - If you see "DOES NOT APPLY" in the input text, that usualy means the field's _na version is true. 
               - Use 3-letter format for months (JAN, FEB, etc.)
               - For day field, use 2 digits for day (01, 02, ...31 etc.)
               - For year field, use 4 digits for year (2024, 2025, etc.)
               - Preserve any special characters in names/addresses
               - Use empty string "" for missing values
               - Keep array structures for repeated elements such as other_names in personal_page2, travel_companions in travel_page, etc...
               - Include button_clicks arrays as shown in template
               - Maintain exact field names and hierarchy
               - If instructions case sensitive, make sure you follows same case as in options provided. So choose Self instead of SELF for instance. 
            """

            # Save prompt to file
            log_dir = Path(__file__).parent.parent / "logs"
            log_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Save prompt
            prompt_file = log_dir / f"prompt_{timestamp}.txt"
            with open(prompt_file, 'w') as f:
                f.write(prompt)
            logger.info(f"Saved prompt to {prompt_file}")

            logger.info("Calling OpenAI API...")
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt}
                ]
            )
            
            result = response.choices[0].message.content
            
            # Clean up YAML code block markers
            result = result.strip()
            if result.startswith('```yaml'):
                result = result[7:]  # Remove ```yaml prefix
            if result.startswith('```'):
                result = result[3:]  # Remove ``` prefix
            if result.endswith('```'):
                result = result[:-3]  # Remove ``` suffix
            result = result.strip()  # Remove any extra whitespace
            
            # Save response
            response_file = log_dir / f"response_{timestamp}.yaml"
            with open(response_file, 'w') as f:
                f.write(result)
            logger.info(f"Saved response to {response_file}")
            
            logger.info(f"Got OpenAI response of length: {len(result)}")
            logger.info("Generated YAML:\n" + result)
            return result
            
        except Exception as e:
            logger.error(f"Error in generate_yaml_from_text: {str(e)}", exc_info=True)
            raise

    def _load_raw_yaml_templates(self) -> str:
        """Load all YAML templates as raw text to preserve comments"""
        try:
            if not self.templates_dir.exists():
                raise FileNotFoundError(f"Template directory not found at: {self.templates_dir}")
            
            yaml_files = sorted(self.templates_dir.glob("*.yaml"))
            if not yaml_files:
                raise FileNotFoundError(f"No YAML files found in {self.templates_dir}")

            # Concatenate all YAML files with separators
            all_templates = []
            for file_path in yaml_files:
                try:
                    with open(file_path, 'r') as f:
                        template_content = f.read()
                        all_templates.append(template_content)
                        logger.info(f"Loaded template: {file_path.name}")
                except Exception as e:
                    logger.error(f"Error loading template {file_path}: {str(e)}")
                    raise
                
            return "\n\n".join(all_templates)
            
        except Exception as e:
            logger.error(f"Error loading templates: {str(e)}", exc_info=True)
            raise

    async def solve_captcha(self, image_base64: str) -> str:
        """Solve CAPTCHA using OpenAI's vision model"""
        try:
            # Add data URI prefix if not present
            if not image_base64.startswith('data:image/png;base64,'):
                image_base64 = f"data:image/png;base64,{image_base64}"
            
            logger.info(f"Sending CAPTCHA image to OpenAI, length: {len(image_base64)}")
            
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "What is the text shown in this CAPTCHA image? Return only the text, no other words."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_base64
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300
            )
            
            result = response.choices[0].message.content.strip()
            # Extract just the CAPTCHA code
            if '"' in result:
                captcha_code = re.search(r'"([^"]+)"', result)
                if captcha_code:
                    result = captcha_code.group(1)
            logger.info(f"Extracted CAPTCHA code: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to solve CAPTCHA: {str(e)}")
            raise

    def solve_captcha_sync(self, captcha_base64: str) -> str:
        """Synchronous wrapper for solve_captcha"""
        try:
            # Get the current event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                # If no loop exists, create a new one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # If loop is running, create a new one
            if loop.is_running():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            return loop.run_until_complete(self.solve_captcha(captcha_base64))
        finally:
            # Clean up
            if loop and not loop.is_closed():
                loop.close() 

    async def extract_text_from_image(self, image_path: str) -> Optional[str]:
        """Extract text from an image using GPT-4 Vision"""
        try:
            import base64
            
            # Read and encode the image
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            # Call the OpenAI Vision API
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all text from this document image. Focus on obtaining key information like names, dates, addresses, ID numbers, visa details, travel information, etc. Format the output as plain text."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            return None 