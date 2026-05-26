"""Quick test: send a request to the Python bg_remover service."""
import json, urllib.request, os

input_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'test-signature.png'))
output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads', 'signatures', 'processed', 'test-output.png'))

data = json.dumps({"input_path": input_path, "output_path": output_path}).encode()
req = urllib.request.Request("http://localhost:5001/remove-bg", data=data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
        print("SUCCESS:", json.dumps(result, indent=2))
except Exception as e:
    print("ERROR:", e)
