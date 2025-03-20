import os
import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import json
import yaml
from datetime import datetime
from playwright.async_api import async_playwright
import re
import random

from .openai_handler import OpenAIHandler

logger = logging.getLogger(__name__)

class LinkedInHandler:
    def __init__(self):
        # Try loading credentials from environment variables first
        self.username = os.environ.get('LINKEDIN_USERNAME')
        self.password = os.environ.get('LINKEDIN_PASSWORD')
        
        # If not found, try reading directly from .env file
        if not self.username or not self.password:
            logger.info("LinkedIn credentials not found in environment variables, trying to read from .env file")
            #self._load_credentials_from_dotenv()
            
        self.openai_handler = OpenAIHandler()
        self.log_dir = Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
        self.templates_dir = Path(__file__).parent.parent / "templates" / "yaml_files"
        
    def _load_credentials_from_dotenv(self):
        """Load LinkedIn credentials directly from .env file"""
        try:
            env_path = Path(__file__).parent.parent.parent.parent / ".env"
            if env_path.exists():
                logger.info(f"Found .env file at {env_path}")
                with open(env_path, 'r') as f:
                    env_content = f.read()
                    
                # Parse username
                username_match = re.search(r'LINKEDIN_USERNAME=(.+)', env_content)
                if username_match:
                    self.username = username_match.group(1).strip()
                    logger.info(f"Found LinkedIn username in .env file: {self.username[:3]}***")
                
                # Parse password
                password_match = re.search(r'LINKEDIN_PASSWORD=(.+)', env_content)
                if password_match:
                    self.password = password_match.group(1).strip()
                    logger.info("Found LinkedIn password in .env file")
                    
                if not self.username or not self.password:
                    logger.error("Could not find LinkedIn credentials in .env file")
            else:
                logger.error(f".env file not found at {env_path}")
        except Exception as e:
            logger.error(f"Error loading credentials from .env file: {str(e)}")
    
    async def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process LinkedIn data from frontend request"""
        try:
            if 'url' not in data:
                return {
                    "status": "error",
                    "message": "LinkedIn profile URL is required"
                }
                
            profile_url = data['url']
            logger.info(f"Processing LinkedIn profile: {profile_url}")
            
            # Extract LinkedIn data
            profile_data = await self.extract_linkedin_data(profile_url)
            
            if not profile_data:
                return {
                    "status": "error",
                    "message": "Failed to extract data from LinkedIn profile"
                }
                
            # Save raw data to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            raw_data_file = self.log_dir / f"linkedin_raw_{timestamp}.txt"
            
            with open(raw_data_file, 'w') as f:
                f.write(profile_data)
            
            logger.info(f"Saved raw LinkedIn data to {raw_data_file}")
            
            # Convert to YAML using OpenAI
            yaml_data = await self.generate_yaml_from_linkedin(profile_data)
            
            if not yaml_data:
                return {
                    "status": "error",
                    "message": "Failed to convert LinkedIn data to YAML format"
                }
                
            # Save YAML data to file
            yaml_file = self.log_dir / f"linkedin_yaml_{timestamp}.yaml"
            with open(yaml_file, 'w') as f:
                f.write(yaml_data)
                
            logger.info(f"Saved LinkedIn YAML data to {yaml_file}")
            
            # Parse YAML data
            try:
                parsed_yaml = yaml.safe_load(yaml_data)
                return {
                    "status": "success",
                    "data": parsed_yaml
                }
            except Exception as e:
                logger.error(f"Error parsing YAML data: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Error parsing YAML data: {str(e)}",
                    "raw_yaml": yaml_data
                }
            
        except Exception as e:
            logger.error(f"Error processing LinkedIn data: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": str(e)
            }
            
    async def extract_linkedin_data(self, profile_url: str) -> Optional[str]:
        """Extract education and work experience data from LinkedIn profile using Playwright"""
        try:
            headless = os.environ.get("HEADLESS_BROWSER", "true").lower() == "true"
            logger.info(f"Launching browser with headless={headless}")
            
            if not self.username or not self.password:
                logger.error(f"LinkedIn credentials not found")
                return None
            
            # Use more modern user agent that's less likely to trigger security
            modern_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=headless,
                    args=[
                        '--window-size=1920,1080',
                        '--disable-blink-features=AutomationControlled',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage'
                    ]
                )
                
                # More sophisticated browser fingerprinting
                context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent=modern_user_agent,
                    locale="en-US",
                    timezone_id="America/New_York",
                    has_touch=False,  # Most real LinkedIn users aren't on touch devices
                    permissions=["geolocation"],
                    color_scheme="light",
                    java_script_enabled=True,
                    extra_http_headers={
                        "Accept-Language": "en-US,en;q=0.9",
                        "Sec-CH-UA": '"Google Chrome";v="122", "Chromium";v="122", "Not=A?Brand";v="99"',
                        "Sec-CH-UA-Mobile": "?0",
                        "Sec-CH-UA-Platform": '"Windows"'
                    }
                )
                
                context.set_default_timeout(90000)
                page = await context.new_page()
                
                # Add more human-like behavior
                await page.evaluate("""
                    // Override navigator properties to avoid detection
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => false
                    });
                    
                    // Add more natural browser properties
                    window.chrome = {
                        runtime: {}
                    };
                    
                    // Simulate human-like values for various navigator properties
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => {
                            return [1, 2, 3, 4, 5];
                        }
                    });
                    
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                """)
                
                try:
                    # Login process
                    logger.info("Attempting LinkedIn login with anti-detection measures")
                    
                    # Take screenshots for debugging
                    log_dir = self.log_dir / "linkedin_debug"
                    log_dir.mkdir(exist_ok=True)
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    
                    if not await self._login_with_security_handling(page, log_dir, timestamp):
                        return None
                    
                    # Get data from both detail pages
                    profile_data = []
                    
                    # Get experience details
                    experience_url = f"{profile_url}/details/experience/"
                    logger.info(f"Navigating to experience details: {experience_url}")
                    await page.goto(experience_url, wait_until="domcontentloaded", timeout=60000)
                    await page.wait_for_timeout(5000)  # Wait for dynamic content
                    
                    experience_content = await page.evaluate("""
                        () => {
                            return document.body.innerText;
                        }
                    """)
                    profile_data.append("\n=== EXPERIENCE DETAILS ===\n")
                    profile_data.append(experience_content)
                    
                    # Get education details
                    education_url = f"{profile_url}/details/education/"
                    logger.info(f"Navigating to education details: {education_url}")
                    await page.goto(education_url, wait_until="domcontentloaded", timeout=60000)
                    await page.wait_for_timeout(5000)  # Wait for dynamic content
                    
                    education_content = await page.evaluate("""
                        () => {
                            return document.body.innerText;
                        }
                    """)
                    profile_data.append("\n=== EDUCATION DETAILS ===\n")
                    profile_data.append(education_content)
                    
                    # Save the full content
                    result = [
                        f"LinkedIn Profile URL: {profile_url}",
                        f"Experience URL: {experience_url}",
                        f"Education URL: {education_url}",
                        "\n",
                        *profile_data
                    ]
                    
                    return "\n".join(result)
                    
                except Exception as e:
                    logger.error(f"Error during extraction: {str(e)}")
                    raise
                finally:
                    await page.wait_for_timeout(10000)
                    await browser.close()
                
        except Exception as e:
            logger.error(f"Error in LinkedIn data extraction: {str(e)}", exc_info=True)
            return None
    
    async def _login_with_security_handling(self, page, log_dir, timestamp):
        """Enhanced login function that handles security challenges"""
        try:
            # Navigate to login page
            await page.goto("https://www.linkedin.com/login", wait_until="networkidle")
            
            # Take screenshot before login
            await page.screenshot(path=log_dir / f"linkedin_pre_login_{timestamp}.png")
            logger.info(f"Saved pre-login screenshot")
            
            # Fill in login details with delays between actions
            await page.fill("#username", self.username)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            await page.fill("#password", self.password)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Click sign in with a small delay
            await page.click("button[type='submit']")
            
            # Wait for navigation and check for security challenges
            try:
                # First check if we're on the challenge page
                await page.wait_for_load_state("networkidle", timeout=10000)
                
                # Take screenshot of the possible challenge page
                await page.screenshot(path=log_dir / f"linkedin_post_login_{timestamp}.png")
                logger.info(f"Saved post-login screenshot to check for security challenges")
                
                # Check for common security challenge elements
                has_captcha = await page.is_visible("text=Please complete this security check to access the site")
                has_verification = await page.is_visible("text=Let's do a quick security check")
                has_unusual = await page.is_visible("text=We've detected something unusual")
                
                if has_captcha or has_verification or has_unusual:
                    logger.warning("LinkedIn security challenge detected")
                    
                    # Take detailed screenshot of the challenge
                    await page.screenshot(path=log_dir / f"linkedin_security_challenge_{timestamp}.png")
                    
                    # Use fallback method - return true but log the situation
                    logger.info("Security challenge encountered - will attempt direct URL navigation instead")
                    return False
                
                # If we get here, login was successful
                logger.info("LinkedIn login successful")
                return True
                
            except Exception as e:
                logger.error(f"Error during login navigation: {str(e)}")
                await page.screenshot(path=log_dir / f"linkedin_login_error_{timestamp}.png")
                
                # Try to continue anyway by direct navigation
                logger.info("Attempting to continue despite login issues")
                return False
                
        except Exception as e:
            logger.error(f"Error during LinkedIn login: {str(e)}")
            return False
    
    def _load_education_work_templates(self) -> str:
        """Load the education and work related YAML templates"""
        try:
            if not self.templates_dir.exists():
                raise FileNotFoundError(f"Template directory not found at: {self.templates_dir}")
            
            # Only load the work/education related templates
            work_education_templates = [
                "workeducation1_page.yaml",
                "workeducation2_page.yaml"
                #"workeducation3_page.yaml"
            ]
            
            all_templates = []
            for template_name in work_education_templates:
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
                raise FileNotFoundError(f"No work/education templates found in {self.templates_dir}")
                
            return "\n\n".join(all_templates)
            
        except Exception as e:
            logger.error(f"Error loading templates: {str(e)}", exc_info=True)
            raise
    
    async def generate_yaml_from_linkedin(self, linkedin_data: str) -> Optional[str]:
        """Convert LinkedIn data to DS-160 YAML format using OpenAI with address lookups"""
        try:
            # Load work/education YAML templates with comments
            templates_text = self._load_education_work_templates()
            logger.info("Loaded work/education YAML templates with comments")
            
            # First, extract companies and educational institutions for address lookups
            companies_and_institutions = await self._extract_organizations(linkedin_data)
            logger.info(f"Extracted {len(companies_and_institutions)} organizations for address lookup")
            
            # Perform address lookups for all organizations
            address_data = {}
            for org_type, org_name in companies_and_institutions:
                address = await self._lookup_organization_address(org_name, org_type)
                if address:
                    address_data[org_name] = address
                    logger.info(f"Found address for {org_name}: {address}")
            
            # Add address data to the prompt
            address_info = "\n\nOrganization contact information:\n"
            for org_name, contact_info in address_data.items():
                address_str = f"{contact_info.get('street_address', 'N/A')}, {contact_info.get('city', 'N/A')}, {contact_info.get('state_province', 'N/A')}, {contact_info.get('postal_code', 'N/A')}, {contact_info.get('country', 'N/A')}"
                phone = contact_info.get('phone_number', 'N/A')
                address_info += f"{org_name}: Address: {address_str} | Phone: {phone}\n"
            
            # Complete prompt with address data
            prompt = f"""
            Convert this LinkedIn profile data to DS-160 YAML format for these three sections:
            - workeducation1_page
            - workeducation2_page
            
            
            LinkedIn profile data:
            {linkedin_data}
            
            {address_info}
            
            YAML TEMPLATES:
            {templates_text}
            
            Rules:
            1. Create YAML for each of the three work/education sections following the template format
            2. Use "Y"/"N" for yes/no fields
            3. Use "true"/"false" for boolean fields (yaml fields that end with _na)
            4. Add button_clicks: [1, 2] at the end of each section
            5. For dates, use day format as 2 digits (01-31) if date is unavailable (if only year and month or only year is provied) use 01
            6. For month use 3-letter format (JAN, FEB, etc.), if only year is provided an no month is included use "JAN"
            7. For year use 4 digits such as 2020, 2021, 2022, etc.
            8. Make reasonable assumptions based on the LinkedIn data to fill the required fields
            9. For occupation fields, choose the most appropriate category from those shown in the template
            9. Use the provided address and phone information to populate contact fields for companies and educational institutions
            9. For country dropdown use one of the following: ["AFGHANISTAN", "ALBANIA", "ALGERIA",
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
           
            
            Output format:
            workeducation1_page:
              # work history fields from template
              button_clicks: [1, 2]
              
            workeducation2_page:
              # education history fields from template
              button_clicks: [1, 2]
              
            """
            
            # Save prompt to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            prompt_file = self.log_dir / f"linkedin_prompt_{timestamp}.txt"
            with open(prompt_file, 'w') as f:
                f.write(prompt)
                
            logger.info(f"Saved LinkedIn prompt to {prompt_file}")
            
            # Call OpenAI API
            response = await self.openai_handler.client.chat.completions.create(
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
            result = result.strip()
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating YAML from LinkedIn data: {str(e)}", exc_info=True)
            return None
    
    async def _extract_organizations(self, linkedin_data: str) -> List[Tuple[str, str]]:
        """Extract company and educational institution names from LinkedIn data using GPT"""
        try:
            prompt = f"""
            Extract all company names and educational institutions from this LinkedIn profile data.
            Return them in a structured format for further processing.
            
            LinkedIn data:
            {linkedin_data}
            
            For each organization, identify whether it's a company or educational institution.
            """
            
            # Define the function for GPT to call
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "extract_organizations",
                        "description": "Extract company and educational institution names from LinkedIn profile data",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "organizations": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "name": {
                                                "type": "string",
                                                "description": "Name of the company or educational institution"
                                            },
                                            "type": {
                                                "type": "string",
                                                "enum": ["company", "educational_institution"],
                                                "description": "Type of organization"
                                            }
                                        },
                                        "required": ["name", "type"]
                                    }
                                }
                            },
                            "required": ["organizations"]
                        }
                    }
                }
            ]
            
            # Call GPT with function calling
            response = await self.openai_handler.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                tools=tools,
                tool_choice={"type": "function", "function": {"name": "extract_organizations"}}
            )
            
            # Parse the response
            tool_call = response.choices[0].message.tool_calls[0]
            result = json.loads(tool_call.function.arguments)
            
            # Convert to the format we need: List[Tuple[str, str]]
            organizations = []
            for org in result.get("organizations", []):
                org_name = org.get("name")
                org_type = org.get("type")
                if org_name and org_type:
                    organizations.append((org_type, org_name))
            
            return organizations
            
        except Exception as e:
            logger.error(f"Error extracting organizations: {str(e)}")
            return []
    
    async def _lookup_organization_address(self, org_name: str, location: str = None) -> Optional[Dict]:
        """Look up contact information for an organization with location hint"""
        try:
            # Modify prompt to include location if provided
            prompt = f"Find the contact information for {org_name}"
            if location and location.strip():
                prompt += f" in {location}"
            
            prompt += ". Include the street address, city, state/province, postal code, country, and phone number if available."
            
            # Define the function for GPT to call
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "provide_contact_info",
                        "description": f"Provide address and phone details for {org_name}",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "street_address": {
                                    "type": "string",
                                    "description": "Street address including building number and street name"
                                },
                                "city": {
                                    "type": "string",
                                    "description": "City name"
                                },
                                "state_province": {
                                    "type": "string",
                                    "description": "State or province name"
                                },
                                "postal_code": {
                                    "type": "string",
                                    "description": "Postal or ZIP code"
                                },
                                "country": {
                                    "type": "string",
                                    "description": "Country name"
                                },
                                "phone_number": {
                                    "type": "string",
                                    "description": "Phone number with country code but without hypen, space or any other characters"
                                }
                            },
                            "required": ["street_address", "city", "state_province", "country"]
                        }
                    }
                }
            ]
            
            # Call GPT with function calling
            response = await self.openai_handler.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                tools=tools,
                tool_choice={"type": "function", "function": {"name": "provide_contact_info"}}
            )
            
            # Parse the response
            tool_call = response.choices[0].message.tool_calls[0]
            result = json.loads(tool_call.function.arguments)
            
            # Log the address and phone found
            logger.info(f"Contact info found for {org_name}: {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error looking up contact info for {org_name}: {str(e)}")
            return None 