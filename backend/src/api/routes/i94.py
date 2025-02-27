from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.utils.i94_handler import I94Handler
import logging
import traceback

logger = logging.getLogger(__name__)
router = APIRouter()
i94_handler = I94Handler()

class I94Request(BaseModel):
    givenName: str
    surname: str
    birthDate: str
    documentNumber: str
    documentCountry: str

@router.post("/process")
async def process_i94(request: I94Request):
    try:
        logger.info(f"Processing I94 data for: {request.surname}, {request.givenName}")
        result = await i94_handler.process_data(request.dict())
        logger.info(f"I94 processing result status: {result.get('status')}")
        return result
    except Exception as e:
        trace = traceback.format_exc()
        logger.error(f"Error processing I94 data: {str(e)}\n{trace}")
        raise HTTPException(status_code=500, detail=str(e)) 