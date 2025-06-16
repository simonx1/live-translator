// script.js (Only relevant parts shown, assume rest of the script is the same)
document.addEventListener('DOMContentLoaded', () => {
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const startStopBtn = document.getElementById('start-stop-btn');
    const originalTextDiv = document.getElementById('original-text');
    const translatedTextDiv = document.getElementById('translated-text');
    const conversationLogDiv = document.getElementById('conversation-log');

    let recognition;
    let isListening = false;
    const backendUrl = 'http://127.0.0.1:5000/translate';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        // ... (existing error handling)
        originalTextDiv.textContent = "Sorry, your browser does not support Speech Recognition. Try Chrome.";
        startStopBtn.disabled = true;
        translatedTextDiv.textContent = "Speech recognition not supported.";
        conversationLogDiv.textContent = "Speech recognition not supported.";
        return;
    }

    recognition = new SpeechRecognition();
    // ... (recognition setup from previous version)
    recognition.interimResults = true;
    recognition.continuous = true;


    recognition.onstart = () => {
        isListening = true;
        startStopBtn.textContent = 'Stop Listening';
        originalTextDiv.innerHTML = '<em>Listening...</em>';
        translatedTextDiv.textContent = 'Translation will appear here...';
    };

    recognition.onresult = async (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript.trim();
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            originalTextDiv.textContent = finalTranscript;
            translatedTextDiv.innerHTML = '<em>Translating...</em>';

            const sourceLang = sourceLangSelect.value; // e.g., en-US
            const targetLang = targetLangSelect.value; // e.g., pl-PL

            if (sourceLang === targetLang) {
                const sameLangText = `${finalTranscript}`;
                translatedTextDiv.textContent = sameLangText;
                updateConversationLog(finalTranscript, sameLangText, sourceLang, targetLang, "no_translation_needed");
                return;
            }

            try {
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify({
                        text: finalTranscript,
                        source_lang: sourceLang,
                        target_lang: targetLang
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({
                        error: 'Server returned an error, but no JSON body.',
                        translation_source: 'http_error'
                    }));
                    // Ensure error.cause is set for consistent error handling by updateConversationLog
                    const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
                    error.cause = errorData.translation_source || 'http_error';
                    throw error;
                }

                const data = await response.json();
                translatedTextDiv.textContent = data.translated_text;
                updateConversationLog(finalTranscript, data.translated_text, sourceLang, targetLang, data.translation_source);

            } catch (error) {
                console.error('Translation error:', error);
                const translationSource = error.cause || 'client_error'; // error.cause set in the !response.ok block
                translatedTextDiv.textContent = `Error translating: ${error.message}`;
                updateConversationLog(finalTranscript, `Translation Error: ${error.message}`, sourceLang, targetLang, translationSource);
            }

        } else if (interimTranscript) {
            originalTextDiv.innerHTML = `<em>${interimTranscript}</em>`;
        }
    };

    // Updated updateConversationLog function
    function updateConversationLog(original, translated, sourceLangFull, targetLangFull, translationSource) {
        if (conversationLogDiv.textContent === 'Conversation history will be shown here...' ||
            conversationLogDiv.textContent === 'Speech recognition not supported.' ||
            conversationLogDiv.innerHTML.trim() === '') { // Also clear if it was empty (e.g. after manual clear)
            conversationLogDiv.innerHTML = ''; // Clear initial placeholder
        }

        const logEntry = document.createElement('div');
        logEntry.classList.add('log-entry');

        const sourceLangCode = sourceLangFull.split('-')[0].toUpperCase();
        const targetLangCode = targetLangFull.split('-')[0].toUpperCase();

        let translationStatusText = "";
        let statusClass = ""; // For adding specific classes to the status text if needed

        switch (translationSource) {
            case "google_translate_api":
                translationStatusText = `(Translated by Google to ${targetLangCode})`;
                break;
            case "mock_unavailable":
            case "mock_api_error":
            case "mock":
            case "mock_no_translation_needed": // Grouping all mock types that are not errors
                translationStatusText = `(Mock translation to ${targetLangCode})`;
                if (translationSource === "mock_no_translation_needed" || (sourceLangCode === targetLangCode && translationSource.startsWith("mock"))){
                    translationStatusText = `(Mock - No translation needed ${targetLangCode})`;
                }
                break;
            case "no_translation_needed":
                translationStatusText = `(No translation needed - ${targetLangCode})`;
                break;
            case "http_error":
            case "client_error":
            case "error_handler": // from backend's main try-catch
            default:
                translationStatusText = `<span class="error-text">(Translation Error to ${targetLangCode})</span>`;
                statusClass = "error-text"; // also apply to the main translated text if it's an error message
                break;
        }

        const translatedContent = (translationSource === "http_error" || translationSource === "client_error" || translationSource === "error_handler")
                               ? `<span class="error-text">${translated}</span>`
                               : translated;

        logEntry.innerHTML = `
            <p class="log-original"><strong>You (${sourceLangCode}):</strong> ${original}</p>
            <p class="log-translated"><strong>Translation ${translationStatusText}:</strong> ${translatedContent}</p>
        `;
        conversationLogDiv.appendChild(logEntry);
        conversationLogDiv.scrollTop = conversationLogDiv.scrollHeight;
    }

    recognition.onerror = (event) => {
        // ... (existing error handling)
        console.error('Speech recognition error:', event.error);
        let errorMsg = `Error: ${event.error}`;
        if (event.error === 'no-speech') {
            errorMsg += '<br>No speech detected. Please try again.';
        } else if (event.error === 'audio-capture') {
            errorMsg += '<br>Audio capture problem. Is your microphone working?';
        } else if (event.error === 'not-allowed') {
            errorMsg += '<br>Microphone access denied. Please allow microphone access.';
        }
        originalTextDiv.innerHTML = errorMsg;
        translatedTextDiv.textContent = 'Translation stalled due to speech error.';
    };

    recognition.onend = () => {
        // ... (existing onend handling)
        isListening = false;
        startStopBtn.textContent = 'Start Listening';
        if (originalTextDiv.innerHTML === '<em>Listening...</em>') {
            originalTextDiv.textContent = 'Stopped. Click "Start Listening" to try again.';
            if(translatedTextDiv.innerHTML === '<em>Translating...</em>' || translatedTextDiv.textContent === 'Translation will appear here...'){
                translatedTextDiv.textContent = 'Translation will appear here...';
            }
        } else if (translatedTextDiv.innerHTML === '<em>Translating...</em>') {
             translatedTextDiv.textContent = 'Translation cancelled or incomplete.';
        }
    };

    startStopBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            originalTextDiv.textContent = 'Speech will appear here after listening';
            translatedTextDiv.textContent = 'Translation will appear here...';
            // Optional: Clear log, for now it's persistent.
            // if (conversationLogDiv.textContent !== 'Conversation history will be shown here...') {
            //    conversationLogDiv.innerHTML = 'Conversation history will be shown here...';
            // }
            try {
                const selectedLang = sourceLangSelect.value;
                recognition.lang = selectedLang;
                recognition.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
                originalTextDiv.textContent = "Error starting recognition. Check console.";
                translatedTextDiv.textContent = "Translation cannot start.";
            }
        }
    });

    if (originalTextDiv.innerHTML.trim() === '' || originalTextDiv.innerHTML.includes("<!--")) {
        originalTextDiv.textContent = 'Speech will appear here after listening.';
    }
    if (translatedTextDiv.innerHTML.trim() === '') {
        translatedTextDiv.textContent = 'Translation will appear here...';
    }
    if (conversationLogDiv.innerHTML.trim() === '' || conversationLogDiv.textContent === 'Conversation history will be shown here...' ) {
         conversationLogDiv.textContent = 'Conversation history will be shown here...';
    }
});
