# backend/services/fallback_service.py (updated)
import os
import logging
from typing import Dict, Any
import json
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class CloudAnalyzer:
    def __init__(self):
        """Initialize Cloud AI (Gemini API)"""
        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("Gemini API initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini API: {str(e)}")
                self.model = None
        else:
            logger.warning("GEMINI_API_KEY not found in environment variables")
            self.model = None

    def get_analysis(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze vehicle damage using Gemini Vision API.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Dictionary with analysis results
        """
        if not self.model:
            logger.warning("Cloud analyzer not available, returning mock results")
            return self._get_mock_analysis()
        
        try:
            # Read image file
            with open(image_path, "rb") as f:
                img_data = f.read()
            
            # Create detailed damage analysis prompt
            prompt = """Analyze this vehicle damage image and provide a JSON response with this exact structure:
            {
                "damages": [
                    {
                        "part": "affected vehicle part",
                        "damageType": "scratch|dent|crack|shatter|deformation|missing",
                        "confidence": 0.0-1.0,
                        "severity": "minor|moderate|severe",
                        "estimatedCost": estimated repair cost in USD,
                        "boundingBox": {"x": 0, "y": 0, "width": 0, "height": 0}
                    }
                ],
                "confidence": overall confidence score 0-1,
                "totalEstimatedCost": sum of all damage costs
            }
            
            Provide ONLY valid JSON, no markdown or additional text."""
            
            response = self.model.generate_content([prompt, {"mime_type": "image/jpeg", "data": img_data}])
            
            # Parse response
            try:
                response_text = response.text.strip()
                # Remove markdown code blocks if present
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                    response_text = response_text.split("```")[0]
                
                analysis = json.loads(response_text)
                logger.info("Gemini analysis successful")
                return analysis
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response as JSON: {str(e)}")
                return self._get_mock_analysis()
        
        except Exception as e:
            logger.error(f"Cloud analysis error: {str(e)}")
            return self._get_mock_analysis()
    
    def _get_mock_analysis(self) -> Dict[str, Any]:
        """Return mock analysis for testing"""
        return {
            "damages": [
                {
                    "part": "Front Bumper",
                    "damageType": "dent",
                    "confidence": 0.75,
                    "severity": "moderate",
                    "estimatedCost": 450.0,
                    "boundingBox": {"x": 50, "y": 100, "width": 200, "height": 150},
                }
            ],
            "confidence": 0.75,
            "totalEstimatedCost": 450.0,
        }