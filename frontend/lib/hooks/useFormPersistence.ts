'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { saveFormData, loadFormData, FormDataUpdate } from '../actions/formData';
import debounce from 'lodash/debounce';

export function useFormPersistence() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [formState, setFormState] = useState<FormDataUpdate | null>(null);
  
  // Single debounced save function - 5 second delay
  const debouncedSave = useCallback(
    debounce((data: FormDataUpdate) => {
      if (!isSignedIn) return;
      
      // Clone the data to avoid undefined issues
      const safeData: FormDataUpdate = {};
      
      // Only include properties that are defined
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          safeData[key as keyof FormDataUpdate] = value;
        }
      });
      
      console.log('Saving data (debounced):', Object.keys(safeData));
      
      saveFormData(safeData)
        .then((result) => {
          if (result.success) {
            console.log('Successfully saved data to database');
          } else {
            console.error('Failed to save data:', result.error);
          }
        })
        .catch(error => {
          if (isSignedIn) {
            console.error('Error saving to database:', error);
          }
        });
    }, 5000),
    [isSignedIn]
  );
  
  // Load initial data from backend database
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        console.log('Loading form data from the database...');
        loadFormData()
          .then((data) => {
            if (data) {
              console.log('Loaded form data with keys:', Object.keys(data));
              setFormState(data);
            } else {
              console.log('No form data found in database');
            }
            setIsInitialized(true);
          })
          .catch(error => {
            console.error('Error loading form data:', error);
            setIsInitialized(true);
          });
      } else {
        setIsInitialized(true);
      }
    }
  }, [isLoaded, isSignedIn]);
  
  // Function 1: Save field with debounce (for regular updates)
  const saveFieldWithDebounce = useCallback((key: string, value: any) => {
    if (!isSignedIn) {
      console.log('Not saving - user is not authenticated');
      return;
    }

    // Normalize key (remove ds160_ prefix if present)
    const dbKey = key.replace('ds160_', '');
    
    // Determine which property to update based on key
    let updateData: FormDataUpdate;
    
    if (dbKey === 'yaml_data') {
      updateData = { yamlData: value };
    } else if (dbKey === 'form_fields' || dbKey === 'formFields') {
      updateData = { formFields: value };
    } else {
      // For other individual fields
      updateData = { [dbKey]: value };
    }
    
    console.log(`Scheduling save for ${dbKey} (debounced)`);
    debouncedSave(updateData);
  }, [debouncedSave, isSignedIn]);
  
  // Function 2: Save data immediately (for important saves)
  const saveDataImmediately = useCallback((data: FormDataUpdate) => {
    if (!isSignedIn) {
      console.log('Not saving - user is not authenticated');
      return Promise.resolve({ success: false, error: 'Not authenticated' });
    }

    console.log('Saving data immediately:', Object.keys(data));
    return saveFormData(data)
      .then(result => {
        if (result.success) {
          console.log('Successfully saved data to database');
        }
        return result;
      })
      .catch(error => {
        console.error('Error saving data to database:', error);
        return { success: false, error: String(error) };
      });
  }, [isSignedIn]);

  return {
    isInitialized,
    formState,
    saveFieldWithDebounce, // Use this for regular field updates (debounced)
    saveDataImmediately,   // Use this for explicit saves (no debounce)
    isSignedIn
  };
} 