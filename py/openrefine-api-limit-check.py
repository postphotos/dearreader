import os
import requests
import dotenv
from urllib.parse import quote
import json

dotenv.load_dotenv()

response = requests.get(

  url="https://openrouter.ai/api/v1/key",

  headers={

    "Authorization": f"Bearer {quote(os.getenv('OPENROUTER_API_KEY'))}"

  }

)

print(json.dumps(response.json(), indent=2))
response = requests.post(
  url="https://openrouter.ai/api/v1/key",
  headers={

    "Authorization": f"Bearer <OPENROUTER_API_KEY>"

  }

)

print(json.dumps(response.json(), indent=2))