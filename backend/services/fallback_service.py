# backend/services/fallback_service.py
# Robust multi-model AI analyzer with key rotation and Groq fallback
import os
import logging
import json
import base64
from typing import Dict, Any, Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

# ============================================================
# SHARED PROMPT BUILDER
# ============================================================

def build_vehicle_damage_prompt(insurance_data: Optional[Any] = None) -> str:
    """
    Build a crystal-clear, strict vehicle-damage-only prompt.
    If the image is NOT a vehicle, the AI must return an empty damages list.
    """
    base = """You are an expert vehicle damage assessor for Indian insurance claims.

TASK: Analyse the uploaded image for vehicle damage ONLY.

STRICT RULES:
1. If the image does NOT show a vehicle or vehicle damage, return {"damages": [], "confidence": 0, "totalEstimatedCost": 0, "recommendations": "No vehicle damage detected in image", "repairTimeEstimate": "N/A", "isVehicleImage": false}
2. If the image shows vehicle damage, identify EVERY visible damage area.
3. Use Indian market repair rates (INR) as of 2024 for the specific city/region.
4. Be conservative – do not fabricate damage that isn't visible.
5. Return ONLY valid JSON — absolutely no markdown, no code fences, no extra text.

REQUIRED JSON FORMAT (follow exactly):
{
  "isVehicleImage": true,
  "damages": [
    {
      "part": "exact vehicle part name (e.g. Front Bumper, Hood, Left Front Door, Windshield, Right Headlight)",
      "damageType": "scratch|dent|crack|shatter|deformation|missing",
      "confidence": 0.85,
      "severity": "minor|moderate|severe",
      "estimatedCost": 3500,
      "boundingBox": {"x": 120, "y": 80, "width": 200, "height": 150},
      "description": "brief description of the specific damage visible"
    }
  ],
  "confidence": 0.88,
  "totalEstimatedCost": 3500,
  "overallSeverity": "minor|moderate|severe",
  "recommendations": "actionable claim recommendation",
  "repairTimeEstimate": "2-3 days",
  "fraudFlags": []
}

DAMAGE COST REFERENCE (Indian market, INR):
- scratch: ₹800-₹4,000 (based on size and paint work needed)
- dent: ₹1,500-₹8,000 (based on size and panel complexity)
- crack: ₹3,000-₹15,000
- shatter (glass): ₹5,000-₹25,000
- deformation: ₹8,000-₹40,000
- missing part: ₹5,000-₹50,000 (based on part)"""

    if insurance_data:
        vehicle_desc = insurance_data.vehicleName or "Unknown vehicle"
        city = insurance_data.city or "Mumbai"
        price = insurance_data.vehiclePriceLakhs or 10
        policy = "Zero-Depreciation" if insurance_data.hasZeroDepreciation else "Standard (40% depreciation on parts)"
        plate = insurance_data.plateNumber or "Not provided"
        owner = insurance_data.ownerName or "Not provided"

        context = f"""

VEHICLE CONTEXT (use to calibrate repair cost estimates):
- Vehicle: {vehicle_desc} (Plate: {plate})
- Owner: {owner}
- Vehicle Price: ₹{price} Lakhs  
- City/Region: {city}
- Fuel Type: {insurance_data.fuelType}
- Policy Type: {policy}
- Claimed Repair Bill: ₹{insurance_data.estimatedRepairBill:,.0f}

CALIBRATION INSTRUCTIONS:
- Adjust part costs to match a ₹{price}L vehicle (luxury cars cost more to repair than budget cars)
- Use {city} regional labour rates
- If you spot inconsistency between visible damage and claimed ₹{insurance_data.estimatedRepairBill:,.0f} bill, add a fraudFlags entry
- For {policy}: note whether the total is reasonable for this policy type"""
        base += context

    base += "\n\nANALYSE THE IMAGE NOW AND RETURN ONLY THE JSON:"
    return base


# ============================================================
# CLOUD ANALYZER (Gemini primary + secondary key rotation)
# ============================================================

class CloudAnalyzer:
    def __init__(self):
        self.primary_key = os.getenv("GEMINI_API_KEY")
        self.secondary_key = os.getenv("GEMINI_API_KEY_2")
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.model_name = "gemini-2.0-flash"  # upgraded from 1.5-flash

        self._primary_client = None
        self._secondary_client = None

        self._init_gemini()

    def _init_gemini(self):
        """Initialise both Gemini clients."""
        try:
            from google import genai
            if self.primary_key:
                self._primary_client = genai.Client(api_key=self.primary_key)
                logger.info("Gemini primary client initialised (KEY_1)")
            if self.secondary_key:
                self._secondary_client = genai.Client(api_key=self.secondary_key)
                logger.info("Gemini secondary client initialised (KEY_2)")
        except Exception as e:
            logger.error(f"Gemini init failed: {e}")

    # ----------------------------------------------------------
    # PUBLIC ENTRY POINT
    # ----------------------------------------------------------

    def get_analysis(self, image_path: str, insurance_data: Optional[Any] = None) -> Dict[str, Any]:
        """
        Try Gemini (primary key) → Gemini (secondary key) → Groq → mock.
        Returns a standardised analysis dict.
        """
        prompt = build_vehicle_damage_prompt(insurance_data)

        # 1. Gemini primary
        if self._primary_client:
            result = self._call_gemini(self._primary_client, image_path, prompt, key_label="KEY_1")
            if result:
                return result

        # 2. Gemini secondary
        if self._secondary_client:
            logger.warning("Primary Gemini key failed – trying secondary KEY_2")
            result = self._call_gemini(self._secondary_client, image_path, prompt, key_label="KEY_2")
            if result:
                return result

        # 3. Groq vision fallback
        if self.groq_key:
            logger.warning("Both Gemini keys failed – trying Groq vision")
            result = self._call_groq(image_path, prompt)
            if result:
                return result

        # 4. Final mock fallback
        logger.error("All AI backends failed – returning mock result")
        return self._mock_analysis(insurance_data)

    # ----------------------------------------------------------
    # GEMINI CALL
    # ----------------------------------------------------------

    def _call_gemini(self, client, image_path: str, prompt: str, key_label: str) -> Optional[Dict]:
        """Call a single Gemini client and return parsed result or None."""
        try:
            from google.genai import types
            with open(image_path, "rb") as f:
                img_data = f.read()

            # Detect mime type from extension
            ext = image_path.lower().split(".")[-1]
            mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

            image_part = types.Part.from_bytes(data=img_data, mime_type=mime)

            response = client.models.generate_content(
                model=self.model_name,
                contents=[prompt, image_part],
                config=types.GenerateContentConfig(
                    temperature=0.1,         # low temperature = deterministic, factual
                    max_output_tokens=2048,
                )
            )

            raw = response.text.strip()
            parsed = self._parse_json(raw)
            if parsed is not None:
                logger.info(f"Gemini {key_label} analysis successful")
                return self._normalise(parsed)
            logger.warning(f"Gemini {key_label} returned non-JSON: {raw[:200]}")
            return None

        except Exception as e:
            logger.error(f"Gemini {key_label} error: {e}")
            return None

    # ----------------------------------------------------------
    # GROQ VISION CALL
    # ----------------------------------------------------------

    def _call_groq(self, image_path: str, prompt: str) -> Optional[Dict]:
        """Call Groq vision API (llama-4-scout or llama-3.2-90b-vision)."""
        try:
            from groq import Groq

            client = Groq(api_key=self.groq_key)

            with open(image_path, "rb") as f:
                img_bytes = f.read()
            img_b64 = base64.b64encode(img_bytes).decode("utf-8")

            ext = image_path.lower().split(".")[-1]
            mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
            data_url = f"data:{mime};base64,{img_b64}"

            response = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",  # Groq vision model
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=2048,
            )

            raw = response.choices[0].message.content.strip()
            parsed = self._parse_json(raw)
            if parsed is not None:
                logger.info("Groq vision analysis successful")
                return self._normalise(parsed)
            logger.warning(f"Groq returned non-JSON: {raw[:200]}")
            return None

        except Exception as e:
            logger.error(f"Groq vision error: {e}")
            return None

    # ----------------------------------------------------------
    # HELPERS
    # ----------------------------------------------------------

    def _parse_json(self, text: str) -> Optional[Dict]:
        """Strip markdown fences and parse JSON robustly."""
        # Strip ```json ... ``` or ``` ... ```
        if "```" in text:
            parts = text.split("```")
            # Take the first fenced block content
            for i, part in enumerate(parts):
                if i % 2 == 1:  # odd indices are inside fences
                    clean = part.strip()
                    if clean.startswith("json"):
                        clean = clean[4:].strip()
                    try:
                        return json.loads(clean)
                    except json.JSONDecodeError:
                        continue
        # Try the whole text
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try extracting first {...} block
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
        return None

    def _normalise(self, data: Dict) -> Dict:
        """
        Ensure the response always has the fields main.py expects:
        damages, confidence, totalEstimatedCost, recommendations, repairTimeEstimate.
        """
        damages = data.get("damages", [])

        # Normalise each damage item to match the expected schema keys
        normalised_damages = []
        for dmg in damages:
            normalised_damages.append({
                "part": dmg.get("part", dmg.get("partIdentified", "Unknown Part")),
                "damageType": dmg.get("damageType", "scratch"),
                "confidence": float(dmg.get("confidence", dmg.get("confidenceScore", 0.7))),
                "severity": dmg.get("severity", "minor"),
                "estimatedCost": float(dmg.get("estimatedCost", 0)),
                "boundingBox": dmg.get("boundingBox", {"x": 0, "y": 0, "width": 0, "height": 0}),
                "description": dmg.get("description", ""),
            })

        total = data.get("totalEstimatedCost", sum(d["estimatedCost"] for d in normalised_damages))
        confidence = float(data.get("confidence", 0.75 if normalised_damages else 0.0))

        return {
            "damages": normalised_damages,
            "confidence": confidence,
            "totalEstimatedCost": float(total),
            "overallSeverity": data.get("overallSeverity", "minor"),
            "recommendations": data.get("recommendations", "Claim assessment complete."),
            "repairTimeEstimate": data.get("repairTimeEstimate", "3-5 days"),
            "fraudFlags": data.get("fraudFlags", []),
            "isVehicleImage": data.get("isVehicleImage", True),
        }

    def _mock_analysis(self, insurance_data: Optional[Any] = None) -> Dict:
        """Last-resort mock — clearly labelled so you know it fired."""
        price_mult = (insurance_data.vehiclePriceLakhs / 10.0) if insurance_data else 1.0
        cost = int(5000 * max(1.0, price_mult))
        return {
            "damages": [
                {
                    "part": "Front Bumper",
                    "damageType": "dent",
                    "confidence": 0.70,
                    "severity": "moderate",
                    "estimatedCost": cost,
                    "boundingBox": {"x": 50, "y": 100, "width": 200, "height": 150},
                    "description": "Mock result — AI service unavailable",
                }
            ],
            "confidence": 0.70,
            "totalEstimatedCost": float(cost),
            "overallSeverity": "moderate",
            "recommendations": "AI service temporarily unavailable. Manual review required.",
            "repairTimeEstimate": "3-5 days",
            "fraudFlags": [],
            "isVehicleImage": True,
        }