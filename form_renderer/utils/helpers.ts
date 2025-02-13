export interface FormDefinition {
  title: string;
  definition: any;
  pageName: string;
}

export interface FormCategories {
  [key: string]: FormDefinition[];
}

export const categoryOrder = ['personal', 'travel', 'education', 'security'];

export const getPageTitle = (formCategories: FormCategories, category: string, index: number): string => {
  try {
    const form = formCategories[category]?.[index];
    if (!form) {
      console.warn(`Form not found for category ${category} index ${index}`);
      return '';
    }
    return form.title;
  } catch (error) {
    console.error('Error getting page title:', error);
    return '';
  }
};

export const getNextForm = (
  formCategories: FormCategories,
  currentCategory: string,
  currentIndex: number
): { category: string; index: number } | null => {
  try {
    const categoryIndex = categoryOrder.indexOf(currentCategory);
    if (categoryIndex === -1) {
      console.warn(`Category ${currentCategory} not found in order`);
      return null;
    }

    const currentCategoryForms = formCategories[currentCategory];
    if (!currentCategoryForms) {
      console.warn(`No forms found for category ${currentCategory}`);
      return null;
    }

    // If not last form in current category
    if (currentIndex < currentCategoryForms.length - 1) {
      return { category: currentCategory, index: currentIndex + 1 };
    }

    // If last form in current category but not last category
    if (categoryIndex < categoryOrder.length - 1) {
      const nextCategory = categoryOrder[categoryIndex + 1];
      return { category: nextCategory, index: 0 };
    }

    return null;
  } catch (error) {
    console.error('Error getting next form:', error);
    return null;
  }
};

export const getPreviousForm = (
  formCategories: FormCategories,
  currentCategory: string,
  currentIndex: number
): { category: string; index: number } | null => {
  try {
    const categoryIndex = categoryOrder.indexOf(currentCategory);
    if (categoryIndex === -1) {
      console.warn(`Category ${currentCategory} not found in order`);
      return null;
    }

    // If not first form in current category
    if (currentIndex > 0) {
      return { category: currentCategory, index: currentIndex - 1 };
    }

    // If first form in current category but not first category
    if (categoryIndex > 0) {
      const prevCategory = categoryOrder[categoryIndex - 1];
      const prevCategoryForms = formCategories[prevCategory];
      if (!prevCategoryForms) {
        console.warn(`No forms found for category ${prevCategory}`);
        return null;
      }
      return { category: prevCategory, index: prevCategoryForms.length - 1 };
    }

    return null;
  } catch (error) {
    console.error('Error getting previous form:', error);
    return null;
  }
};

export const normalizeTextPhrase = (text: string): string => {
  if (!text) return '';
  const lowered = text.toLowerCase();
  if (lowered.includes('_')) return lowered;
  return lowered.replace(/\s+/g, '_').trim();
};

export const isPrevTravelPage = (formDef: any): boolean => {
  if (formDef?.title && formDef.title.includes('Previous Travel')) return true;
  if (formDef?.id && formDef.id.includes('previous_travel')) return true;
  if (Array.isArray(formDef?.fields) && formDef.fields.some(field => field.name && field.name.includes('PREV_'))) return true;
  if (formDef?.dependencies && Object.keys(formDef.dependencies).some(key => key.includes('PREV_'))) return true;
  return false;
}; 