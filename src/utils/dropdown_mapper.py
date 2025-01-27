import json
from pathlib import Path

class TravelDropdownMapper:
    def __init__(self):
        mapping_file = Path('json_files/travel_dropdown_mapping.json')
        if not mapping_file.exists():
            raise FileNotFoundError("Travel dropdown mapping file not found")
            
        with open(mapping_file, 'r', encoding='utf-8') as f:
            self.mapping = json.load(f)
    
    def get_second_dropdown_options(self, first_dropdown_value):
        """Get available options for second dropdown based on first dropdown selection"""
        if first_dropdown_value in self.mapping:
            return self.mapping[first_dropdown_value]['second_dropdown_options']
        return None
    
    def validate_combination(self, first_value, second_value):
        """Validate if a combination of first and second dropdown values is valid"""
        if first_value not in self.mapping:
            return False
            
        second_options = self.mapping[first_value]['second_dropdown_options']
        if not second_options:
            return False
            
        return any(opt['value'] == second_value for opt in second_options) 