import React, { useEffect, useRef } from 'react';

// Use a ref to store a JSON string of arrayGroups for deep equality comparison
const prevArrayGroupsJSON = useRef(JSON.stringify(arrayGroups || {}));

useEffect(() => {
  if (!arrayGroups) return;

  const currentArrayGroupsJSON = JSON.stringify(arrayGroups);
  if (currentArrayGroupsJSON !== prevArrayGroupsJSON.current) {
    debugLog('previous_travel_page', 'arrayGroups changed', arrayGroups);
    prevArrayGroupsJSON.current = currentArrayGroupsJSON;
  }
  
  // ... rest of effect code that runs on arrayGroups or visibleFields change
}, [arrayGroups, visibleFields]); 