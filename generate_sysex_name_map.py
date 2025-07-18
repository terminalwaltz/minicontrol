import json

# Load parameters.json
with open('parameters.json', 'r') as f:
    parameters = json.load(f)

sysex_name_map = {}

# Loop through all top-level parameter groups
for group_name, params in parameters.items():
    if group_name in ('hidden'):
        continue
    for param in params:
        sysex = param.get('sysex_adress')
        name = param.get('name')
        if (
            isinstance(sysex, int) and
            20 <= sysex <= 219 and
            name and name.strip()
        ):
            readable_group = group_name.replace('_parameter', '')
            sysex_name_map[str(sysex)] = f"{readable_group}: {name}"

# Sort sysex_name_map by value (label) alphabetically
sorted_sysex_name_map = dict(sorted(sysex_name_map.items(), key=lambda x: x[1].lower()))

# Save to sysex_name_map.json
with open('sysex_name_map.json', 'w') as f:
    json.dump(sorted_sysex_name_map, f, indent=2)

print("Generated sysex_name_map.json")