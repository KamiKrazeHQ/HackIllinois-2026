from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY")
TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"

@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json(silent=True) or {}
    texts = data.get("texts", [])
    target_lang = data.get("target", "en")

    if not API_KEY:
        return jsonify({"error": "Missing API key"}), 500

    if not isinstance(texts, list) or not texts:
        return jsonify({"error": "Missing or invalid texts"}), 400

    try:
        response = requests.post(
            TRANSLATE_URL,
            params={"key": API_KEY},
            json={
                "q": texts,
                "target": target_lang,
                "format": "text",
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        return jsonify({"error": "Translation API request failed", "details": str(exc)}), 502

    if response.status_code != 200:
        return jsonify({"error": "Translation API failed", "details": response.text}), 500

    payload = response.json()
    translations = payload.get("data", {}).get("translations", [])
    if len(translations) != len(texts):
        return jsonify({"error": "Unexpected translation response", "details": payload}), 502

    translated_texts = [t["translatedText"] for t in translations]

    return jsonify({"translations": translated_texts})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
