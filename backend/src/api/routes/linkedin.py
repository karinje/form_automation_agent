from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.utils.linkedin_handler import LinkedInHandler
import logging
import traceback

logger = logging.getLogger(__name__)
router = APIRouter()
linkedin_handler = LinkedInHandler()

class LinkedInRequest(BaseModel):
    url: str

@router.post("/process")
async def process_linkedin(request: LinkedInRequest):
    try:
        logger.info(f"Processing LinkedIn profile URL: {request.url}")
        result = await linkedin_handler.process_data({"url": request.url})
        logger.info(f"LinkedIn processing result status: {result.get('status')}")
        return result
    except Exception as e:
        trace = traceback.format_exc()
        logger.error(f"Error processing LinkedIn profile: {str(e)}\n{trace}")
        raise HTTPException(status_code=500, detail=str(e)) 