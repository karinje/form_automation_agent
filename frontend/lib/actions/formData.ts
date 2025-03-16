'use server'

import { currentUser } from '@clerk/nextjs/server';
import { getDb } from '../db';
import { formData, formVersions } from '../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createId } from '@paralleldrive/cuid2';
import { auth } from '@clerk/nextjs';

export type FormDataUpdate = {
  yamlData?: any;
  formFields?: Record<string, string>;
  currentTab?: string;
  accordionValues?: Record<string, string>;
  retrieveMode?: 'new' | 'retrieve';
  location?: string;
  secretQuestion?: string;
  secretAnswer?: string;
  applicationId?: string;
  surname?: string;
  birthYear?: string;
};

// Save form data to database
export async function saveFormData(data: FormDataUpdate) {
  try {
    // Validate data before attempting to save
    if (!data) {
      console.error('No data provided to saveFormData');
      return { success: false, error: 'No data provided' };
    }

    // Get the current user
    const user = await currentUser();
    if (!user?.id) throw new Error('Not authenticated');
    const userId = user.id;
    
    // Clone and sanitize the data to avoid undefined/null issues
    const sanitizedData: FormDataUpdate = {};
    
    // Only include properties that are defined
    if (data.yamlData !== undefined) sanitizedData.yamlData = data.yamlData;
    if (data.formFields !== undefined) sanitizedData.formFields = data.formFields;
    if (data.currentTab !== undefined) sanitizedData.currentTab = data.currentTab;
    if (data.accordionValues !== undefined) sanitizedData.accordionValues = data.accordionValues;
    if (data.retrieveMode !== undefined) sanitizedData.retrieveMode = data.retrieveMode;
    if (data.location !== undefined) sanitizedData.location = data.location;
    if (data.secretQuestion !== undefined) sanitizedData.secretQuestion = data.secretQuestion;
    if (data.secretAnswer !== undefined) sanitizedData.secretAnswer = data.secretAnswer;
    if (data.applicationId !== undefined) sanitizedData.applicationId = data.applicationId;
    if (data.surname !== undefined) sanitizedData.surname = data.surname;
    if (data.birthYear !== undefined) sanitizedData.birthYear = data.birthYear;
    
    // Get the database connection
    const db = getDb();
    
    // Check if user already has a form data record
    const existingData = await db.select()
      .from(formData)
      .where(eq(formData.userId, userId))
      .limit(1);
    
    if (existingData.length > 0) {
      // Update existing record
      await db.update(formData)
        .set({
          ...sanitizedData,
          lastUpdated: new Date(),
        })
        .where(eq(formData.userId, userId));
    } else {
      // Create new record - explicitly set ID
      await db.insert(formData).values({
        id: createId(),
        userId,
        ...sanitizedData,
        lastUpdated: new Date(),
        createdAt: new Date(),
      });
    }

    revalidatePath('/app');
    return { success: true };
  } catch (error) {
    console.error('Error in saveFormData:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Load form data from database
export async function loadFormData() {
  const user = await currentUser();
  if (!user?.id) return null;
  const userId = user.id;
  
  const db = getDb();
  
  const data = await db.select()
    .from(formData)
    .where(eq(formData.userId, userId))
    .limit(1);
  
  return data[0] || null;
}

// Save a named version of the form data
export async function saveFormVersion(yamlData: any, versionName: string) {
  const user = await currentUser();
  if (!user?.id) throw new Error('Not authenticated');
  const userId = user.id;
  
  const db = getDb();
  
  await db.insert(formVersions).values({
    id: createId(),
    userId,
    yamlData,
    versionName,
    createdAt: new Date(),
  });
  
  return { success: true };
}

// Load all saved versions for the current user
export async function loadFormVersions() {
  const user = await currentUser();
  if (!user?.id) return [];
  const userId = user.id;
  
  const db = getDb();
  
  const versions = await db.select()
    .from(formVersions)
    .where(eq(formVersions.userId, userId))
    .orderBy(formVersions.createdAt);
  
  return versions;
}

// Add this function to save a successful application
export async function saveSuccessfulApplication(
  yamlData: any, 
  applicationId: string
) {
  try {
    const user = await currentUser();
    if (!user?.id) throw new Error('Not authenticated');
    const userId = user.id;
    
    const db = getDb();
    
    // First check if this application already exists for this user
    const existingApplication = await db
      .select()
      .from(formVersions)
      .where(eq(formVersions.userId, userId))
      .where(eq(formVersions.applicationId, applicationId))
      .limit(1);
    console.log('inside saveSuccessfulApplication existingApplication', existingApplication);
    console.log('inside saveSuccessfulApplication applicationId', applicationId);
    console.log('inside saveSuccessfulApplication userId', userId);
    if (existingApplication && existingApplication.length > 0) {
      // Application exists, update it
      console.log(`Updating existing application with ID: ${applicationId}`);
      
      await db
        .update(formVersions)
        .set({
          yamlData: yamlData,
          updatedAt: new Date()
        })
        .where(eq(formVersions.userId, userId))
        .where(eq(formVersions.applicationId, applicationId));
        
      return { success: true, message: "Application updated successfully" };
    } else {
      // Application doesn't exist, insert a new one
      console.log(`Creating new application with ID: ${applicationId}`);
      
      await db.insert(formVersions).values({
        id: createId(),
        userId,
        yamlData: yamlData,
        applicationId: applicationId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return { success: true, message: "Application saved successfully" };
    }
  } catch (error) {
    console.error("Error saving successful application:", error);
    throw error;
  }
}

// Add this function to load a specific application by ID
export async function loadApplicationById(applicationId: string) {
  try {
    const user = await currentUser();
    if (!user?.id) return null;
    const userId = user.id;
    
    const db = getDb();
    
    const application = await db.select()
      .from(formVersions)
      .where(eq(formVersions.userId, userId))
      .where(eq(formVersions.applicationId, applicationId))
      .limit(1);
    
    return application[0] || null;
  } catch (error) {
    console.error('Error loading application by ID:', error);
    return null;
  }
}

// Add this function to get all successful applications
export async function getSuccessfulApplications() {
  try {
    const user = await currentUser();
    if (!user?.id) return [];
    const userId = user.id;
    
    const db = getDb();
    
    const applications = await db.select({
      id: formVersions.id,
      applicationId: formVersions.applicationId,
      updatedAt: formVersions.updatedAt
    })
      .from(formVersions)
      .where(eq(formVersions.userId, userId))
      .where(sql`${formVersions.applicationId} IS NOT NULL`)
      .orderBy(desc(formVersions.updatedAt));
    
    return applications;
  } catch (error) {
    console.error('Error getting successful applications:', error);
    return [];
  }
} 