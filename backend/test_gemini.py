import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
model = os.getenv("GEMINI_MODEL")

endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
print(endpoint)
payload = {
    "contents": [{"parts": [{"text": "Hello"}]}],
}
response = requests.post(endpoint, json=payload)
print(response.status_code, response.text)
