# backend/services/yolo_service.py (UPDATED WITH ERROR HANDLING)
from ultralytics import YOLO
import os
import logging

logger = logging.getLogger(__name__)

class LocalAnalyzer:
    def __init__(self):
        """Initialize YOLO model with error handling for corrupted files"""
        model_path = os.path.join("models", "damage_model.pt")
        self.model = None
        
        # Try to load custom model
        if os.path.exists(model_path):
            try:
                logger.info(f"Loading custom YOLO model from {model_path}")
                self.model = YOLO(model_path)
                logger.info("Custom YOLO model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load custom model: {str(e)}")
                logger.warning("Falling back to yolov8n.pt")
                self.model = None
        else:
            logger.warning(f"Custom model not found at {model_path}, using yolov8n.pt")
        
        # Load default model if custom failed
        if self.model is None:
            try:
                logger.info("Loading default yolov8n.pt model")
                self.model = YOLO("yolov8n.pt")
                logger.info("Default YOLO model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load default YOLO model: {str(e)}")
                raise RuntimeError("Could not initialize any YOLO model")

    def detect(self, image_path: str):
        """
        Run YOLO detection on an image.
        
        Args:
            image_path: Path to image file
            
        Returns:
            YOLO results object if detections found, None if confidence too low
        """
        try:
            if self.model is None:
                logger.error("YOLO model not initialized")
                return None
            
            results = self.model(image_path)[0]
            
            # Check if any detections with sufficient confidence
            if (
                not hasattr(results, 'boxes') or 
                results.boxes is None or 
                len(results.boxes) == 0 or 
                results.boxes.conf.max() < 0.4
            ):
                logger.warning(f"No detections or low confidence for {image_path}")
                return None
            
            logger.info(f"YOLO detection successful: {len(results.boxes)} objects")
            return results
            
        except Exception as e:
            logger.error(f"YOLO detection error: {str(e)}")
            return None