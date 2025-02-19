from fastapi import APIRouter
from pydantic import BaseModel
from src.utils.linkedin_handler import LinkedInHandler

router = APIRouter()
linkedin_handler = LinkedInHandler()

class LinkedInRequest(BaseModel):
    data: dict

@router.post("/process")
async def process_linkedin(request: LinkedInRequest):
    try:
        result = linkedin_handler.process_data(request.data)
        return result
    except Exception as e:
        return {"error": str(e)}, 500 