interface DateFieldGroup {
  basePhrase: string;  // e.g. "Date" or "Spouse's Date of Birth"
  dayField: FormFieldType;
  monthField: FormFieldType;
  yearField: FormFieldType;
}

const detectDateFields = (fields: FormFieldType[]): DateFieldGroup[] => {
  const groups: DateFieldGroup[] = [];
  const dateRegex = /^(.*?)\s*-\s*(Day|Month|Year)$/i;
  
  // Group fields by their base phrase
  const fieldsByBase = fields.reduce((acc, field) => {
    const match = field.text_phrase.match(dateRegex);
    if (match) {
      const [_, basePhrase, type] = match;
      if (!acc[basePhrase]) acc[basePhrase] = {};
      acc[basePhrase][type.toLowerCase()] = field;
    }
    return acc;
  }, {} as Record<string, Partial<DateFieldGroup>>);

  // Create groups where we have all three components
  Object.entries(fieldsByBase).forEach(([basePhrase, components]) => {
    if (components.day && components.month && components.year) {
      groups.push({
        basePhrase,
        dayField: components.day,
        monthField: components.month,
        yearField: components.year
      });
    }
  });

  return groups;
} 