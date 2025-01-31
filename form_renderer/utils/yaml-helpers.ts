// Helper to flatten nested YAML objects into dot notation
export const flattenYamlData = (obj: any, prefix = ''): Record<string, string> => {
  const flattened: Record<string, string> = {}
  
  for (const key in obj) {
    const value = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenYamlData(value, newKey))
    } else {
      flattened[newKey] = String(value) // Convert all values to string
    }
  }
  
  return flattened
}

// Helper to convert flattened form data back to nested YAML structure
export const unflattenFormData = (data: Record<string, string>): Record<string, any> => {
  const result: Record<string, any> = {}
  
  for (const key in data) {
    const parts = key.split('.')
    let current = result
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      current[part] = current[part] || {}
      current = current[part]
    }
    
    current[parts[parts.length - 1]] = data[key]
  }
  
  return result
} 