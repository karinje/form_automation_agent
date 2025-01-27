from openai import OpenAI
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

class OpenAIHandler:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key not provided and not found in environment variables")
        self.client = OpenAI(api_key=self.api_key)

    def solve_captcha(self, image_base64: str, max_retries: int = 3) -> str:
        """Send CAPTCHA image to OpenAI Vision API and get text response"""
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Read the CAPTCHA text from this image. Return only the text/numbers."
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{image_base64}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=50
                )
                
                captcha_text = response.choices[0].message.content.strip()
                logger.info(f"OpenAI returned CAPTCHA text: {captcha_text}")
                return captcha_text
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}")
                if attempt == max_retries - 1:
                    raise 