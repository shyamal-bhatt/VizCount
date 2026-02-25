import requests
import os
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("GCP_FUNCTION_URL")

# Payload matches exactly what vizcount-sync-stream.py expects.
# Dates are Unix milliseconds (same as WatermelonDB).
data = {
    "scanned_items": [
        {
            "pid": 101,
            "sn": 5001,
            "name": "Test Watermelon",
            "best_before_date": 1750000000000,   # ms timestamp
            "packed_on_date":   1748000000000,   # ms timestamp
            "net_kg": 2.5,
            "count": 10
        }
    ],
    "sales_floor": [
        {
            "pid": 101,
            "name": "Test Watermelon",
            "count": 10,
            "weight": 25.0,
            "expiry_date": 1750000000000         # ms timestamp
        }
    ]
}

response = requests.post(URL, json=data)
print(f"Status:   {response.status_code}")
print(f"Raw body: {response.text}")
try:
    print(f"Response: {response.json()}")
except Exception:
    pass  # raw body above is enough