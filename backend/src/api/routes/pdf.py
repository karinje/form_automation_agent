from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
import yaml
import glob
import os
import sys
from pathlib import Path
from src.utils.openai_handler import OpenAIHandler
import logging

# Add the project root to Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

router = APIRouter()
openai_handler = OpenAIHandler()
logger = logging.getLogger(__name__)

class PDFTextRequest(BaseModel):
    text: str

class PDFTextResponse(BaseModel):
    text: str
    error: str | None = None

def load_yaml_templates():
    """Load all YAML template files"""
    templates = {}
    # Get the absolute path to templates directory
    template_path = Path(__file__).parent.parent.parent / "templates" / "yaml_files"
    yaml_files = glob.glob(str(template_path / "*.yaml"))
    
    for file_path in sorted(yaml_files):
        with open(file_path, 'r') as f:
            template_name = Path(file_path).stem
            templates[template_name] = yaml.safe_load(f)
    
    return templates

last_generated_yaml = None  # Add at top of file

@router.post("/pdf-to-yaml")
async def convert_pdf_to_yaml(request: PDFTextRequest) -> PDFTextResponse:
    try:
        global last_generated_yaml
        if not os.getenv('OPENAI_API_KEY'):
            raise HTTPException(
                status_code=500, 
                detail="OPENAI_API_KEY not found in environment variables"
            )
            
        logger.info(f"Received PDF text of length: {len(request.text)}")
        logger.info(f"First 100 chars of PDF text: {request.text[:100]}")
        
        yaml_text = await openai_handler.generate_yaml_from_text(request.text)
        last_generated_yaml = yaml_text  # Store the YAML
        logger.info(f"Successfully generated YAML of length: {len(yaml_text)}")
        
        return PDFTextResponse(text=yaml_text, error=None)
    except Exception as e:
        logger.error(f"Error in convert_pdf_to_yaml: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/last-yaml")
async def get_last_yaml():
    """Get the last generated YAML for debugging"""
    return {"yaml": last_generated_yaml} 