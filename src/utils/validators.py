def validate_ssn(ssn_parts):
    """Validate SSN number format"""
    if not ssn_parts.get('na', False):
        num1 = ssn_parts.get('number1', '')
        num2 = ssn_parts.get('number2', '')
        num3 = ssn_parts.get('number3', '')
        
        if not (len(num1) == 3 and len(num2) == 2 and len(num3) == 4):
            raise ValueError("SSN must be in format: XXX-XX-XXXX")
        
        if not (num1.isdigit() and num2.isdigit() and num3.isdigit()):
            raise ValueError("SSN must contain only numbers") 