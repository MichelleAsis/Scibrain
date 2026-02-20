// Enhanced Content Processor v2.0 - Optimized for Raw Text Processing
// Pure JavaScript - No AI API Required

// ==================== //
// Advanced Text Preprocessor
// ==================== //
class TextPreprocessor {
    
    static preprocess(text) {
        console.log('🔧 Starting text preprocessing...');
        console.log('Original length:', text.length);
        
        // Step 1: Fix common OCR/PDF extraction issues
        text = this.fixExtractionIssues(text);
        
        // Step 2: Restore paragraph structure
        text = this.restoreParagraphStructure(text);
        
        // Step 3: Detect and format lists
        text = this.detectAndFormatLists(text);
        
        // Step 4: Clean up excessive whitespace
        text = this.cleanWhitespace(text);
        
        console.log('✅ Preprocessing complete. New length:', text.length);
        return text;
    }
    
    static fixExtractionIssues(text) {
        // Fix hyphenation at line breaks
        text = text.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
        
        // Remove page numbers (standalone numbers on lines)
        text = text.replace(/^\s*\d+\s*$/gm, '');
        
        // Fix common OCR mistakes
        text = text.replace(/\bl\b(?=[A-Z])/g, 'I'); // l before capital letter -> I
        text = text.replace(/\b0(?=[A-Z])/g, 'O'); // 0 before capital letter -> O
        
        // ENHANCED: Preserve scientific characters but remove junk
        // Keep: letters, numbers, spaces, basic punctuation, and scientific symbols
        // Scientific symbols to preserve: +, -, =, ^, ², ³, °, %, →, ←, ↔, Δ, Σ, π, μ, α, β, γ, etc.
        text = text.replace(/[^\w\s.,!?;:()\[\]{}'"\/\\\-–—+=%^°²³*×÷≈≠≤≥→←↔↑↓∞∑∏∫∂√πΔΣαβγδεθλμσφψωΩ\n]/g, ' ');
        
        return text;
    }
    
    static restoreParagraphStructure(text) {
        // Split into lines
        const lines = text.split('\n');
        const processedLines = [];
        let currentParagraph = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) {
                if (currentParagraph.length > 0) {
                    processedLines.push(currentParagraph.join(' '));
                    processedLines.push(''); // Add paragraph break
                    currentParagraph = [];
                }
                continue;
            }
            
            // Check if this looks like a heading
            if (this.isLikelyHeading(line, lines[i - 1], lines[i + 1])) {
                // Save previous paragraph
                if (currentParagraph.length > 0) {
                    processedLines.push(currentParagraph.join(' '));
                    processedLines.push('');
                    currentParagraph = [];
                }
                
                // Add heading with extra spacing
                processedLines.push('');
                processedLines.push(line);
                processedLines.push('');
                continue;
            }
            
            // ENHANCED: Split combined "Term: Definition" entries
            // Pattern: multiple "Word: definition" in one line
            if (this.hasMultipleDefinitions(line)) {
                // Save current paragraph first
                if (currentParagraph.length > 0) {
                    processedLines.push(currentParagraph.join(' '));
                    processedLines.push('');
                    currentParagraph = [];
                }
                
                // Split and add each definition
                const definitions = this.splitDefinitions(line);
                definitions.forEach(def => {
                    if (def.trim()) {
                        processedLines.push(def.trim());
                    }
                });
                processedLines.push('');
                continue;
            }
            
            // Check if line ends with sentence-ending punctuation
            if (/[.!?]$/.test(line)) {
                currentParagraph.push(line);
                // If next line starts with capital or is empty, end paragraph
                const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                if (!nextLine || /^[A-Z]/.test(nextLine)) {
                    processedLines.push(currentParagraph.join(' '));
                    processedLines.push('');
                    currentParagraph = [];
                }
            } else {
                currentParagraph.push(line);
            }
        }
        
        // Add remaining paragraph
        if (currentParagraph.length > 0) {
            processedLines.push(currentParagraph.join(' '));
        }
        
        return processedLines.join('\n');
    }
    
    static hasMultipleDefinitions(line) {
        // Check if line has multiple "Term: definition" patterns
        const definitionPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:\s+[^:]{10,}/g;
        const matches = line.match(definitionPattern);
        return matches && matches.length >= 2;
    }
    
    static splitDefinitions(line) {
        // Split line into individual "Term: Definition" entries
        const definitions = [];
        
        // Pattern: Capitalized term followed by colon and definition
        const pattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):\s+([^:]+?)(?=\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:|$)/g;
        
        let match;
        while ((match = pattern.exec(line)) !== null) {
            const term = match[1].trim();
            const definition = match[2].trim();
            definitions.push(`${term}: ${definition}`);
        }
        
        // If pattern didn't work, try splitting by looking for capital letter after period
        if (definitions.length === 0) {
            const parts = line.split(/(?<=\.)(?=\s+[A-Z])/);
            definitions.push(...parts);
        }
        
        return definitions;
    }
    
    static isLikelyHeading(line, prevLine, nextLine) {
        if (!line) return false;
        
        const words = line.split(/\s+/);
        
        // Too long to be heading
        if (words.length > 15) return false;
        
        // Too short
        if (words.length < 2) return false;
        
        // All caps and reasonable length
        if (line === line.toUpperCase() && words.length <= 10) return true;
        
        // Starts with number (1. Introduction)
        if (/^\d+\.?\s+[A-Z]/.test(line)) return true;
        
        // Title case (Most Words Capitalized)
        const capitalizedCount = words.filter(w => /^[A-Z]/.test(w)).length;
        if (capitalizedCount >= words.length * 0.7) return true;
        
        // No ending punctuation
        if (!/[.!?;,]$/.test(line)) {
            // And surrounded by empty lines
            const isPrevEmpty = !prevLine || !prevLine.trim();
            const isNextEmpty = !nextLine || !nextLine.trim();
            if (isPrevEmpty || isNextEmpty) return true;
        }
        
        return false;
    }
    
    static detectAndFormatLists(text) {
        const lines = text.split('\n');
        const processed = [];
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                processed.push('');
                inList = false;
                continue;
            }
            
            // Detect list items
            if (this.isListItem(line)) {
                if (!inList) {
                    processed.push(''); // Add spacing before list
                    inList = true;
                }
                // Format as markdown list
                const cleanedItem = line.replace(/^[•\-*\d+\.)]\s*/, '');
                processed.push(`• ${cleanedItem}`);
            } else {
                if (inList) {
                    processed.push(''); // Add spacing after list
                    inList = false;
                }
                processed.push(line);
            }
        }
        
        return processed.join('\n');
    }
    
    static isListItem(line) {
        // Starts with bullet, dash, asterisk, or number
        return /^[•\-*]\s+/.test(line) || /^\d+[\.)]\s+/.test(line);
    }
    
    static cleanWhitespace(text) {
        // Replace multiple spaces with single space
        text = text.replace(/ {2,}/g, ' ');
        
        // Replace more than 2 newlines with exactly 2
        text = text.replace(/\n{3,}/g, '\n\n');
        
        // Trim each line
        text = text.split('\n').map(line => line.trim()).join('\n');
        
        return text.trim();
    }
}

// ==================== //
// Text Cleaner
// ==================== //
class TextCleaner {
    
    static clean(text) {
        console.log('🧹 Starting text cleaning...');
        
        text = this.removeNoisePatterns(text);
        text = this.normalizeWhitespace(text);
        text = this.removeDuplicatePunctuation(text);
        
        console.log('✅ Text cleaning complete');
        return text.trim();
    }
    
    static removeNoisePatterns(text) {
        // Remove sequences of repeating punctuation (but not ellipsis)
        text = text.replace(/([;:,.'"\-_])\1{2,}/g, '$1');
        text = text.replace(/[;:,.'"\-_]{3,}/g, ' ');
        text = text.replace(/\.{4,}/g, '...');
        
        return text;
    }
    
    static normalizeWhitespace(text) {
        // Fix spacing around punctuation
        text = text.replace(/\s+([.,!?;:])/g, '$1');
        text = text.replace(/([.,!?;:])([A-Za-z])/g, '$1 $2');
        
        return text;
    }
    
    static removeDuplicatePunctuation(text) {
        text = text.replace(/([!?.])\1+/g, '$1');
        text = text.replace(/([,;:])\1+/g, '$1');
        
        return text;
    }
}

// ==================== //
// Science Pattern Detector
// ==================== //
class SciencePatternDetector {
    
    static detectPatterns(text) {
        console.log('🔬 Detecting science patterns...');
        
        const patterns = {
            definitions: this.findDefinitions(text),
            processes: this.findProcesses(text),
            classifications: this.findClassifications(text),
            lists: this.findLists(text)
        };
        
        console.log('✅ Pattern detection complete:', {
            definitions: patterns.definitions.length,
            processes: patterns.processes.length,
            classifications: patterns.classifications.length,
            lists: patterns.lists.length
        });
        
        return patterns;
    }
    
    static findDefinitions(text) {
        const definitions = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        
        const definitionPatterns = [
            /(.{3,50})\s+is\s+(?:a|an|the)\s+(.{10,200})/i,
            /(.{3,50})\s+are\s+(.{10,200})/i,
            /(.{3,50})\s+means\s+(.{10,200})/i,
            /(.{3,50})\s+refers?\s+to\s+(.{10,200})/i,
            /(.{3,50}):\s+(.{10,200})/
        ];
        
        sentences.forEach(sentence => {
            for (const pattern of definitionPatterns) {
                const match = sentence.match(pattern);
                if (match && match[1] && match[2]) {
                    const term = match[1].trim();
                    const definition = match[2].trim();
                    
                    // Validate it looks like a definition
                    if (term.split(' ').length <= 6 && definition.split(' ').length >= 3) {
                        definitions.push({
                            term: term.replace(/^(the|a|an)\s+/i, ''),
                            definition: definition,
                            fullText: sentence.trim()
                        });
                        break;
                    }
                }
            }
        });
        
        return definitions;
    }
    
    static findProcesses(text) {
        const processes = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        
        const processKeywords = ['process', 'procedure', 'method', 'steps', 'stages', 
                                 'involves', 'consists of', 'comprises'];
        
        sentences.forEach(sentence => {
            const lower = sentence.toLowerCase();
            if (processKeywords.some(keyword => lower.includes(keyword))) {
                processes.push({
                    process: sentence.trim().substring(0, 100),
                    fullText: sentence.trim()
                });
            }
        });
        
        return processes;
    }
    
    static findClassifications(text) {
        const classifications = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        
        const classKeywords = ['types of', 'kinds of', 'categories', 'classified into', 
                               'divided into', 'two main', 'three main'];
        
        sentences.forEach(sentence => {
            const lower = sentence.toLowerCase();
            if (classKeywords.some(keyword => lower.includes(keyword))) {
                classifications.push({
                    category: sentence.trim().substring(0, 100),
                    fullText: sentence.trim()
                });
            }
        });
        
        return classifications;
    }
    
    static findLists(text) {
        const lists = [];
        const lines = text.split('\n');
        let currentList = [];
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            if (/^[•\-*\d+\.)]\s+/.test(trimmed)) {
                currentList.push(trimmed.replace(/^[•\-*\d+\.)]\s*/, ''));
            } else if (currentList.length > 0) {
                if (currentList.length >= 2) {
                    lists.push({
                        items: [...currentList],
                        context: lines[index - currentList.length - 1] || ''
                    });
                }
                currentList = [];
            }
        });
        
        // Add final list if exists
        if (currentList.length >= 2) {
            lists.push({
                items: [...currentList],
                context: ''
            });
        }
        
        return lists;
    }
}

// ==================== //
// Enhanced Content Analyzer
// ==================== //
class ContentAnalyzer {
    
    constructor(text) {
        // Preprocess first
        this.rawText = text;
        this.text = TextPreprocessor.preprocess(text);
        this.text = TextCleaner.clean(this.text);
        
        this.lines = this.text.split('\n').filter(line => line.trim());
        this.paragraphs = this.text.split(/\n\n+/).filter(p => p.trim());
        this.sentences = this.extractSentences(this.text);
        this.patterns = SciencePatternDetector.detectPatterns(this.text);
    }
    
    extractSentences(text) {
        return text
            .replace(/([.!?])\s+/g, '$1|SPLIT|')
            .split('|SPLIT|')
            .map(s => s.trim())
            .filter(s => s.length > 15 && s.split(' ').length >= 4);
    }
    
    detectSections() {
        console.log('📑 Detecting sections...');
        
        const sections = [];
        let currentSection = null;
        
        this.paragraphs.forEach((paragraph, index) => {
            const lines = paragraph.split('\n').filter(l => l.trim());
            const firstLine = lines[0] || '';
            
            // Check if first line is a heading
            const isHeading = this.isHeading(firstLine);
            
            if (isHeading || (sections.length === 0 && index === 0)) {
                // Save previous section
                if (currentSection && currentSection.content.length > 0) {
                    sections.push(currentSection);
                }
                
                // Start new section
                currentSection = {
                    title: isHeading ? this.cleanHeading(firstLine) : 'Introduction',
                    level: this.getHeadingLevel(firstLine),
                    content: isHeading ? lines.slice(1) : lines,
                    rawContent: isHeading ? lines.slice(1).join(' ') : lines.join(' ')
                };
            } else if (currentSection) {
                // Add to current section
                lines.forEach(line => currentSection.content.push(line));
                currentSection.rawContent += ' ' + lines.join(' ');
            } else {
                // Create default section
                currentSection = {
                    title: 'Content',
                    level: 1,
                    content: lines,
                    rawContent: lines.join(' ')
                };
            }
        });
        
        // Add final section
        if (currentSection && currentSection.content.length > 0) {
            sections.push(currentSection);
        }
        
        // If only one section, try to split intelligently
        if (sections.length === 1 && sections[0].content.length > 20) {
            return this.splitLargeSection(sections[0]);
        }
        
        console.log(`✅ Found ${sections.length} sections`);
        return sections;
    }
    
    isHeading(line) {
        if (!line || line.length > 100) return false;
        
        const words = line.split(/\s+/);
        if (words.length < 2 || words.length > 12) return false;
        
        // Check various heading patterns
        if (line === line.toUpperCase()) return true;
        if (/^\d+\.?\s+[A-Z]/.test(line)) return true;
        if (/^[A-Z][\w\s]+$/.test(line) && !/[.!?]$/.test(line)) return true;
        
        const capitalizedWords = words.filter(w => /^[A-Z]/.test(w)).length;
        if (capitalizedWords >= words.length * 0.7) return true;
        
        return false;
    }
    
    getHeadingLevel(line) {
        if (/^\d+\.\s/.test(line)) return 1;
        if (line === line.toUpperCase()) return 1;
        return 2;
    }
    
    cleanHeading(text) {
        return text
            .replace(/^#+\s*/, '')
            .replace(/^\d+[\.)]\s*/, '')
            .replace(/^[•\-*]\s*/, '')
            .replace(/[:.]+$/, '')
            .trim();
    }
    
    splitLargeSection(section) {
        const sentences = section.content.join(' ').split(/[.!?]+/).filter(s => s.trim());
        const sectionsPerPart = Math.ceil(sentences.length / 4);
        const newSections = [];
        
        for (let i = 0; i < sentences.length; i += sectionsPerPart) {
            const partSentences = sentences.slice(i, i + sectionsPerPart);
            const partText = partSentences.join('. ') + '.';
            
            // Try to find a good title from the first sentence
            const firstSentence = partSentences[0] || '';
            let title = `Section ${Math.floor(i / sectionsPerPart) + 1}`;
            
            // Extract key terms for title
            const keyTerms = this.extractKeyTerms(firstSentence);
            if (keyTerms.length > 0) {
                title = keyTerms[0];
            }
            
            newSections.push({
                title: title,
                level: 2,
                content: partSentences,
                rawContent: partText
            });
        }
        
        return newSections.length > 1 ? newSections : [section];
    }
    
    extractKeyTerms(text) {
        const words = text.split(/\s+/);
        const capitalized = words.filter(w => 
            /^[A-Z][a-z]+/.test(w) && 
            w.length >= 4 &&
            !this.isCommonWord(w)
        );
        return capitalized.slice(0, 3);
    }
    
    extractKeyConcepts() {
        console.log('💡 Extracting key concepts...');
        
        const concepts = new Map();
        const seenTermsLower = new Set(); // Track lowercase versions to prevent duplicates
        
        // From definitions
        this.patterns.definitions.forEach(def => {
            const term = def.term.trim();
            const termLower = term.toLowerCase();
            
            // Skip if already seen (case-insensitive)
            if (seenTermsLower.has(termLower)) return;
            
            // Validate term
            if (!this.isCommonWord(term) && term.length >= 3 && this.isValidConceptTerm(term)) {
                concepts.set(term, {
                    term,
                    definition: def.definition,
                    confidence: 0.95,
                    type: 'definition',
                    occurrences: this.countOccurrences(term)
                });
                seenTermsLower.add(termLower);
            }
        });
        
        // From capitalized terms
        const capitalizedPattern = /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b/g;
        const frequency = new Map();
        let match;
        
        while ((match = capitalizedPattern.exec(this.text)) !== null) {
            const term = match[1].trim();
            const termLower = term.toLowerCase();
            
            // Skip if already seen
            if (seenTermsLower.has(termLower)) continue;
            
            if (!this.isCommonWord(term) && this.isValidConceptTerm(term)) {
                frequency.set(term, (frequency.get(term) || 0) + 1);
            }
        }
        
        // Add frequent terms (3+ occurrences)
        frequency.forEach((count, term) => {
            const termLower = term.toLowerCase();
            
            if (count >= 3 && !seenTermsLower.has(termLower)) {
                concepts.set(term, {
                    term,
                    definition: this.findDefinitionFor(term),
                    confidence: Math.min(count / 8, 0.80),
                    type: 'frequent',
                    occurrences: count
                });
                seenTermsLower.add(termLower);
            }
        });
        
        const result = Array.from(concepts.values())
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 25);
        
        console.log(`✅ Extracted ${result.length} key concepts`);
        return result;
    }

    isValidConceptTerm(term) {
        if (!term || term.length < 3) return false;
        
        // Remove if it's a common word
        if (this.isCommonWord(term)) return false;
        
        // ENHANCED: Check for repeated adjacent words (like "Mitochondria Mitochondria")
        const words = term.split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i].toLowerCase() === words[i + 1].toLowerCase()) {
                return false; // Found duplicate adjacent words
            }
        }
        
        // Filter out generic phrases
        const invalidPatterns = [
            /^(these|those|this|that)\s/i,
            /^(some|many|all|most|few|several)\s/i,
            /^(for example|in addition|as follows|such as)\b/i,
            /^(they|them|their|it|its)$/i,
            /^(key (concepts?|features?|points?)|important (concepts?|features?|points?))$/i,
            /^(the (process|structure|function|role) of)$/i
        ];
        
        for (const pattern of invalidPatterns) {
            if (pattern.test(term)) return false;
        }
        
        // Cannot start with articles or determiners
        if (/^(the|a|an)\s/i.test(term)) return false;
        
        // Must not be too long (more than 5 words)
        if (words.length > 5) return false;
        
        // Must contain at least one substantive word
        const hasSubstantiveWord = words.some(word => {
            return word.length >= 4 && (/^[A-Z]/.test(word) || /tion|ism|ology|sis|ment$/.test(word));
        });
        
        if (!hasSubstantiveWord && words.length > 1) return false;
        
        // Must have at least one letter
        if (!/[a-zA-Z]/.test(term)) return false;
        
        return true;
    }
    
    findDefinitionFor(term) {
        for (const sentence of this.sentences) {
            if (sentence.includes(term) && /is|are|means|refers/.test(sentence)) {
                return sentence.substring(0, 150);
            }
        }
        return '';
    }
    
    countOccurrences(term) {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = this.text.match(regex);
        return matches ? matches.length : 0;
    }
    
    isCommonWord(word) {
        const common = new Set([
            'The', 'This', 'That', 'These', 'Those', 'What', 'Which', 'Who',
            'When', 'Where', 'Why', 'How', 'Can', 'Will', 'Should', 'Would',
            'Could', 'May', 'Might', 'Must', 'Have', 'Has', 'Had', 'Does',
            'Did', 'Are', 'Was', 'Were', 'Been', 'Being', 'Other', 'Some',
            'Many', 'More', 'Most', 'Such', 'Very', 'Also', 'Just', 'Only',
            'Each', 'Every', 'Both', 'Few', 'All', 'Any', 'None', 'One',
            'First', 'Last', 'Next', 'Then', 'Now', 'Here', 'There', 'About',
            'Into', 'Through', 'During', 'Before', 'After', 'Above', 'Below'
        ]);
        return common.has(word) || word.length < 3;
    }
}

// ==================== //
// Question Generator
// ==================== //
class QuestionGenerator {
    
    constructor(analyzer, sections, concepts) {
        this.analyzer = analyzer;
        this.sections = sections;
        this.concepts = concepts;
    }
    
    generateAllQuestions() {
        console.log('❓ Generating questions...');
        
        const questions = {
            trueFalse: this.generateTrueFalse(12),
            multipleChoice: this.generateMultipleChoice(12),
            identification: this.generateIdentification(10),
            matching: this.generateMatching(8)
        };
        
        console.log('✅ Questions generated:', {
            trueFalse: questions.trueFalse.length,
            multipleChoice: questions.multipleChoice.length,
            identification: questions.identification.length,
            matching: questions.matching.pairs.length
        });
        
        return questions;
    }
    
    generateTrueFalse(count) {
        const questions = [];
        
        // True statements from factual sentences
        const factual = this.analyzer.sentences
            .filter(s => this.isFactual(s))
            .slice(0, Math.ceil(count * 0.6));
        
        factual.forEach(sentence => {
            questions.push({
                question: sentence,
                answer: true,
                explanation: 'This statement is correct based on the material.'
            });
        });
        
        // False statements
        this.concepts.slice(0, Math.floor(count * 0.4)).forEach(concept => {
            const falseQ = this.makeFalseStatement(concept);
            if (falseQ) questions.push(falseQ);
        });
        
        return this.shuffle(questions).slice(0, count);
    }
    
    isFactual(sentence) {
        const hasVerb = /\b(is|are|was|were|contains|includes)\b/i.test(sentence);
        const words = sentence.split(' ').length;
        return hasVerb && words >= 8 && words <= 30 && !sentence.includes('?');
    }
    
    makeFalseStatement(concept) {
        const other = this.concepts.find(c => c.term !== concept.term && c.type === concept.type);
        if (!other) return null;
        
        return {
            question: concept.definition.replace(concept.term, other.term),
            answer: false,
            explanation: `False. This describes ${concept.term}, not ${other.term}.`
        };
    }
    
    generateMultipleChoice(count) {
        const questions = [];
        
        this.concepts
            .filter(c => c.definition && c.definition.length > 20)
            .slice(0, count)
            .forEach(concept => {
                const options = this.makeOptions(concept.definition);
                if (options.length >= 4) {
                    questions.push({
                        question: `What is ${concept.term}?`,
                        options: options,
                        correctIndex: 0,
                        explanation: concept.definition
                    });
                }
            });
        
        return questions.slice(0, count);
    }
    
    makeOptions(correct) {
        const options = [correct];
        const distractors = this.concepts
            .filter(c => c.definition && c.definition !== correct)
            .map(c => c.definition.substring(0, 100))
            .slice(0, 3);
        
        options.push(...distractors);
        while (options.length < 4) {
            options.push('A process that performs various biological functions');
        }
        
        return this.shuffle(options);
    }
    
    generateIdentification(count) {
        return this.concepts
            .filter(c => c.definition && c.definition.length > 15)
            .slice(0, count)
            .map(c => ({
                question: c.definition,
                answer: c.term,
                hint: `Starts with "${c.term.charAt(0)}"`
            }));
    }
    
    generateMatching(count) {
        const pairs = this.concepts
            .filter(c => c.definition)
            .slice(0, count)
            .map(c => ({
                left: c.term,
                right: c.definition.substring(0, 100)
            }));
        
        return {
            pairs: this.shuffle(pairs),
            instruction: 'Match each term with its definition.'
        };
    }
    
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

// ==================== //
// Main Processing Function
// ==================== //
async function processContentAdvanced(text, title) {
    console.log('🚀 Starting ENHANCED content processing v2.0...');
    console.log('📝 Input text length:', text.length, 'characters');
    
    // Simulate processing delay for user feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 1: Analyze content
    console.log('Step 1/3: Analyzing content structure...');
    const analyzer = new ContentAnalyzer(text);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('Step 2/3: Extracting concepts and sections...');
    const sections = analyzer.detectSections();
    const concepts = analyzer.extractKeyConcepts();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('Step 3/3: Generating questions...');
    const generator = new QuestionGenerator(analyzer, sections, concepts);
    const questions = generator.generateAllQuestions();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Create comprehensive reviewer data
    const reviewerData = {
        title,
        sections,
        concepts,
        questions,
        patterns: analyzer.patterns,
        metadata: {
            wordCount: analyzer.text.split(/\s+/).length,
            sentenceCount: analyzer.sentences.length,
            paragraphCount: analyzer.paragraphs.length,
            estimatedReadTime: Math.ceil(analyzer.text.split(/\s+/).length / 200),
            generatedAt: new Date().toISOString(),
            processingVersion: '2.0-enhanced'
        }
    };
    
    console.log('🎉 Processing complete!');
    console.log('📊 Results:', {
        sections: sections.length,
        concepts: concepts.length,
        questions: questions.trueFalse.length + questions.multipleChoice.length + 
                   questions.identification.length + questions.matching.pairs.length
    });
    
    return reviewerData;
}