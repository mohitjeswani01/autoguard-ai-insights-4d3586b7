# AutoGuard AI - Backend Setup Guide

## Overview
This is a complete FastAPI backend for the AutoGuard AI vehicle damage assessment system. It integrates YOLOv8 for local detection and Google Gemini for cloud-based fallback analysis.

## Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- Git
- Optional: NVIDIA GPU for faster YOLO inference

## Installation

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Linux/Mac:
source venv/bin/activate