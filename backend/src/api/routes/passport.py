from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Dict, Any, List, Optional
import json
import logging
import traceback
from src.utils.passport_handler import PassportHandler

logger = logging.getLogger(__name__)
router = APIRouter()
passport_handler = PassportHandler()

@router.post("/process")
async def process_passport(
    passportFirst: Optional[UploadFile] = File(None),
    passportLast: Optional[UploadFile] = File(None),
    metadata: str = Form(...)
):
    try:
        logger.info(f"Processing uploaded passport documents")
        
        # Parse metadata JSON
        try:
            metadata_dict = json.loads(metadata)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid metadata format")
        
        # Collect file content
        files_data = {}
        
        if passportFirst:
            files_data['passportFirst'] = await passportFirst.read()
        
        if passportLast:
            files_data['passportLast'] = await passportLast.read()
        
        # Process the passport documents
        result = await passport_handler.process_data(files_data, metadata_dict)
        
        return result
    except Exception as e:
        trace = traceback.format_exc()
        logger.error(f"Error processing passport documents: {str(e)}\n{trace}")
        raise HTTPException(status_code=500, detail=str(e)) 