// Mission dialogue mapping - maps audio files to their full dialogue text
const missionDialogue = {
  // Audio file name -> Full dialogue text
  '1.mp3': 'Dispatch: Be advised, potential possession of high caliber firearms in settlement-37. Requesting BG check in the perimeter, over.',
  '4.mp3': 'Razor: Understood.',
  '5.mp3': 'Dispatch: 10-4 on the 10-20, Location is between housing block 9 through housing block 18 on a 3 by 3 grid.',
  '8.mp3': 'Phantom 4: Affirmative Autarch is in service, want to be transferred?',
  '15.mp3': '24 Gamma 1-5: 2 gamma 1, are we authorized yet? Dispatch is getting impatient.',
  '17.mp3': '24 Gamma 1-5: Alright Scanning.',
  'failed.mp3': '[SCAN FAILED - NO RESULTS]',
  '18.mp3': '24 Gamma 1-5: I scanned the grid and nothing!',
  '19.mp3': '24 Gamma 2-4 and 24 Gamma 5-1: That cant be correct.',
  '21.mp3': 'Razor: Yes T.O.D Captain, What is it?',
  '23.mp3': 'Razor: That will take up 68% the CPU load and 37% of the GPU Load, Are you okay with that?',
  '25.mp3': 'Razor: 10-4 T.O.D Captain, I am scanning now.',
  '27.mp3': '24 Gamma 5-1: First scan failed. The Captain is scanning with the AI.',
  '28.mp3': 'Dispatch: We need our directives!',
  'success.mp3': '[SCAN SUCCESSFUL - TARGETS FOUND]',
  '29.mp3': 'Razor: 2 firearms detected in block 21, What are your directives, sir?',
  '31.mp3': 'Razor: House holder name is William Morse Age 32. Anything else?',
  '33.mp3': 'Razor: William Morse has been arrested for 2 counts of murder and was released from San Quentin State Prison on a 750,000 dollar bond in 2027, Anything else?',
  '35.mp3': 'Razor: Affirmative.',
  'lockdown.mp3': '[LOCKDOWN PROTOCOL ACTIVATED]',
  'announcement.mp3': '[SETTLEMENT 37 LOCKDOWN ANNOUNCEMENT]',
'38.mp3': 'OFFICER-107: 24-alpha 1-1 sending live feed. Date: August 21st, 2030. Directive: raid and apprehension of subject, William Morse. Status: resident. Recording position: rooftop 49. View: southwest to settlement 37 block 21 house 5. Address: 409 East Beginnings st. Units involved: 2407, 2404, 2405. Light exposure 37%. sounds on. Visual augmentation set to capture interface and agent position markers. Ground unit feed is also available. Mission directive may now be executed, standby for audible changes to directive as situation evolves, over.',
  'riot.mp3': '[TACTICAL ASSAULT IN PROGRESS]',
  '40.mp3': 'OFFICER-107: 10-4, 10-27, multiple agents from multiple units are down, subject is 10-28. Requesting CASEVAC, over.',
  'Black.mp3': '[VISUAL FEED TERMINATED]',
  'open.mp3': '[ACCESSING TACTICAL INFORMATION SYSTEM]'
};

// Voice command fuzzy matching - maps partial input to full expected lines
const voiceCommandMapping = {
  // Partial command -> Full expected line
  // Step 2: BG check request (multiple variations for better recognition)
  '10-4': '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?',
  'performing bg check': '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?',
  'bg check': '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?',
  'acknowledgement': '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?',
  'autarch': '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?',
  'contraband': '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?',
  
  // Step 3: Razor Subtitles (multiple variations)
  'razor subtitles': 'Razor, Subtitles.',
  'razor, subtitles': 'Razor, Subtitles.',
  'subtitles': 'Razor, Subtitles.',
  'razor': 'Razor, Subtitles.',
  
  // Step 6: Thanks dispatch (multiple variations for better recognition)
  'thanks dispatch': 'Thanks for the details dispatch. Acknowledging now.',
  'thanks for the details': 'Thanks for the details dispatch. Acknowledging now.',
  'thanks for details': 'Thanks for the details dispatch. Acknowledging now.',
  'thank you dispatch': 'Thanks for the details dispatch. Acknowledging now.',
  'acknowledging now': 'Thanks for the details dispatch. Acknowledging now.',
  'details dispatch': 'Thanks for the details dispatch. Acknowledging now.',
  
  // Step 7: Phantom 4 (multiple variations)
  'phantom 4': 'Phantom 4, Autarch 10-8 yet?',
  'phantom four': 'Phantom 4, Autarch 10-8 yet?',
  'autarch 10-8': 'Phantom 4, Autarch 10-8 yet?',
  'autarch 10 8': 'Phantom 4, Autarch 10-8 yet?',
  '10-8': 'Phantom 4, Autarch 10-8 yet?',
  'yet': 'Phantom 4, Autarch 10-8 yet?',
  
  // Step 8: Yes (simple but critical)
  'yes': 'Yes.',
  'yeah': 'Yes.',
  'affirmative': 'Yes.',
  'yep': 'Yes.',
  
  // Step 9: 2 alpha 1-1
  '2 alpha 1-1': '2 alpha 1-1?',
  '2 alpha 11': '2 alpha 1-1?',
  'alpha 1-1': '2 alpha 1-1?',
  'alpha 11': '2 alpha 1-1?',
'two alpha': '2 alpha 1-1?',
  'two alpha one one': '2 alpha 1-1?',
  '2 alpha one one': '2 alpha 1-1?',
  'two alpha 1 1': '2 alpha 1-1?',
  
  // Step 10: Ryan's response - Enhanced recognition
  '1-1 go ahead': '1-1, go ahead.',
  '11 go ahead': '1-1, go ahead.',
  'go ahead': '1-1, go ahead.',
  'one one go ahead': '1-1, go ahead.',
  'one-one go ahead': '1-1, go ahead.',
  'one one': '1-1, go ahead.',
  '1-1': '1-1, go ahead.',
  '11': '1-1, go ahead.',
  'one-one': '1-1, go ahead.',
  'eleven go ahead': '1-1, go ahead.',
  'eleven': '1-1, go ahead.',
  '1 1 go ahead': '1-1, go ahead.',
  '1 1': '1-1, go ahead.',
  'ryan': '1-1, go ahead.',
  'response': '1-1, go ahead.',
  'ahead': '1-1, go ahead.',
  
  // Step 12: Bryon's contraband activity report (multiple variations)
  'sir there has been activity': 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?',
  'illegal contraband': 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?',
  'heavy firearms': 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?',
  'clearance to scan': 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?',
  'housing 9 through 18': 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?',
  'scan the grid': 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?',
  
  // Step 13: Ryan's acknowledgement (multiple variations)
  'roger command acknowledges': 'Roger, command acknowledges possible arms deal within settlement 37 boundaries,',
  'roger command': 'Roger, command acknowledges possible arms deal within settlement 37 boundaries,',
  'command acknowledges': 'Roger, command acknowledges possible arms deal within settlement 37 boundaries,',
  'arms deal': 'Roger, command acknowledges possible arms deal within settlement 37 boundaries,',
  'settlement 37 boundaries': 'Roger, command acknowledges possible arms deal within settlement 37 boundaries,',
  
  // Step 14: Bryon authorization (multiple variations)
  'yes authorized': 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.',
  'start the cctv': 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.',
  'authorized': 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.',
  'cctv scan': 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.',
  '9 through 13': 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.',
  '3 by 3 grid': 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.',
  
  // Additional lines for later mission steps
  'let me try razor': 'Let me try, Razor',
  'let me try': 'Let me try, Razor',
  'scan the entirety': 'Scan the entirety of settlement 37.',
  'scan settlement 37': 'Scan the entirety of settlement 37.',
  'entirety': 'Scan the entirety of settlement 37.',
  'settlement 37': 'Scan the entirety of settlement 37.',
  'i\'m aware of the cost': 'I\'m aware of the cost.',
'im aware': 'I\'m aware of the cost.',
  'i am aware of the cost': 'I\'m aware of the cost.',
  'aware of cost': 'I\'m aware of the cost.',
  'status on perimeter': 'Status on perimeter scan?',
  'status on perimeter scan': 'Status on perimeter scan?',
  'perimeter scan': 'Status on perimeter scan?',
  'what is the current householder': 'What is the current householder name?',
  'householder name': 'What is the current householder name?',
  'current householder': 'What is the current householder name?',
  'run a bg check': 'Run a BG check on William Morse.',
  'bg check william morse': 'Run a BG check on William Morse.',
  'william morse': 'Run a BG check on William Morse.',
  'razor put settlement': 'Razor, put settlement 37 on lockdown.',
  'put settlement on lockdown': 'Razor, put settlement 37 on lockdown.',
  'lockdown': 'Razor, put settlement 37 on lockdown.',
  'autarch waiting': 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
  'send a team out': 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
  'waiting for directives': 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
  'remington 887': 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
  'hk417': 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
  'remington 886': 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
  'm4a1': 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
  '10-4 just as confused': '10-4, just as confused as you are, task forces epsilon 12, and eta 9 of the 24th regiment is en-route to settlement 37. We\'ll also send in delta 4 to keep the operation smooth and within guidelines. Officer 107 will be leading the effort on the rooftops. All responding law enforcement units hold for reinforcement. Directive: 185-164-172-176-166. Codes 225, 307, 308, over.',
  'task forces': '10-4, just as confused as you are, task forces epsilon 12, and eta 9 of the 24th regiment is en-route to settlement 37. We\'ll also send in delta 4 to keep the operation smooth and within guidelines. Officer 107 will be leading the effort on the rooftops. All responding law enforcement units hold for reinforcement. Directive: 185-164-172-176-166. Codes 225, 307, 308, over.',
  'epsilon 12': '10-4, just as confused as you are, task forces epsilon 12, and eta 9 of the 24th regiment is en-route to settlement 37. We\'ll also send in delta 4 to keep the operation smooth and within guidelines. Officer 107 will be leading the effort on the rooftops. All responding law enforcement units hold for reinforcement. Directive: 185-164-172-176-166. Codes 225, 307, 308, over.',
  '24th regiment': '10-4, just as confused as you are, task forces epsilon 12, and eta 9 of the 24th regiment is en-route to settlement 37. We\'ll also send in delta 4 to keep the operation smooth and within guidelines. Officer 107 will be leading the effort on the rooftops. All responding law enforcement units hold for reinforcement. Directive: 185-164-172-176-166. Codes 225, 307, 308, over.',
  'officer 107': '10-4, just as confused as you are, task forces epsilon 12, and eta 9 of the 24th regiment is en-route to settlement 37. We\'ll also send in delta 4 to keep the operation smooth and within guidelines. Officer 107 will be leading the effort on the rooftops. All responding law enforcement units hold for reinforcement. Directive: 185-164-172-176-166. Codes 225, 307, 308, over.',
  '107 what the hell': '107, what the hell is going on over there, report!',
  'what the hell': '107, what the hell is going on over there, report!',
  'report': '107, what the hell is going on over there, report!',
  
  // Final confirmation line ("10-4.") with common variants
  'ten four': '10-4.',
  'ten-4': '10-4.',
  '10 4': '10-4.',
  '10 four': '10-4.',
  'ten for': '10-4.'
};

// Function to match voice input to expected full line - ONLY matches current expected line
function matchVoiceCommand(input, expectedLine = null) {
  const inputLower = input.toLowerCase().trim();
  
  // If no expected line provided, fall back to any line matching (for backwards compatibility)
  if (!expectedLine) {
    return matchAnyVoiceCommand(inputLower);
  }
  
  // ONLY match against the current expected line
  const expectedLower = expectedLine.toLowerCase();
  
  // First, find the mapping entry that produces this expected line
  let matchingPartials = [];
  for (const [partial, fullLine] of Object.entries(voiceCommandMapping)) {
    if (fullLine.toLowerCase() === expectedLower) {
      matchingPartials.push(partial.toLowerCase());
    }
  }
  
  // If no mapping found, try direct matching against the expected line
  if (matchingPartials.length === 0) {
    const directSimilarity = calculateSimilarity(inputLower, expectedLower);
    if (directSimilarity >= 60) { // Higher threshold for direct matching
      console.log(`[VOICE MATCH] Direct expected line match (${directSimilarity}%): "${input}" -> "${expectedLine}"`);
      return expectedLine;
    }
    return null;
  }
  
  // Check input against all valid partials for this expected line
  for (const partialLower of matchingPartials) {
    // Check for direct substring match
    if (inputLower.includes(partialLower) || partialLower.includes(inputLower)) {
      console.log(`[VOICE MATCH] Expected line direct match: "${partialLower}" -> "${expectedLine}"`);
      return expectedLine;
    }
    
    // Check word-level similarity with higher threshold
    const similarity = calculateSimilarity(inputLower, partialLower);
    if (similarity >= 50) { // Higher threshold for expected line matching
      console.log(`[VOICE MATCH] Expected line similarity match (${similarity}%): "${partialLower}" -> "${expectedLine}"`);
      return expectedLine;
    }
    
    // Check for keyword matches specific to this expected line
    if (hasKeywordMatch(inputLower, partialLower)) {
      console.log(`[VOICE MATCH] Expected line keyword match: "${partialLower}" -> "${expectedLine}"`);
      return expectedLine;
    }
  }
  
  return null;
}

// Fallback function for any line matching (used when no expected line provided)
function matchAnyVoiceCommand(inputLower) {
  for (const [partial, fullLine] of Object.entries(voiceCommandMapping)) {
    const partialLower = partial.toLowerCase();
    
    // Check for direct substring match
    if (inputLower.includes(partialLower)) {
      console.log(`[VOICE MATCH] Fallback direct match: "${partial}" -> "${fullLine}"`);
      return fullLine;
    }
    
    // Check word-level similarity
    const similarity = calculateSimilarity(inputLower, partialLower);
    if (similarity >= 40) {
      console.log(`[VOICE MATCH] Fallback similarity match (${similarity}%): "${partial}" -> "${fullLine}"`);
      return fullLine;
    }
    
    // Check if any significant words from the partial match are found
    if (hasKeywordMatch(inputLower, partialLower)) {
      console.log(`[VOICE MATCH] Fallback keyword match: "${partial}" -> "${fullLine}"`);
      return fullLine;
    }
  }
  return null;
}

// Helper function to check for keyword matches
function hasKeywordMatch(input, partial) {
  const inputWords = input.split(/\s+/);
  const partialWords = partial.split(/\s+/);
  
  // Look for important keywords that should trigger recognition
  const keywords = ['10-4', 'razor', 'subtitles', 'phantom', 'autarch', 'yes', 'roger', 'scan', 'settlement', 'lockdown', 'bryon', 'ryan', 'thanks', 'dispatch', 'authorized', 'clearance', 'cctv', 'entirety', 'status', 'perimeter', 'householder', 'william', 'morse', 'directives', '1-1', '11', 'one', 'ahead', 'go', 'eleven'];
  
  for (const keyword of keywords) {
    if (partial.includes(keyword) && input.includes(keyword)) {
      return true;
    }
  }
  
  // Check if at least 1 significant word (3+ chars) matches (lowered from 2 for better recognition)
  let matchCount = 0;
  for (const inputWord of inputWords) {
    if (inputWord.length >= 2) { // Lowered from 3 to 2 chars
      for (const partialWord of partialWords) {
        if (partialWord.length >= 2 && ( // Lowered from 3 to 2 chars
          inputWord === partialWord || 
          inputWord.includes(partialWord) || 
          partialWord.includes(inputWord)
        )) {
          matchCount++;
          break;
        }
      }
    }
  }
  
  return matchCount >= 1; // Lowered from 2 to 1 for better recognition
}

// Simple similarity calculation
function calculateSimilarity(str1, str2) {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  
  let matches = 0;
  const totalWords = Math.max(words1.length, words2.length);
  
  words1.forEach(word1 => {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matches++;
    }
  });
  
  return Math.round((matches / totalWords) * 100);
}

module.exports = { missionDialogue, voiceCommandMapping, matchVoiceCommand };