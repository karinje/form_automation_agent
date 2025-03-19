import logging
from typing import Dict, Any, List, Tuple
from playwright.async_api import async_playwright
import asyncio
import re
import yaml
import os
from openai import AsyncOpenAI
import random
from pathlib import Path
from datetime import datetime, timedelta
import pandas as pd
import math

logger = logging.getLogger(__name__)

class I94Handler:
    def __init__(self):
        self.base_url = "https://i94.cbp.dhs.gov/search/history-search"
        self.client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    def process_travel_data(self, table_text: str) -> List[Tuple[str, str, int]]:
        # Convert text to DataFrame
        lines = [line.split('\t') for line in table_text.strip().split('\n')]
        df = pd.DataFrame(lines[1:], columns=lines[0])  # Skip header row
        
        # Convert date strings to datetime
        df['DATE'] = pd.to_datetime(df['DATE'])
        
        # Check if first row is Departure, if not add current date as Departure
        if df.iloc[0]['TYPE'] != 'Departure':
            current_date = pd.Timestamp.now()
            new_row = pd.DataFrame([{
                'Row': '0',
                'DATE': current_date,
                'TYPE': 'Departure',
                'LOCATION': df.iloc[0]['LOCATION']
            }])
            df = pd.concat([new_row, df]).reset_index(drop=True)
        
        visits = []
        i = 0
        visit_count = 0
        
        while i < len(df) - 1 and visit_count < 5:
            departure_row = df.iloc[i]
            arrival_row = df.iloc[i + 1]
            
            if departure_row['TYPE'] == 'Departure' and arrival_row['TYPE'] == 'Arrival':
                # Calculate months between arrival and departure and round up
                days = (departure_row['DATE'] - arrival_row['DATE']).days
                months = math.ceil(days / 30.44)  # Round up to nearest month
                
                # Format dates
                arrival_date = arrival_row['DATE'].strftime('%d-%b-%Y').upper()
                
                visits.append((
                    str(visit_count + 1),
                    arrival_date,
                    months  # Now an integer
                ))
                
                visit_count += 1
                i += 2
            else:
                i += 1
        
        return visits

    def merge_yaml_data(self, original_yaml: Dict, new_yaml: Dict) -> Dict:
        """Merge new YAML data into original, keeping original values where new is empty"""
        merged = original_yaml.copy()
        
        # Update only the fields that are present in new_yaml
        if 'previous_travel_page' in new_yaml:
            new_data = new_yaml['previous_travel_page']
            
            # Update previous_us_travel if present
            if 'previous_us_travel' in new_data and new_data['previous_us_travel']:
                merged['previous_travel_page']['previous_us_travel'] = new_data['previous_us_travel']
            
            # Update previous_travel_details if present
            if 'previous_travel_details' in new_data:
                merged['previous_travel_page']['previous_travel_details'] = []
                for i, visit in enumerate(new_data['previous_travel_details']):
                    if visit['arrival']['month'] and visit['arrival']['day'] and visit['arrival']['year']:
                        merged['previous_travel_page']['previous_travel_details'].append(visit)
            
            # Update previous_visa if present
            if 'previous_visa' in new_data and new_data['previous_visa']:
                merged['previous_travel_page']['previous_visa'] = new_data['previous_visa']
        
        return merged

    async def generate_yaml_from_i94(self, page_content: str, yaml_template: str) -> str:
        try:
            # Process the table data first
            visits = self.process_travel_data(page_content)
            
            # Create a formatted summary for OpenAI
            visits_summary = "\n".join([
                f"Visit {num}:\n"
                f"  Arrival Date: {date}\n"
                f"  Length of Stay: {months} months"
                for num, date, months in visits
            ])
            
            prompt = f"""
            Given this processed I94 travel history and YAML template, please format the data according to the template.
            
            Processed Travel History:
            {visits_summary}
            
            YAML Template:
            previous_travel_page:
            previous_us_travel: ""  # Have you ever been in the U.S.? If any arrival dates are found in input, mark "Y" else "N"
            previous_travel_details:  # Previous visits to US
                - arrival:
                    month: ""  # Date Arrived (1) Date Arrived - Month (3-letter month format JAN, FEB, MAR, etc )
                    day: ""    # Date Arrived (1) Day (2-digit format 01, 02, 03, etc)  
                    year: ""   # Date Arrived (1) Year (4-digit format 2020, 2021, 2022, 2023, etc)
                length_of_stay:
                    number: ""   # Length of Stay corresponding to Date Arrived (1)
                    unit: ""  # Length of Stay - Period (Year(s), Month(s), Week(s), Day(s), Less than 24 Hours) case sensitive so pick exactly from options provided
                - arrival:     # Add this array element only if Date Arrived (2) details exists, if not dont even add this array element.
                    month: ""  # Add this only if Date Arrived (2) details exists, if not dont even add this array element. Date Arrived (2) Date Arrived - Month (3-letter month format) 
                    day: ""     # Add this only if Date Arrived (2) details exists, if not dont even add this array element. Date Arrived (2) Day (2-digit format) if it exists else leave entire section blank
                    year: ""  # Add this only if Date Arrived (2) details exists, if not dont even add this array element. Date Arrived (2) Year (4-digit format) if it exists else leave entire section blank
                length_of_stay:
                    number: ""  # Add this only if Date Arrived (2) details exists, if not dont even add this array element. Length of Stay corresponding to Date Arrived (2)
                    unit: ""  # Add this only if Date Arrived (2) details exists, if not dont even add this array element. Length of Stay - Period (Year(s), Month(s), Week(s), Day(s), Less than 24 Hours) case sensitive so pick exactly from options provided
                - arrival:     # Add this array element only if Date Arrived (3) details exists, if not dont even add this array element.
                    month: ""  # Add this only if Date Arrived (3) details exists, if not dont even add this array element. Date Arrived (3) Date Arrived - Month (3-letter month format) 
                    day: ""     # Add this only if Date Arrived (3) details exists, if not dont even add this array element. Date Arrived (3) Day (2-digit format) if it exists else leave entire section blank
                    year: ""  # Add this only if Date Arrived (3) details exists, if not dont even add this array element. Date Arrived (3) Year (4-digit format) if it exists else leave entire section blank
                length_of_stay:
                    number: ""  # Add this only if Date Arrived (3) details exists, if not dont even add this array element. Length of Stay corresponding to Date Arrived (3)
                    unit: ""  # Add this only if Date Arrived (3) details exists, if not dont even add this array element. Length of Stay - Period (Year(s), Month(s), Week(s), Day(s), Less than 24 Hours) case sensitive so pick exactly from options provided
                - arrival:     # Add this array element only if Date Arrived (4) details exists, if not dont even add this array element.
                    month: ""  # Add this only if Date Arrived (4) details exists, if not dont even add this array element. Date Arrived (4) Date Arrived - Month (3-letter month format) if it exists else leave entire section blank
                    day: ""     # Add this only if Date Arrived (4) details exists, if not dont even add this array element. Date Arrived (4) Day (2-digit format) if it exists else leave entire section blank
                    year: ""  # Add this only if Date Arrived (4) details exists, if not dont even add this array element. Date Arrived (4) Year (4-digit format) if it exists else leave entire section blank
                length_of_stay:
                    number: ""  # Add this only if Date Arrived (4) details exists, if not dont even add this array element. Length of Stay corresponding to Date Arrived (4)
                    unit: ""  # Add this only if Date Arrived (4) details exists, if not dont even add this array element. Length of Stay - Period (Year(s), Month(s), Week(s), Day(s), Less than 24 Hours) case sensitive so pick exactly from options provided
                - arrival:
                    month: ""  # Add this only if Date Arrived (5) details exists, if not dont even add this array element. Date Arrived (5) Date Arrived - Month (3-letter month format) if it exists else leave entire section blank
                    day: ""     # Date Arrived (5) Day (2-digit format) if it exists else leave entire section blank
                    year: ""  # Date Arrived (5) Year (4-digit format) if it exists else leave entire section blank
                length_of_stay:
                    number: ""  # Add this only if Date Arrived (5) details exists, if not dont even add this array element. Length of Stay corresponding to Date Arrived (5)
                    unit: ""  # Add this only if Date Arrived (5) details exists, if not dont even add this array element. Length of Stay - Period (Year(s), Month(s), Week(s), Day(s), Less than 24 Hours) case sensitive so pick exactly from options provided
            #if number of visits is less than 5, only include as many array elements dont include array elements and then leave them empty
            previous_visa: "Y"   # Have you ever been issued a U.S. Visa? If any arrival dates are found in input, mark "Y" else leave empty "" 

            
            Please format the response as valid YAML matching the template structure.
            Rules:
            1. Use the exact dates provided (already in correct format)
            2. Use the calculated lengths of stay provided
            3. Mark previous_us_travel as "Y" if there are visits, "N" if empty
            4. Maintain the order of visits (latest first)
            """

            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that processes I94 travel history data and converts it to YAML format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )
            
            result = response.choices[0].message.content
            logger.info("Received response from GPT-4o")
            
            # Clean up YAML code block markers if present
            result = result.strip()
            if result.startswith('```yaml'):
                result = result[7:]
            if result.startswith('```'):
                result = result[3:]
            if result.endswith('```'):
                result = result[:-3]
            
            return result.strip()
            
        except Exception as e:
            logger.error(f"Error in GPT-4 processing: {str(e)}")
            raise

    async def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Create logs directory if it doesn't exist
            log_dir = Path(__file__).parent.parent / "logs" / "i94"
            log_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            # Check environment variable for headless mode setting
            headless = os.environ.get("HEADLESS_BROWSER", "true").lower() == "true"
            logger.info(f"Launching browser with headless={headless}")

            async with async_playwright() as p:
                # Launch browser with more human-like characteristics
                browser = await p.chromium.launch(
                    headless=headless,
                    args=[
                        '--window-size=1920,1080',
                        '--disable-blink-features=AutomationControlled'
                    ]
                )
                
                # Add human-like characteristics to context
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    has_touch=True,
                    locale='en-US',
                    timezone_id='America/New_York'
                )
                
                # Add random delays function
                async def human_delay(min_ms=500, max_ms=2000):
                    delay = random.uniform(min_ms, max_ms)
                    await asyncio.sleep(delay/1000)

                # Add human-like typing function
                async def human_type(element, text):
                    for char in text:
                        await element.type(char)
                        await human_delay(50, 200)

                page = await context.new_page()

                try:
                    # Add random mouse movements
                    async def move_mouse_randomly():
                        x = random.randint(100, 700)
                        y = random.randint(100, 500)
                        await page.mouse.move(x, y)
                        await human_delay(100, 500)

                    await page.goto(self.base_url)
                    await human_delay()
                    await move_mouse_randomly()
                    
                    # Rest of the code with human-like interactions
                    modal = await page.wait_for_selector("i94-security-modal")
                    await human_delay()
                    
                    modal_content = await modal.query_selector("mat-dialog-content")
                    if modal_content:
                        # Scroll with random pauses
                        content_height = await modal_content.evaluate("e => e.scrollHeight")
                        steps = random.randint(5, 8)
                        for i in range(steps):
                            scroll_amount = (content_height / steps) * (i + 1)
                            await modal_content.evaluate(f"e => e.scrollTo(0, {scroll_amount})")
                            await human_delay(300, 800)
                        
                        await human_delay(1000, 2000)
                        await move_mouse_randomly()
                        await page.click("#consent-btn")
                        
                        # Fill form fields with human-like behavior
                        for field, value in [
                            ("#first-name", data['givenName']),
                            ("#last-name", data['surname']),
                            ("#birth-date", data['birthDate'])
                        ]:
                            await move_mouse_randomly()
                            await page.click(field)
                            await human_delay()
                            await human_type(page.locator(field), value)
                            await human_delay()
                        
                        # Handle country code with human-like typing
                        country_match = re.search(r'(.*?)\s*\((.*?)\)', data['documentCountry'])
                        if country_match:
                            country_code = country_match.group(2)
                            await move_mouse_randomly()
                            await page.click('input[formcontrolname="alpha3CountryCode"]')
                            await human_delay()
                            await human_type(page.locator('input[formcontrolname="alpha3CountryCode"]'), country_code)
                            await human_delay(800, 1200)
                            await move_mouse_randomly()
                            await page.click('#document-number')
                            
                        # Fill document number with human-like typing
                        await human_delay()
                        await human_type(page.locator('#document-number'), data['documentNumber'])
                        
                        # Submit with random delay
                        await human_delay(1000, 2000)
                        await move_mouse_randomly()
                        await page.click('#submit-travel-history')
                        
                        # Wait for results page to load
                        logger.info("Waiting for results page")
                        await page.wait_for_url("**/results")
                        await page.wait_for_load_state('networkidle')
                        
                        # Get just the text content instead of full HTML
                        logger.info("Extracting travel history text")
                        page_text = await page.evaluate("""
                            () => {
                                // Try to get the specific table content first
                                const table = document.querySelector('table');
                                if (table) {
                                    return table.innerText;
                                }
                                // Fallback to main content area if table not found
                                const content = document.querySelector('main');
                                if (content) {
                                    return content.innerText;
                                }
                                // Last resort - get all body text
                                return document.body.innerText;
                            }
                        """)
                        
                        # Save raw text content
                        raw_content_file = log_dir / f"raw_content_{timestamp}.txt"
                        with open(raw_content_file, 'w', encoding='utf-8') as f:
                            f.write(page_text)
                        logger.info(f"Saved raw content to {raw_content_file}")

                        # Load the previous travel YAML template
                        with open('src/templates/yaml_files/previous_travel_page.yaml', 'r') as f:
                            yaml_template = f.read()
                        
                        # Process the I94 data and get new YAML
                        response = await self.generate_yaml_from_i94(page_text, yaml_template)
                        new_yaml = yaml.safe_load(response)

                        # Save for debugging
                        with open(log_dir / f"new_yaml_{timestamp}.yaml", 'w') as f:
                            yaml.dump(new_yaml, f)

                        # Return just the previous_travel_page section
                        return {
                            "status": "success",
                            "message": "Successfully processed travel history",
                            "data": {
                                "previous_travel_page": new_yaml.get('previous_travel_page', {})
                            }
                        }

                except Exception as e:
                    logger.error(f"Error during I94 automation: {str(e)}")
                    return {"status": "error", "message": str(e)}
                    
                finally:
                    await browser.close()

        except Exception as e:
            logger.error(f"Error in I94 handler: {str(e)}")
            return {"status": "error", "message": str(e)} 