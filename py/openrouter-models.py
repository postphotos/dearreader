#!/usr/bin/env python3
"""
OpenRouter Models Checker

This script queries the OpenRouter API to list all available models,
including free models that can be used without API keys.

Requirements:
    uv pip install requests python-dotenv

Usage:
    uv run py/openrouter-models.py
"""

import os
import requests
import json
from typing import Dict, List, Any, Optional
import dotenv

# Load environment variables
dotenv.load_dotenv()

class OpenRouterAPI:
    """Simple wrapper for OpenRouter API"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENROUTER_API_KEY')
        self.base_url = "https://openrouter.ai/api/v1"
        self.headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    def get_models(self) -> Dict[str, Any]:
        """Get list of all available models"""
        url = f"{self.base_url}/models"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_auth_key_info(self) -> Optional[Dict[str, Any]]:
        """Get information about the authenticated user's key (if API key provided)"""
        if not self.api_key:
            return None

        url = f"{self.base_url}/key"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

def print_separator(title: str):
    """Print a nice separator"""
    print(f"\n{'='*80}")
    print(f" {title}")
    print('='*80)

def print_model_info(model: Dict[str, Any], index: int):
    """Print formatted model information"""
    model_id = model.get('id', 'Unknown')
    name = model.get('name', 'Unknown')
    description = model.get('description', '')

    # Pricing information
    pricing = model.get('pricing', {})
    prompt_price = pricing.get('prompt', 'N/A')
    completion_price = pricing.get('completion', 'N/A')

    # Context length
    context_length = model.get('context_length', 'N/A')

    # Check if it's a free model (no pricing or $0 pricing)
    is_free = (
        not pricing or
        (prompt_price in [0, '0', None] and completion_price in [0, '0', None])
    )

    status = "🆓 FREE" if is_free else "💰 PAID"

    print(f"\n{index:3d}. {status} {model_id}")
    print(f"    Name: {name}")
    if description:
        print(f"    Description: {description}")
    print(f"    Context Length: {context_length}")
    if pricing:
        print(f"    Pricing: ${prompt_price}/prompt, ${completion_price}/completion")

def categorize_models(models: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Categorize models by provider and free/paid status"""
    categories = {
        'free': [],
        'paid': []
    }

    for model in models:
        pricing = model.get('pricing', {})
        prompt_price = pricing.get('prompt', 'N/A')
        completion_price = pricing.get('completion', 'N/A')

        is_free = (
            not pricing or
            (prompt_price in [0, '0', None] and completion_price in [0, '0', None])
        )

        if is_free:
            categories['free'].append(model)
        else:
            categories['paid'].append(model)

    return categories

def main():
    """Main function"""
    print("🚀 OpenRouter Models Checker")
    print("="*80)

    # Initialize API client
    api = OpenRouterAPI()

    try:
        # Get models
        print("📡 Fetching available models from OpenRouter...")
        models_data = api.get_models()

        models = models_data.get('data', [])
        print(f"✅ Found {len(models)} models")

        # Categorize models
        categories = categorize_models(models)

        # Print free models
        print_separator("🆓 FREE MODELS (No API Key Required)")
        free_models = categories['free']
        if free_models:
            print(f"Found {len(free_models)} free models:")
            for i, model in enumerate(free_models, 1):
                print_model_info(model, i)
        else:
            print("No free models found.")

        # Print paid models (first 20)
        print_separator("💰 PAID MODELS (Require API Key)")
        paid_models = categories['paid']
        if paid_models:
            print(f"Found {len(paid_models)} paid models (showing first 20):")
            for i, model in enumerate(paid_models[:20], 1):
                print_model_info(model, i)

            if len(paid_models) > 20:
                print(f"\n... and {len(paid_models) - 20} more paid models")
        else:
            print("No paid models found.")

        # Get auth info if API key is provided
        auth_info = api.get_auth_key_info()
        if auth_info:
            print_separator("🔑 API KEY INFORMATION")
            print(json.dumps(auth_info, indent=2))
        else:
            print_separator("ℹ️  API KEY STATUS")
            print("No API key provided - only free models are accessible")
            print("To access paid models, set OPENROUTER_API_KEY environment variable")

        # Summary
        print_separator("📊 SUMMARY")
        print(f"Total Models: {len(models)}")
        print(f"Free Models: {len(categories['free'])}")
        print(f"Paid Models: {len(categories['paid'])}")

        if categories['free']:
            print(f"\n🆓 Free models you can use immediately:")
            for model in categories['free'][:5]:  # Show first 5
                print(f"  • {model.get('id')} - {model.get('name', 'Unknown')}")

    except requests.RequestException as e:
        print(f"❌ Error: {e}")
        print("\n💡 Make sure you have an internet connection.")
        if "401" in str(e):
            print("   If you're getting authentication errors, check your OPENROUTER_API_KEY")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()