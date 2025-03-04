from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Dict, Any, List, Optional
import json
import logging
import traceback
from src.utils.document_handler import DocumentHandler

logger = logging.getLogger(__name__)
router = APIRouter()
document_handler = DocumentHandler()

@router.post("/process")
async def process_documents(
    license: Optional[UploadFile] = File(None),
    visa: Optional[UploadFile] = File(None),
    # i797: Optional[UploadFile] = File(None),  # Removed
    travelTicket: Optional[UploadFile] = File(None),
    metadata: str = Form(...)
):
    try:
        logger.info(f"Processing uploaded documents")
        
        # Parse metadata JSON
        try:
            metadata_dict = json.loads(metadata)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid metadata format")
        
        # Collect file content
        files_data = {}
        
        if license:
            files_data['license'] = await license.read()
        
        if visa:
            files_data['visa'] = await visa.read()
            
        # if i797:
        #     files_data['i797'] = await i797.read()  # Removed
            
        if travelTicket:
            files_data['travelTicket'] = await travelTicket.read()
        
        # Process the documents
        result = await document_handler.process_data(files_data, metadata_dict)
        
        return result
    except Exception as e:
        trace = traceback.format_exc()
        logger.error(f"Error processing documents: {str(e)}\n{trace}")
        raise HTTPException(status_code=500, detail=str(e)) 