import os
import json

def convert_mapping_to_ts(python_file, output_dir):
    # Read Python file and extract mapping
    with open(python_file, 'r') as f:
        content = f.read()
        # Simple parsing - assumes form_mapping is a dict literal
        mapping_str = content.split('form_mapping = ')[1].strip()
        mapping = eval(mapping_str)
    
    # Convert to TypeScript
    ts_content = f"""
// Generated from {os.path.basename(python_file)}
export const form_mapping: Record<string, string> = {json.dumps(mapping, indent=2)}
"""
    
    # Write TypeScript file
    basename = os.path.splitext(os.path.basename(python_file))[0]
    ts_file = os.path.join(output_dir, f"{basename}.ts")
    with open(ts_file, 'w') as f:
        f.write(ts_content)

def convert_all_mappings():
    mapping_dir = 'mapping_files'
    output_dir = 'form_renderer/generated_mappings'
    os.makedirs(output_dir, exist_ok=True)
    
    for file in os.listdir(mapping_dir):
        if file.endswith('_mapping.py'):
            convert_mapping_to_ts(
                os.path.join(mapping_dir, file),
                output_dir
            )

if __name__ == '__main__':
    convert_all_mappings() 