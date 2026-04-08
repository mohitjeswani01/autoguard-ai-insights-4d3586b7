# backend/services/fallback_service.py (updated with insurance context)
import os
import logging
from typing import Dict, Any, Optional
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
                from google import genai
                self.client = genai.Client(api_key=api_key)
                logger.info("Gemini API initialized successfully (google.genai)")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini API: {str(e)}")
                self.client = None
        else:
            logger.warning("GEMINI_API_KEY not found in environment variables")
            self.client = None

    def _build_enhanced_prompt(self, insurance_data: Optional[Any] = None) -> str:
        """
        Build an enhanced prompt with insurance context for better analysis.
        
        Args:
            insurance_data: Optional InsuranceFormData object with vehicle/policy info
        """
        base_prompt = """Analyze this vehicle damage image and provide a JSON response with this exact structure:
{
    "damages": [
        {
            "part": "affected vehicle part (e.g., Front Bumper, Hood, Fender, Door, Headlight)",
            "damageType": "scratch|dent|crack|shatter|deformation|missing",
            "confidence": 0.0-1.0,
            "severity": "minor|moderate|severe",
            "estimatedCost": estimated repair cost in INR (Indian Rupees),
            "boundingBox": {"x": 0, "y": 0, "width": 0, "height": 0}
        }
    ],
    "confidence": overall confidence score 0-1,
    "totalEstimatedCost": sum of all damage costs in INR,
    "recommendations": "brief recommendation for claim processing",
    "repairTimeEstimate": "estimated repair time in days"
}"""

        # Add insurance context if available
        if insurance_data:
            insurance_context = f"""

INSURANCE CONTEXT (use this to provide more accurate estimates):
- Owner: {insurance_data.ownerName or 'Not provided'}
- City/Region: {insurance_data.city}
- Vehicle Price: ₹{insurance_data.vehiclePriceLakhs} Lakhs
- Purchase Date: {insurance_data.purchaseDate or 'Not provided'}
- Fuel Type: {insurance_data.fuelType}
- Vehicle Condition: {insurance_data.vehicleCondition * 100:.0f}%
- Policy Type: {'Zero-Depreciation' if insurance_data.hasZeroDepreciation else 'Standard (with depreciation)'}
- Return-to-Invoice: {'Yes' if insurance_data.hasReturnToInvoice else 'No'}
- Claimed Repair Bill: ₹{insurance_data.estimatedRepairBill:,.0f}

ANALYSIS INSTRUCTIONS:
1. Estimate repair costs based on Indian market rates for the {insurance_data.city} region
2. Consider vehicle age and condition when assessing damage severity
3. For {'Zero-Depreciation' if insurance_data.hasZeroDepreciation else 'Standard'} policy, note if costs seem reasonable
4. Flag any potential inconsistencies between visible damage and claimed repair amount
5. Provide realistic cost estimates in INR (Indian Rupees)
"""
            base_prompt += insurance_context
        else:
            base_prompt += """

NOTE: Estimate repair costs in INR (Indian Rupees) based on typical Indian market rates.
"""

        base_prompt += """

IMPORTANT: Provide ONLY valid JSON, no markdown formatting or additional text."""
        
        return base_prompt

    def get_analysis(self, image_path: str, insurance_data: Optional[Any] = None) -> Dict[str, Any]:
        """
        Analyze vehicle damage using Gemini Vision API with optional insurance context.
        
        Args:
            image_path: Path to image file
            insurance_data: Optional InsuranceFormData for enhanced analysis
            
        Returns:
            Dictionary with analysis results
        """
        if not self.client:
            logger.warning("Cloud analyzer not available, returning mock results")
            return self._get_mock_analysis(insurance_data)
        
        try:
            from google.genai import types
            
            # Read image file
            with open(image_path, "rb") as f:
                img_data = f.read()
            
            # Build enhanced prompt with insurance context
            prompt_text = self._build_enhanced_prompt(insurance_data)
            
            if insurance_data:
                logger.info(f"Using enhanced prompt with insurance context for {insurance_data.city}")
            
            image_part = types.Part.from_bytes(data=img_data, mime_type="image/jpeg")
            
            response = self.client.models.generate_content(
                model='gemini-1.5-flash',
                contents=[prompt_text, image_part]
            )
            
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
                logger.info("Gemini analysis successful with enhanced prompt")
                return analysis
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response as JSON: {str(e)}")
                return self._get_mock_analysis(insurance_data)
        
        except Exception as e:
            logger.error(f"Cloud analysis error: {str(e)}")
            return self._get_mock_analysis(insurance_data)
    
    def _get_mock_analysis(self, insurance_data: Optional[Any] = None) -> Dict[str, Any]:
        """Return mock analysis for testing, considering insurance data if available"""
        base_cost = 5000  # Base cost in INR
        
        # Adjust mock cost based on insurance data
        if insurance_data:
            # Higher vehicle price = higher repair costs
            price_multiplier = insurance_data.vehiclePriceLakhs / 10.0
            base_cost = int(base_cost * max(1.0, price_multiplier))
        
        return {
            "damages": [
                {
                    "part": "Front Bumper",
                    "damageType": "dent",
                    "confidence": 0.75,
                    "severity": "moderate",
                    "estimatedCost": base_cost,
                    "boundingBox": {"x": 50, "y": 100, "width": 200, "height": 150},
                }
            ],
            "confidence": 0.75,
            "totalEstimatedCost": base_cost,
            "recommendations": "Recommend claim approval pending physical inspection" if insurance_data else "Standard damage assessment",
            "repairTimeEstimate": "3-5 days"
        }