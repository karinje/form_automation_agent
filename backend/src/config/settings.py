from pathlib import Path
from typing import Dict, Any
import yaml
from dotenv import load_dotenv
import os

class Config:
    def __init__(self):
        load_dotenv()  # Load environment variables
        self.base_url = os.getenv('DS160_BASE_URL', 'https://ceac.state.gov/GenNIV/Default.aspx')
        self.data_dir = Path(__file__).parent.parent.parent.parent / 'data'
        self.templates_dir = self.data_dir / 'input_templates'
        
    def load_input_data(self, input_file: Path) -> Dict[str, Any]:
        """Load and validate input YAML data"""
        with open(input_file, 'r') as f:
            data = yaml.safe_load(f)
        # TODO: Add validation
        return data
    
    def get_template(self) -> Dict[str, Any]:
        """Get the default DS-160 template"""
        template_path = self.templates_dir / 'ds160_template.yaml'
        return self.load_input_data(template_path) 