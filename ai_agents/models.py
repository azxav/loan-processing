import google.generativeai as genai
from app.core.config import settings

def get_gemini_model():
    if not settings.GOOGLE_API_KEY:
        # Return a mock or raise error if key is missing
        # For MVP, we'll assume the key is provided or handle it gracefully
        print("Warning: GOOGLE_API_KEY not set. AI features will not work.")
        return None
        
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
    return model
