from flask import Flask, request, jsonify
import os
from groclake.modellake import ModelLake

app = Flask(__name__)

# Environment variable setup
GROCLAKE_API_KEY = 'your_groclake_api_key'
GROCLAKE_ACCOUNT_ID = 'your_groclake_account_id'

os.environ['GROCLAKE_API_KEY'] = GROCLAKE_API_KEY
os.environ['GROCLAKE_ACCOUNT_ID'] = GROCLAKE_ACCOUNT_ID

# Initialize Groclake model instance
model_lake = ModelLake()

@app.route('/translate', methods=['POST'])
def translate():
    try:
        data = request.json
        text = data.get('text')
        source_lang = data.get('source_lang')
        target_lang = data.get('target_lang')

        if not text or not source_lang or not target_lang:
            return jsonify({"error": "Invalid input"}), 400

        translation_request = {
            "text": [text],
            "source_lang_code": source_lang,
            "target_lang_code": target_lang,
            "model": "openai"
        }

        translation_response = model_lake.translate(translation_request)
        translated_text = translation_response['translated_text'][0]

        return jsonify({"translated_text": translated_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5500)
