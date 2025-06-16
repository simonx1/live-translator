from flask import Flask, request, jsonify
from flask_cors import CORS
import os # For accessing environment variables

# Attempt to import Google Cloud Translate client library
try:
    from google.cloud import translate_v2 as translate
    GOOGLE_TRANSLATE_AVAILABLE = True
except ImportError:
    GOOGLE_TRANSLATE_AVAILABLE = False
    print("Google Cloud Translate library not found. Real translation will be disabled.")

app = Flask(__name__)
CORS(app)

# --- Configuration for Google Translate ---
# IMPORTANT: You need to set the GOOGLE_APPLICATION_CREDENTIALS environment variable
# to the path of your JSON key file for Google Cloud authentication.
# For example: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/keyfile.json"
#
# Alternatively, for simple API key usage (less common for server-side libraries but possible for some APIs):
# GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
# For this example, we'll assume application default credentials or service account key path is set.

# Initialize Translate client if available
if GOOGLE_TRANSLATE_AVAILABLE:
    try:
        translate_client = translate.Client()
        print("Google Translate client initialized successfully.")
    except Exception as e:
        print(f"Error initializing Google Translate client: {e}. Real translation may fail.")
        GOOGLE_TRANSLATE_AVAILABLE = False # Disable if client init fails
else:
    translate_client = None

@app.route('/translate', methods=['POST'])
def translate_text_route(): # Renamed function to avoid conflict with library
    try:
        data = request.get_json()
        text_to_translate = data.get('text')
        source_lang = data.get('source_lang') # e.g., 'en-US'
        target_lang = data.get('target_lang') # e.g., 'pl-PL'

        if not text_to_translate or not source_lang or not target_lang:
            return jsonify({"error": "Missing required parameters: text, source_lang, or target_lang"}), 400

        # Extract base language codes (e.g., 'en' from 'en-US') for Google Translate
        source_lang_base = source_lang.split('-')[0]
        target_lang_base = target_lang.split('-')[0]

        translated_text = ""
        translation_source = "mock" # To indicate where the translation came from

        # Attempt real translation if client is available and configured
        # This part simulates how you would use an API key or credentials.
        # In a real deployed app, ensure GOOGLE_APPLICATION_CREDENTIALS is set in the environment.
        if GOOGLE_TRANSLATE_AVAILABLE and translate_client:
            try:
                # Check if source and target languages are different
                if source_lang_base == target_lang_base:
                    translated_text = text_to_translate
                    translation_source = "no_translation_needed"
                else:
                    result = translate_client.translate(
                        text_to_translate,
                        target_language=target_lang_base,
                        source_language=source_lang_base
                    )
                    translated_text = result['translatedText']
                    translation_source = "google_translate_api"

                print(f"Successfully translated using Google Translate API: '{text_to_translate}' -> '{translated_text}'")

            except Exception as e:
                print(f"Google Translate API call failed: {e}")
                print("Falling back to mock translation.")
                # Fallback to mock if API call fails
                translated_text = f"Mock (API Error): \"{text_to_translate}\" (to {target_lang_base})"
                translation_source = "mock_api_error"
        else:
            # Fallback to mock translation if API is not available or not configured
            if source_lang_base == target_lang_base:
                translated_text = text_to_translate
                translation_source = "mock_no_translation_needed"
            else:
                translated_text = f"Mock: \"{text_to_translate}\" (to {target_lang_base})"
                translation_source = "mock_unavailable"
            print(f"Google Translate API not available/configured. Using mock translation for: '{text_to_translate}'")


        return jsonify({
            "translated_text": translated_text,
            "source_lang": source_lang, # Return original lang codes
            "target_lang": target_lang,
            "translation_source": translation_source
        })

    except Exception as e:
        print(f"Error in /translate route: {e}")
        return jsonify({"error": str(e), "translation_source": "error_handler"}), 500

if __name__ == '__main__':
    # For local testing, you would need to set the GOOGLE_APPLICATION_CREDENTIALS env var
    # before running this script if you want to test the actual Google Translate integration.
    print("Starting Flask server...")
    print(f"Google Translate Available: {GOOGLE_TRANSLATE_AVAILABLE}")
    if GOOGLE_TRANSLATE_AVAILABLE and not translate_client:
        print("Warning: Google Translate library is available, but client failed to initialize.")
    elif not GOOGLE_TRANSLATE_AVAILABLE:
        print("Info: Google Translate library not found or client init failed. Only mock translations will be provided.")

    app.run(debug=True, port=5000)
