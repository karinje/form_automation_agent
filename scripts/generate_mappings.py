import json
import os
import sys
from pathlib import Path

# Get root directory
root_dir = Path(__file__).parent.parent
mappings_dir = root_dir / "mapping_files"
output_dir = root_dir / "form_renderer/utils/generated_mappings"
print(f'root_dir: {root_dir}')
print(f'mappings_dir: {mappings_dir}')
print(f'output_dir: {output_dir}')
# Create output directory if it doesn't exist
output_dir.mkdir(parents=True, exist_ok=True)

# Process each mapping file
for py_file in mappings_dir.glob("*_mapping.py"):
    # Read Python file content
    print(f'py_file: {py_file}')
    with open(py_file) as f:
        content = f.read()
    
    # Extract form_mapping dictionary using eval
    # Find the dictionary content between the curly braces
    start = content.find("{")
    end = content.rfind("}") + 1
    if start > -1 and end > 0:
        mapping_dict = eval(content[start:end])
        
        # Create JSON file
        json_file = output_dir / f"{py_file.stem}.json"
        print(f'json_file: {json_file}')
        with open(json_file, "w") as f:
            json.dump({"form_mapping": mapping_dict}, f, indent=2)
        print(f"Generated {json_file}")

print("Mapping generation complete!") 