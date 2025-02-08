export const normalizeTextPhrase = (text: string): string => {
  // First convert Title Case/Sentence case to lowercase
  const lowered = text.toLowerCase();
  
  // If it's already snake_case, return as is
  if (lowered.includes('_')) return lowered;
  
  // Otherwise convert spaces to underscores
  return lowered.replace(/\s+/g, '_').trim();
};

export const isPrevTravelPage = (formDef: any): boolean => {  // Check if form title or id indicate previous travel
  if (formDef?.title && formDef.title.includes('Previous Travel')) return true;
  if (formDef?.id && formDef.id.includes('previous_travel')) return true;
  // Check if any field name includes "PREV_"
  if (Array.isArray(formDef?.fields) && formDef.fields.some(field => field.name && field.name.includes('PREV_'))) return true;
  // Also check dependency keys
  if (formDef?.dependencies && Object.keys(formDef.dependencies).some(key => key.includes('PREV_'))) return true;
  return false;
}; 