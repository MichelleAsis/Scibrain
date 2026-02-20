// backend/services/ollamaService.js - COMPLETE IMPROVED VERSION
// Fixes: JSON parsing errors, token limits, auto-repair for truncated responses

const AI_PROVIDER = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Helper function to call Ollama
async function callOllama(prompt, options = {}) {
    if (AI_PROVIDER === 'openai') {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
        }

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                temperature: options.temperature || 0.7,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI-compatible API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('No content returned from OpenAI-compatible API');
        }
        return content;
    }

    const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            options: {
                temperature: options.temperature || 0.7,
                top_p: 0.9,
                num_predict: options.num_predict || 4096,
                ...options
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
}

// IMPROVED JSON parser with auto-repair and better error handling
function parseAIResponse(text, context = 'response') {
    try {
        console.log(`📥 Raw AI ${context} length:`, text.length);
        
        let cleaned = text.trim();
        
        // Remove markdown code blocks
        cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        
        // Find JSON boundaries more accurately
        const arrayStart = cleaned.indexOf('[');
        const objectStart = cleaned.indexOf('{');
        
        let jsonStart = -1;
        if (arrayStart !== -1 && objectStart !== -1) {
            jsonStart = Math.min(arrayStart, objectStart);
        } else if (arrayStart !== -1) {
            jsonStart = arrayStart;
        } else if (objectStart !== -1) {
            jsonStart = objectStart;
        }
        
        if (jsonStart === -1) {
            throw new Error('No JSON structure found in response');
        }
        
        // Find the matching closing bracket
        let jsonEnd = -1;
        if (cleaned[jsonStart] === '[') {
            jsonEnd = cleaned.lastIndexOf(']');
            
            // AUTO-REPAIR: If no closing bracket found, add it
            if (jsonEnd === -1 || jsonEnd <= jsonStart) {
                console.warn('⚠️ No closing ] found, attempting to add it...');
                cleaned = cleaned + '\n]';
                jsonEnd = cleaned.lastIndexOf(']');
            }
        } else {
            jsonEnd = cleaned.lastIndexOf('}');
            
            // AUTO-REPAIR: If no closing brace found, add it
            if (jsonEnd === -1 || jsonEnd <= jsonStart) {
                console.warn('⚠️ No closing } found, attempting to add it...');
                cleaned = cleaned + '\n}';
                jsonEnd = cleaned.lastIndexOf('}');
            }
        }
        
        if (jsonEnd === -1 || jsonEnd <= jsonStart) {
            throw new Error('No valid JSON end found even after repair attempt');
        }
        
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        
        // Fix common JSON issues
        cleaned = cleaned
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/"\s*:\s*"([^"]*?)"/g, (match, content) => match);
        
        // AUTO-REPAIR: Try to fix incomplete last object
        if (cleaned.includes('{') && !cleaned.trim().endsWith('}]') && !cleaned.trim().endsWith('}')) {
            const lastObjectStart = cleaned.lastIndexOf('{');
            const lastObjectEnd = cleaned.indexOf('}', lastObjectStart);
            
            if (lastObjectEnd === -1) {
                console.warn('⚠️ Incomplete last object detected, truncating...');
                cleaned = cleaned.substring(0, lastObjectStart);
                if (!cleaned.trim().endsWith(']')) {
                    cleaned = cleaned + '\n]';
                }
            }
        }
        
        const parsed = JSON.parse(cleaned);
        console.log(`✅ Successfully parsed ${context} JSON - ${Array.isArray(parsed) ? parsed.length : 'object'} items`);
        return parsed;
        
    } catch (error) {
        console.error(`❌ Failed to parse AI ${context}:`, error.message);
        console.error('Problematic text (first 1000 chars):', text.substring(0, 1000));
        throw new Error(`Invalid JSON in ${context}: ${error.message}`);
    }
}

// ============================================
// PHASE 1: Generate Reviewer ONLY (Fast)
// ============================================
async function generateReviewer(text, title) {
    console.log('🤖 Phase 1: Generating REVIEWER ONLY (fast load)...');

    let sections = [];
    let concepts = [];

    // Generate sections
    try {
        console.log('Step 1/2: Analyzing content structure...');
        const sectionsPrompt = `You are a science education expert. Analyze this scientific text and break it into 4-6 logical sections.

For EACH section, provide detailed content using these markers:
- Use "BULLET " for bullet points
- Use "NUM1. ", "NUM2. " for numbered lists
- Use "ARROW " for key highlights

TEXT TO ANALYZE:
${text.substring(0, 10000)}

RESPOND WITH ONLY THIS JSON (no additional text before or after):
[
  {
    "title": "Introduction to the Topic",
    "level": 1,
    "content": [
      "Opening paragraph explaining the topic in 2-3 sentences.",
      "BULLET First important key point",
      "BULLET Second important key point",
      "",
      "Additional explanation paragraph."
    ]
  }
]

CRITICAL: Start your response with [ and end with ]. No other text. Each section must have DIFFERENT content. Include 4-8 items per section.`;

        const sectionsResponse = await callOllama(sectionsPrompt, { temperature: 0.4, num_predict: 4096 });
        sections = parseAIResponse(sectionsResponse, 'sections');
        
        sections = sections.map(section => ({
            ...section,
            content: section.content.map(line => {
                if (typeof line !== 'string') return line;
                return line
                    .replace(/^BULLET\s+/i, '• ')
                    .replace(/^NUM(\d+)\.\s+/i, '$1. ')
                    .replace(/^ARROW\s+/i, '> ');
            })
        }));
        
        console.log(`✅ Generated ${sections.length} sections`);
    } catch (error) {
        console.error('⚠️ Section generation failed:', error.message);
        sections = [{ title: "Overview", level: 1, content: [text.substring(0, 500)] }];
    }

    // Extract concepts
    try {
        console.log('Step 2/2: Extracting key concepts...');
        const conceptsPrompt = `Extract 15-20 unique scientific concepts from this text.

TEXT:
${text.substring(0, 8000)}

RESPOND WITH ONLY THIS JSON (no additional text before or after):
[
  {
    "term": "Cell Membrane",
    "definition": "A selectively permeable barrier that surrounds the cell."
  },
  {
    "term": "Mitochondria",
    "definition": "The powerhouse of the cell that produces ATP."
  }
]

CRITICAL: Start with [ and end with ]. No text before or after. Each concept must be DIFFERENT. Clear definitions.`;

        const conceptsResponse = await callOllama(conceptsPrompt, { temperature: 0.3, num_predict: 4096 });
        concepts = parseAIResponse(conceptsResponse, 'concepts');
        
        const seenTerms = new Set();
        concepts = concepts.filter(c => {
            const termLower = c.term.toLowerCase();
            if (seenTerms.has(termLower)) return false;
            seenTerms.add(termLower);
            return true;
        });
        
        console.log(`✅ Extracted ${concepts.length} unique concepts`);
    } catch (error) {
        console.error('⚠️ Concept extraction failed:', error.message);
        concepts = extractBasicConcepts(text);
    }

    const reviewerData = {
        title,
        sections: sections.map(section => ({
            title: section.title,
            level: section.level || 1,
            content: section.content,
            summary: section.content[0] || '',
            rawContent: section.content.join(' ')
        })),
        concepts: concepts.map((c, i) => ({
            term: c.term,
            definition: c.definition,
            confidence: 0.95 - (i * 0.02),
            type: 'ai-extracted',
            occurrences: Math.floor(Math.random() * 5) + 2
        })),
        metadata: {
            wordCount: text.split(/\s+/).length,
            sentenceCount: text.split(/[.!?]+/).length,
            paragraphCount: text.split(/\n\n+/).length,
            estimatedReadTime: Math.ceil(text.split(/\s+/).length / 200),
            generatedAt: new Date().toISOString(),
            processingVersion: '7.0-improved-json-parsing'
        },
        originalText: text
    };

    console.log('✅ Phase 1 Complete! Reviewer ready.');
    return reviewerData;
}

// ============================================
// PHASE 2: Generate Quiz Questions (QUEUED)
// Each quiz type generated sequentially
// ============================================
async function generateQuizQuestions(text, concepts) {
    console.log('🎮 Phase 2: Generating QUIZ QUESTIONS (QUEUED - one at a time)...');

    const allQuestions = {
        trueFalse: { easy: [], medium: [], hard: [] },
        multipleChoice: { easy: [], medium: [], hard: [] },
        identification: { easy: [], medium: [], hard: [] },
        matching: { easy: [], medium: [], hard: [] }
    };

    // ========================================
    // STEP 1: TRUE/FALSE Questions (3 difficulties)
    // ========================================
    console.log('📝 Step 1/4: Generating True/False questions...');
    try {
        // EASY
        const tfEasyPrompt = `Create EXACTLY 15 true/false questions about this scientific text. Make them straightforward and obvious.

TEXT: ${text.substring(0, 5000)}

RESPOND WITH ONLY THIS JSON (no text before or after):
[
  {"question": "The cell membrane is selectively permeable", "answer": true, "explanation": "Correct. The cell membrane allows certain substances to pass while blocking others."},
  {"question": "Mitochondria are found in plant cells only", "answer": false, "explanation": "False. Mitochondria are found in both plant and animal cells."}
]

CRITICAL RULES:
- Start with [ and end with ]
- Exactly 15 questions
- "answer" must be true or false (boolean, not string)
- No commas after the last item
- Double-check your JSON syntax`;
        
        const tfEasy = await callOllama(tfEasyPrompt, { temperature: 0.3, num_predict: 4096 });
        const parsedEasy = parseAIResponse(tfEasy, 'tf-easy');
        allQuestions.trueFalse.easy = Array.isArray(parsedEasy) ? parsedEasy.slice(0, 15) : [];

        // MEDIUM
        const tfMediumPrompt = `Create EXACTLY 12 true/false questions about this scientific text. Require some thought and understanding.

TEXT: ${text.substring(0, 5000)}

RESPOND WITH ONLY THIS JSON (no text before or after):
[
  {"question": "Question text here", "answer": true, "explanation": "Explanation here"},
  {"question": "Question text here", "answer": false, "explanation": "Explanation here"}
]

CRITICAL RULES:
- Start with [ and end with ]
- Exactly 12 questions
- "answer" must be true or false (boolean)
- Make questions require deeper understanding
- No commas after last items`;
        
        const tfMedium = await callOllama(tfMediumPrompt, { temperature: 0.4, num_predict: 4096 });
        const parsedMedium = parseAIResponse(tfMedium, 'tf-medium');
        allQuestions.trueFalse.medium = Array.isArray(parsedMedium) ? parsedMedium.slice(0, 12) : [];

        // HARD - IMPROVED: Shorter prompt to avoid truncation
        const tfHardPrompt = `Create EXACTLY 10 challenging true/false questions.

TEXT: ${text.substring(0, 4000)}

JSON format (MUST end with ]):
[
  {"question": "Tricky question", "answer": false, "explanation": "Why it's false"},
  {"question": "Tricky question", "answer": true, "explanation": "Why it's true"}
]

CRITICAL: Boolean answer (true/false), no trailing commas, END WITH ]`;
        
        const tfHard = await callOllama(tfHardPrompt, { temperature: 0.4, num_predict: 4096 });
        const parsedHard = parseAIResponse(tfHard, 'tf-hard');
        allQuestions.trueFalse.hard = Array.isArray(parsedHard) ? parsedHard.slice(0, 10) : [];

        console.log(`✅ T/F Complete: Easy=${allQuestions.trueFalse.easy.length}, Medium=${allQuestions.trueFalse.medium.length}, Hard=${allQuestions.trueFalse.hard.length}`);
        
        // Ensure minimum questions with fallback
        if (allQuestions.trueFalse.easy.length < 5) {
            allQuestions.trueFalse.easy = [...allQuestions.trueFalse.easy, ...generateFallbackTF(concepts).easy].slice(0, 15);
        }
        if (allQuestions.trueFalse.medium.length < 5) {
            allQuestions.trueFalse.medium = [...allQuestions.trueFalse.medium, ...generateFallbackTF(concepts).medium].slice(0, 12);
        }
        if (allQuestions.trueFalse.hard.length < 5) {
            allQuestions.trueFalse.hard = [...allQuestions.trueFalse.hard, ...generateFallbackTF(concepts).hard].slice(0, 10);
        }
        
    } catch (error) {
        console.error('⚠️ T/F generation failed:', error.message);
        allQuestions.trueFalse = generateFallbackTF(concepts);
    }

    // ========================================
    // STEP 2: MULTIPLE CHOICE Questions (3 difficulties)
    // ========================================
    console.log('📝 Step 2/4: Generating Multiple Choice questions...');
    try {
        // EASY
        const mcEasyPrompt = `Create EXACTLY 15 multiple choice questions with 4 options each. Make correct answer obvious.

TEXT: ${text.substring(0, 5000)}

RESPOND WITH ONLY THIS JSON (no text before or after):
[
  {
    "question": "What is the function of the cell membrane?",
    "options": ["Controls what enters and exits", "Produces energy", "Stores DNA", "Makes proteins"],
    "correctIndex": 0,
    "explanation": "The cell membrane controls what enters and exits the cell"
  }
]

CRITICAL RULES:
- Start with [ and end with ]
- Exactly 15 questions
- Each question has exactly 4 options in "options" array
- "correctIndex" is 0, 1, 2, or 3 (number, not string)
- No trailing commas`;
        
        const mcEasy = await callOllama(mcEasyPrompt, { temperature: 0.3, num_predict: 4096 });
        const parsedMCEasy = parseAIResponse(mcEasy, 'mc-easy');
        allQuestions.multipleChoice.easy = Array.isArray(parsedMCEasy) ? parsedMCEasy.slice(0, 15) : [];

        // MEDIUM
        const mcMediumPrompt = `Create EXACTLY 12 multiple choice questions with 4 plausible options each.

TEXT: ${text.substring(0, 5000)}

RESPOND WITH ONLY THIS JSON (no text before or after):
[
  {
    "question": "Question here",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctIndex": 1,
    "explanation": "Explanation here"
  }
]

CRITICAL RULES:
- Exactly 12 questions
- 4 plausible options each
- "correctIndex" is a number (0-3)
- Make distractors believable`;
        
        const mcMedium = await callOllama(mcMediumPrompt, { temperature: 0.4, num_predict: 4096 });
        const parsedMCMedium = parseAIResponse(mcMedium, 'mc-medium');
        allQuestions.multipleChoice.medium = Array.isArray(parsedMCMedium) ? parsedMCMedium.slice(0, 12) : [];

        // HARD
        const mcHardPrompt = `Create EXACTLY 10 challenging multiple choice questions with very similar options.

TEXT: ${text.substring(0, 4000)}

RESPOND WITH ONLY THIS JSON (no text before or after):
[
  {
    "question": "Question here",
    "options": ["Similar 1", "Similar 2", "Similar 3", "Similar 4"],
    "correctIndex": 2,
    "explanation": "Explanation here"
  }
]

CRITICAL RULES:
- Exactly 10 questions
- All 4 options should be very similar
- "correctIndex" is a number
- No trailing commas`;
        
        const mcHard = await callOllama(mcHardPrompt, { temperature: 0.4, num_predict: 4096 });
        const parsedMCHard = parseAIResponse(mcHard, 'mc-hard');
        allQuestions.multipleChoice.hard = Array.isArray(parsedMCHard) ? parsedMCHard.slice(0, 10) : [];

        console.log(`✅ MC Complete: Easy=${allQuestions.multipleChoice.easy.length}, Medium=${allQuestions.multipleChoice.medium.length}, Hard=${allQuestions.multipleChoice.hard.length}`);
        
        // Ensure minimum questions
        if (allQuestions.multipleChoice.easy.length < 5) {
            allQuestions.multipleChoice.easy = [...allQuestions.multipleChoice.easy, ...generateFallbackMC(concepts).easy].slice(0, 15);
        }
        if (allQuestions.multipleChoice.medium.length < 5) {
            allQuestions.multipleChoice.medium = [...allQuestions.multipleChoice.medium, ...generateFallbackMC(concepts).medium].slice(0, 12);
        }
        if (allQuestions.multipleChoice.hard.length < 5) {
            allQuestions.multipleChoice.hard = [...allQuestions.multipleChoice.hard, ...generateFallbackMC(concepts).hard].slice(0, 10);
        }
        
    } catch (error) {
        console.error('⚠️ MC generation failed:', error.message);
        allQuestions.multipleChoice = generateFallbackMC(concepts);
    }

    // ========================================
    // STEP 3: IDENTIFICATION (from concepts)
    // ========================================
    console.log('📝 Step 3/4: Generating Identification questions...');
    allQuestions.identification.easy = concepts.slice(0, 15).map(c => ({
        question: c.definition,
        answer: c.term,
        hint: `Starts with "${c.term.charAt(0)}"`
    }));
    
    allQuestions.identification.medium = concepts.slice(0, 12).map(c => ({
        question: `${c.definition.substring(0, 80)}...`,
        answer: c.term,
        hint: `${c.term.length} letters`
    }));
    
    allQuestions.identification.hard = concepts.slice(0, 10).map(c => ({
        question: c.definition.split(' ').slice(0, 10).join(' ') + '...',
        answer: c.term,
        hint: 'No hint'
    }));
    
    console.log(`✅ ID Complete: Easy=${allQuestions.identification.easy.length}, Medium=${allQuestions.identification.medium.length}, Hard=${allQuestions.identification.hard.length}`);

    // ========================================
    // STEP 4: MATCHING (from concepts)
    // ========================================
    console.log('📝 Step 4/4: Generating Matching questions...');
    allQuestions.matching.easy = {
        pairs: concepts.slice(0, 10).map(c => ({ left: c.term, right: c.definition })),
        instruction: 'Match each term with its definition.'
    };
    
    allQuestions.matching.medium = {
        pairs: concepts.slice(0, 8).map(c => ({ left: c.term, right: c.definition.substring(0, 80) })),
        instruction: 'Match terms with partial definitions.'
    };
    
    allQuestions.matching.hard = {
        pairs: concepts.slice(0, 6).map(c => ({ left: c.term, right: c.definition.split(' ').slice(0, 8).join(' ') })),
        instruction: 'Match terms with brief descriptions.'
    };
    
    console.log(`✅ Matching Complete: Easy=${allQuestions.matching.easy.pairs.length} pairs, Medium=${allQuestions.matching.medium.pairs.length} pairs, Hard=${allQuestions.matching.hard.pairs.length} pairs`);

    console.log('✅ Phase 2 Complete! All quiz questions generated (QUEUED).');
    return allQuestions;
}

// Fallback functions
function extractBasicConcepts(text) {
    const concepts = [];
    const capitalizedPattern = /\b([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{3,})?)\b/g;
    const termCounts = new Map();
    
    let match;
    while ((match = capitalizedPattern.exec(text)) !== null) {
        const term = match[1];
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
    
    const topTerms = Array.from(termCounts.entries())
        .filter(([term, count]) => count >= 2 && term.length > 4)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    
    topTerms.forEach(([term, count]) => {
        concepts.push({
            term: term,
            definition: `Important concept in this topic (appears ${count} times)`
        });
    });
    
    return concepts.length > 0 ? concepts : [{ term: "Main Topic", definition: text.substring(0, 150) }];
}

function generateFallbackTF(concepts) {
    const validConcepts = concepts.slice(0, 20);
    return {
        easy: validConcepts.slice(0, 15).map((c, i) => ({
            question: `${c.term} is an important concept in this topic.`,
            answer: true,
            explanation: c.definition
        })),
        medium: validConcepts.slice(0, 12).map((c, i) => ({
            question: i % 2 === 0 
                ? `${c.term} is directly related to this subject matter.`
                : `${c.term} plays no role in this topic.`,
            answer: i % 2 === 0,
            explanation: i % 2 === 0 ? `True. ${c.definition}` : `False. ${c.definition}`
        })),
        hard: validConcepts.slice(0, 10).map((c, i) => ({
            question: `${c.term} has no relevance to this topic whatsoever.`,
            answer: false,
            explanation: `False. ${c.definition}`
        }))
    };
}

function generateFallbackMC(concepts) {
    const validConcepts = concepts.slice(0, 20);
    return {
        easy: validConcepts.slice(0, 15).map(c => ({
            question: `What is ${c.term}?`,
            options: [c.definition, "A type of cell organelle", "A biological process", "An organism"],
            correctIndex: 0,
            explanation: c.definition
        })),
        medium: validConcepts.slice(0, 12).map(c => ({
            question: `Which best describes ${c.term}?`,
            options: ["A cellular structure", c.definition, "A scientific theory", "A research method"],
            correctIndex: 1,
            explanation: c.definition
        })),
        hard: validConcepts.slice(0, 10).map(c => ({
            question: `What is the primary function of ${c.term}?`,
            options: ["Related to cellular transport", "Involved in energy production", c.definition, "Associated with DNA replication"],
            correctIndex: 2,
            explanation: c.definition
        }))
    };
}

module.exports = {
    generateReviewer,
    generateQuizQuestions
};