// --- Language List Preparation ---

// The short list of BCP 47 root codes provided by the user
const languagesToCheck = [
    'af', 'am', 'ar', 'az', 'be', 'bg', 'bn', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 
    'el', 'en', 'es', 'et', 'fa', 'fi', 'fil', 'fr', 'ga', 'gl', 'gu', 'he', 'hi', 
    'hr', 'hu', 'id', 'is', 'it', 'ja', 'jv', 'km', 'kn', 'ko', 'lo', 'lt', 'lv', 
    'ml', 'mr', 'ms', 'nb', 'ne', 'nl', 'no', 'pa', 'pl', 'pt', 'ro', 'ru', 'si', 
    'sk', 'sl', 'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 
    'zh', 'zu'
];

// A simple map for displaying human-readable names
const languageMap = new Map(Object.entries({
    'af': 'Afrikaans', 'am': 'Amharic', 'ar': 'Arabic', 'az': 'Azerbaijani',
    'be': 'Belarusian', 'bg': 'Bulgarian', 'bn': 'Bengali', 'bs': 'Bosnian',
    'ca': 'Catalan', 'cs': 'Czech', 'cy': 'Welsh', 'da': 'Danish',
    'de': 'German', 'el': 'Greek', 'en': 'English', 'es': 'Spanish',
    'et': 'Estonian', 'fa': 'Persian', 'fi': 'Finnish', 'fil': 'Filipino',
    'fr': 'French', 'ga': 'Irish', 'gl': 'Galician', 'gu': 'Gujarati',
    'he': 'Hebrew', 'hi': 'Hindi', 'hr': 'Croatian', 'hu': 'Hungarian',
    'id': 'Indonesian', 'is': 'Icelandic', 'it': 'Italian', 'ja': 'Japanese',
    'jv': 'Javanese', 'km': 'Khmer', 'kn': 'Kannada', 'ko': 'Korean',
    'lo': 'Lao', 'lt': 'Lithuanian', 'lv': 'Latvian', 'ml': 'Malayalam',
    'mr': 'Marathi', 'ms': 'Malay', 'nb': 'Norwegian Bokmål', 'ne': 'Nepali',
    'nl': 'Dutch', 'no': 'Norwegian', 'pa': 'Punjabi', 'pl': 'Polish',
    'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian', 'si': 'Sinhala',
    'sk': 'Slovak', 'sl': 'Slovenian', 'sq': 'Albanian', 'sr': 'Serbian',
    'sv': 'Swedish', 'sw': 'Swahili', 'ta': 'Tamil', 'te': 'Telugu',
    'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian', 'ur': 'Urdu',
    'vi': 'Vietnamese', 'zh': 'Chinese', 'zu': 'Zulu'
}));

const totalLanguages = languagesToCheck.length;
const totalChecks = totalLanguages * 3; // L->EN, EN->L, L->L

// --- DOM Elements ---
const statusElement = document.getElementById('status');
const resultsContainer = document.getElementById('results-container');
const progressTextElement = document.getElementById('progress-text');

// --- Utility Functions ---

function getStatusClasses(status) {
    switch (status) {
        case 'available':
            return 'text-green-800 bg-green-100';
        case 'downloadable':
            return 'text-blue-800 bg-blue-100';
        case 'downloading':
            return 'text-yellow-800 bg-yellow-100';
        case 'unavailable':
            return 'text-red-800 bg-red-100';
        case 'error':
            return 'text-gray-800 bg-gray-200';
        default:
            return 'text-gray-600 bg-gray-100';
    }
}

function setOverallStatus(status, message) {
    statusElement.textContent = message;
    statusElement.className = 'status-box';
    switch (status) {
        case 'success':
            statusElement.classList.add('status-green');
            break;
        case 'error':
            statusElement.classList.add('status-red');
            break;
        case 'progress':
            statusElement.classList.add('status-blue');
            break;
        case 'initial':
        default:
            statusElement.classList.add('status-yellow');
            break;
    }
}

function createResultDetail(source, target, status, message) {
    const statusClasses = getStatusClasses(status);
    return `
        <div class="result-detail ${statusClasses}">
            <span class="font-semibold">
                ${source.toUpperCase()} &rarr; ${target.toUpperCase()}
            </span>
            <span class="capitalize font-bold">
                ${status}
            </span>
        </div>
    `;
}

function createLanguageCard(rootCode, languageName, resultsHtml) {
    const isEnglish = rootCode === 'en';
    // Determine the 'worst' status for the summary icon (Unavailable > Downloadable > Available)
    let overallStatus = 'available';
    if (resultsHtml.includes('unavailable')) overallStatus = 'unavailable';
    else if (resultsHtml.includes('downloadable')) overallStatus = 'downloadable';

    const iconColor = overallStatus === 'unavailable' ? 'text-red-600' : 'text-indigo-600';

    const card = document.createElement('details');
    card.innerHTML = `
        <summary class="summary-header">
            <div class="flex items-center space-x-3">
                <svg class="w-4 h-4 chevron transition-transform duration-200 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                <span class="text-sm font-bold text-gray-800">${languageName} (${rootCode.toUpperCase()})</span>
            </div>
            ${isEnglish ? '<span class="text-xs text-indigo-500 font-semibold px-2 py-0.5 rounded-full border border-indigo-300">Base Language</span>' : ''}
        </summary>
        <div class="p-2 border-t border-gray-100">
            ${resultsHtml}
        </div>
    `;
    resultsContainer.appendChild(card);
}

// Simple utility to sleep for a duration
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function with basic exponential backoff retry logic for the API call
async function retryAvailabilityCheck(options, maxRetries = 3) {
    let delay = 1000; // 1 second
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            // Note: window.ai.translator is accessed directly in the extension context
            const availability = await window.ai.translator.availability(options);
            return availability;
        } catch (error) {
            lastError = error;
            // Retries are necessary for robust extension behavior
            if (i < maxRetries - 1) {
                await sleep(delay);
                delay *= 2; // Double the delay for the next attempt
            }
        }
    }
    // If all retries fail, return 'error' status
    return 'error';
}


// --- Main Logic ---

async function checkTranslatorAvailability() {
    // Check if the Translator API object exists in the global scope (window.ai.translator)
    if (!('ai' in window) || !('translator' in window.ai)) {
        setOverallStatus('error', '❌ Translator API Not Found. Ensure Chrome is up-to-date (v138+) and AI flags are enabled.');
        progressTextElement.textContent = '';
        return;
    }

    setOverallStatus('progress', `✅ Translator API Found. Starting ${totalChecks} availability checks...`);

    let currentCheck = 0;

    for (const L of languagesToCheck) {
        const languageName = languageMap.get(L) || 'Unknown Language';
        let resultsHtml = '';

        // --- 1. L -> EN Check ---
        currentCheck++;
        progressTextElement.textContent = `(${currentCheck} of ${totalChecks}) Checking: ${languageName} (${L.toUpperCase()} \u2192 EN)...`;
        
        const status_L_to_EN = await retryAvailabilityCheck({ sourceLanguage: L, targetLanguage: 'en' });
        resultsHtml += createResultDetail(L, 'en', status_L_to_EN);

        // --- 2. EN -> L Check ---
        currentCheck++;
        progressTextElement.textContent = `(${currentCheck} of ${totalChecks}) Checking: ${languageName} (EN \u2192 ${L.toUpperCase()})...`;

        const status_EN_to_L = await retryAvailabilityCheck({ sourceLanguage: 'en', targetLanguage: L });
        resultsHtml += createResultDetail('en', L, status_EN_to_L);
        
        // --- 3. L -> L Check (Proxy for language model presence) ---
        currentCheck++;
        progressTextElement.textContent = `(${currentCheck} of ${totalChecks}) Checking: ${languageName} (${L.toUpperCase()} \u2192 ${L.toUpperCase()})...`;

        const status_L_to_L = await retryAvailabilityCheck({ sourceLanguage: L, targetLanguage: L });
        resultsHtml += createResultDetail(L, L, status_L_to_L);
        
        createLanguageCard(L, languageName, resultsHtml);
    }

    // Final status update
    setOverallStatus('success', `✅ Testing Complete! ${totalChecks} availability checks performed.`);
    progressTextElement.textContent = 'Expand each language to see support status (available/downloadable/unavailable).';
}


// Start the check when the window loads
document.addEventListener('DOMContentLoaded', checkTranslatorAvailability);
