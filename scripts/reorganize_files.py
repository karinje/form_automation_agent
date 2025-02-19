import os
import shutil
from pathlib import Path

def create_directory_structure():
    """Create the new directory structure"""
    directories = [
        "backend/src/automation",
        "backend/src/api/routes",
        "backend/src/mappings/page_mappings",
        "backend/src/utils",
        "backend/src/config",
        "backend/tests",
        "shared/form_definitions",
        "backend/src/templates/yaml_files"  # YAML templates for OpenAI/LinkedIn
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)

def move_mapping_files():
    """Move mapping files from mapping_files/ to backend/src/mappings/page_mappings/"""
    source_dir = Path("mapping_files")
    target_dir = Path("backend/src/mappings/page_mappings")
    
    if not source_dir.exists():
        print(f"Source directory {source_dir} not found")
        return
        
    # Move all .py files
    for file in source_dir.glob("*.py"):
        target_file = target_dir / file.name
        shutil.move(str(file), str(target_file))
        print(f"Moved {file.name} to {target_dir}")
    
    # Remove empty mapping_files directory
    if source_dir.exists() and not any(source_dir.iterdir()):
        source_dir.rmdir()
        print(f"Removed empty directory: {source_dir}")

def move_core_files():
    """Move core files to their new locations"""
    moves = [
        ("src/utils/browser.py", "backend/src/automation/browser.py"),
        ("src/utils/form_handler.py", "backend/src/automation/form_handler.py"),
        ("src/utils/form_mapping.py", "backend/src/mappings/form_mapping.py"),
        ("src/utils/validators.py", "backend/src/utils/validators.py"),
        ("src/utils/openai_handler.py", "backend/src/utils/openai_handler.py"),
        ("src/config/config.py", "backend/src/config/settings.py"),  # Move and rename config.py
        ("main.py", "backend/main.py")
    ]
    
    for source, dest in moves:
        source_path = Path(source)
        dest_path = Path(dest)
        
        if source_path.exists():
            os.makedirs(str(dest_path.parent), exist_ok=True)
            shutil.move(str(source_path), str(dest_path))
            print(f"Moved {source} to {dest}")

def move_form_definitions():
    """Move form definitions to shared location"""
    source_dir = Path("frontend/form_definitions")
    target_dir = Path("shared/form_definitions")
    
    if not source_dir.exists():
        print(f"Source directory {source_dir} not found")
        return
        
    # Create target directory if it doesn't exist
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Move all .json files
    for file in source_dir.glob("*.json"):
        target_file = target_dir / file.name
        shutil.move(str(file), str(target_file))
        print(f"Moved {file.name} to {target_dir}")
    
    # Remove the old directory
    if source_dir.exists():
        shutil.rmtree(source_dir)
        print(f"Removed old directory: {source_dir}")

def move_yaml_templates():
    """Move YAML templates to backend templates location"""
    source_dir = Path("yaml_files")
    target_dir = Path("backend/src/templates/yaml")
    
    if not source_dir.exists():
        print(f"Source directory {source_dir} not found")
        return
        
    # Create target directory if it doesn't exist
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Move all .yaml files
    for file in source_dir.glob("*.yaml"):
        target_file = target_dir / file.name
        shutil.move(str(file), str(target_file))
        print(f"Moved {file.name} to {target_dir}")
    
    # Remove the old directory
    if source_dir.exists():
        shutil.rmtree(source_dir)
        print(f"Removed old directory: {source_dir}")

def rename_form_renderer():
    """Rename form_renderer directory to frontend"""
    if Path("form_renderer").exists():
        shutil.move("form_renderer", "frontend")
        print("Renamed form_renderer to frontend")

def cleanup_empty_dirs():
    """Remove empty source directories"""
    dirs_to_check = [
        "src/utils",
        "src/config",
        "src"
    ]
    
    for dir_path in dirs_to_check:
        dir_path = Path(dir_path)
        if dir_path.exists() and not any(dir_path.iterdir()):
            dir_path.rmdir()
            print(f"Removed empty directory: {dir_path}")

def main():
    print("Starting file reorganization...")
    create_directory_structure()
    move_mapping_files()
    move_core_files()
    move_form_definitions()
    move_yaml_templates()
    rename_form_renderer()
    cleanup_empty_dirs()
    print("File reorganization complete")

if __name__ == "__main__":
    main()
