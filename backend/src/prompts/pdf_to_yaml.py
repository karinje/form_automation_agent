import os
import yaml
from pathlib import Path

def load_yaml_templates():
    """Load and combine all YAML templates into a single structure"""
    templates_dir = Path(__file__).parent.parent / "templates/yaml_files"
    combined_template = {}
    
    for yaml_file in sorted(templates_dir.glob("*.yaml")):
        with open(yaml_file, 'r') as f:
            template = yaml.safe_load(f)
            combined_template.update(template)
            
    return yaml.dump(combined_template, 
                    default_flow_style=False,
                    allow_unicode=True,
                    sort_keys=False)

# Generate the prompt using the templates
PDF_TO_YAML_PROMPT = f'''Convert the following extracted text from a PDF DS-160 form into a structured YAML format.

Important: Return ONLY the raw YAML content. Do not include any markdown formatting, code blocks, or backticks.

Use this exact structure:

{load_yaml_templates()}

Rules:
1. Use Y/N for yes/no fields
2. Use true/false for boolean fields (like _na fields)
3. Use 3-letter format for months (JAN, FEB, etc.)
4. Preserve any special characters in names/addresses
5. Use empty string "" for missing values
6. Keep array structures for repeated elements (other_names, travel_companions, etc.)
7. Include button_clicks arrays as shown in template
8. Maintain exact field names and hierarchy
''' 