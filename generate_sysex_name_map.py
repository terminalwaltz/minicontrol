import json

# Load parameters.json
with open('parameters.json', 'r') as f:
    parameters = json.load(f)

sysex_name_map = {}

# Loop only over real parameters in the JSON
for group, params in parameters.items():
    if group in ('sysex_name_map', 'hidden'):
        continue
    for param in params:
        sysex = param.get('sysex_adress')
        name = param.get('name')
        if (
            isinstance(sysex, int) and
            40 <= sysex <= 219 and
            name and name.strip()
        ):
            sysex_name_map[str(sysex)] = name

# Save to sysex_name_map.json
with open('sysex_name_map.json', 'w') as f:
    json.dump(sysex_name_map, f, indent=2)

print("Generated sysex_name_map.json")
