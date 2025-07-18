import json

# Load source JSON
with open('parameters.json', 'r') as f:
    parameters = json.load(f)

# Generate HTML for parameter controls
def generate_param_html(param):
    html = []
    sysex_address = param['sysex_adress']
    name = param['name']
    ui_type = param.get('ui_type', 'hidden')
    tooltip = param.get('tooltip', name)
    data_type = param.get('data_type', 'int')
    min_value = param.get('min_value', 0)
    max_value = param.get('max_value', 1)
    step = param.get('step', 0.01 if data_type == 'float' else 1)
    default_value = param.get('default_value', 0)
    float_multiplier = param.get('float_multiplier', 100.0 if data_type == 'float' else 1)

    # Add metadata for special cases
    attrs = [
        f'data-sysex-address="{sysex_address}"',
        f'data-ui-type="{ui_type}"',
        f'data-data-type="{data_type}"',
        f'data-float-multiplier="{float_multiplier}"',
        f'title="{tooltip}"'
    ]
    if 'special_handling' in param:
        attrs.append(f'data-special-handling="{param["special_handling"]}"')
    if 'dependent_addresses' in param:
        attrs.append(f'data-dependent-addresses="{json.dumps(param["dependent_addresses"])}"')
    if 'rhythm_step' in param:
        attrs.append(f'data-rhythm-step="{param["rhythm_step"]}"')

    if ui_type == 'slider' or ui_type == 'discrete_slider':
        # Compute display value based on data type
        display_value = (default_value / float_multiplier) if data_type == 'float' else default_value
        display_value_str = f"{display_value:.2f}" if data_type == 'float' else str(display_value)
        slider_value = default_value * float_multiplier if data_type == 'float' else default_value
        html.append(f'''
            <div style="display: flex; align-items: center; margin: 10px 0;">
                <label for="param-{sysex_address}" style="width: 200px; font-weight: bold;">{name}</label>
                <input type="range" id="param-{sysex_address}" name="{name}"
                       min="{min_value * float_multiplier}" max="{max_value * float_multiplier}" 
                       step="{0.01 * float_multiplier if data_type == 'float' else 1}" 
                       value="{slider_value}"
                       {"data-discrete='true'" if ui_type == 'discrete_slider' else ''}
                       {' '.join(attrs)}
                       style="flex: 1; margin: 0 10px;">
                <input type="text" readonly id="value-{sysex_address}" 
                       value="{display_value_str}"
                       style="width: 60px; text-align: right; border: none; background: transparent;">
            </div>
        ''')
    elif ui_type == 'select':
        options_html = ''.join([
            f'<option value="{opt["value"]}">{opt["label"]}</option>'
            for opt in param.get('options', [])
        ])
        html.append(f'''
            <div style="display: flex; align-items: center; margin: 10px 0;">
                <label for="param-{sysex_address}" style="width: 200px; font-weight: bold;">{name}</label>
                <select id="param-{sysex_address}" name="{name}" {' '.join(attrs)}
                        style="flex: 1; padding: 5px; margin: 0 10px;">
                    {options_html}
                </select>
            </div>
        ''')
    elif ui_type == 'switch':
        html.append(f'''
            <div style="display: flex; align-items: center; margin: 10px 0;">
                <label for="param-{sysex_address}" style="width: 200px; font-weight: bold;">{name}</label>
                <input type="checkbox" id="param-{sysex_address}" name="{name}"
                       {'checked' if default_value else ''} {' '.join(attrs)}
                       style="margin: 0 10px;">
            </div>
        ''')
    return '\n'.join(html)

# Generate rhythm grid HTML
def generate_rhythm_grid_html():
    rhythm_params = [p for p in parameters.get('rhythm_parameter', []) if 220 <= p['sysex_adress'] <= 235]
    if not rhythm_params:
        return ''
    html = ['<div style="display: grid; grid-template-columns: repeat(16, 40px); gap: 5px; margin: 10px 0;">']
    for step in range(16):
        html.append(f'<div style="display: flex; flex-direction: column; align-items: center;">')
        for voice in range(7):
            sysex_address = 220 + step
            html.append(f'''
                <input type="checkbox" id="rhythm-checkbox-{step}-{voice}"
                       data-sysex-address="{sysex_address}" data-rhythm-step="{step}"
                       data-voice="{voice}" style="margin: 2px;">
            ''')
        html.append('</div>')
    html.append('</div>')
    return '\n'.join(html)

# Generate HTML for parameter drop-downs with group headers
def generate_details_html(group_name, params):
    grouped_params = {}
    for param in params:
        param_group = param['group']
        if param_group not in grouped_params:
            grouped_params[param_group] = []
        grouped_params[param_group].append(param)
    
    param_html = []
    for param_group, group_params in sorted(grouped_params.items()):
        param_html.append(f'<h3 style="margin: 10px 0; font-size: 1.1em;">{param_group}</h3>')
        param_html.extend([generate_param_html(param) for param in group_params])
    
    if not param_html:
        return ''
    
    display_name = group_name.replace('_parameter', '').replace('_', ' ').title() + ' Parameters'
    return f'''
        <details style="margin: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
            <summary style="font-size: 1.2em; font-weight: bold; cursor: pointer;">{display_name}</summary>
            <div style="padding: 10px;">
                {''.join(param_html)}
            </div>
        </details>
    '''

# Generate HTML
html_template = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Minichord UI</title>
  <style>
    :root {{
      --primary-color: hsl(0, 70%, 50%);
    }}
    body {{ font-family: Arial, sans-serif; margin: 20px; background-color: hsl(var(--primary-color-hue, 0), 10%, 95%); }}
    .status-header {{ display: flex; justify-content: space-between; align-items: center; background-color: #333; color: white; padding: 10px; border-radius: 5px; }}
    .connection-status {{ display: flex; align-items: center; }}
    #dot {{ margin-left: 5px; font-size: 1.2em; color: var(--primary-color); }}
    .disconnected #dot {{ color: red; }}
    #header {{ margin: 20px 0; padding: 10px; background-color: #e0e0e0; border-radius: 5px; }}
    .section {{ margin-bottom: 10px; }}
    .controls {{ display: flex; flex-wrap: wrap; gap: 10px; }}
    .button_div {{ margin-right: 10px; }}
    button, select {{ padding: 8px; border: none; border-radius: 5px; background-color: var(--primary-color); color: white; cursor: pointer; }}
    button:hover, select:hover {{ background-color: hsl(var(--primary-color-hue, 0), 70%, 40%); }}
    input[type="range"] {{
      background: linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) 50%, #ccc 50%, #ccc 100%);
    }}
    a {{ color: var(--primary-color); text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    details summary:hover {{ color: var(--primary-color); }}
    input[type="text"][readonly] {{ border: none; background: transparent; }}
  </style>
</head>
<body>
  <div class="status-header">
    <h1>minicontrol</h1>
    <div id="connection-status" class="connection-status disconnected">
      <span id="dot">●</span>
    </div>
  </div>
  <div id="header">
    <div class="section">
      <h5 style="margin: 0; font-size: 1.1em;">saving:</h5>
    </div>
    <div class="controls">
      <div class="button_div">
        <div class="select_container">
          <span style="margin-right: 5px;">target bank:</span>
          <select id="bank_number_selection">
            <option value="0">1</option>
            <option value="1">2</option>
            <option value="2">3</option>
            <option value="3">4</option>
            <option value="4">5</option>
            <option value="5">6</option>
            <option value="6">7</option>
            <option value="7">8</option>
            <option value="8">9</option>
            <option value="9">10</option>
            <option value="10">11</option>
            <option value="11">12</option>
          </select>
        </div>
      </div>
      <div class="button_div">
        <button id="save-to-bank-btn">save to bank</button>
      </div>
    </div>
    <div class="section">
      <h5 style="margin: 0; font-size: 1.1em;">sharing:</h5>
    </div>
    <div class="controls">
      <div class="button_div">
        <button id="export-settings-btn">export settings</button>
      </div>
      <div class="button_div">
        <button id="load-settings-btn">load settings</button>
      </div>
    </div>
    <div class="section">
      <h5 style="margin: 0; font-size: 1.1em;">resetting:</h5>
    </div>
    <div class="controls">
      <div class="button_div">
        <button id="reset-bank-btn">reset bank</button>
      </div>
      <div class="button_div">
        <button id="reset-all-banks-btn">reset all banks</button>
      </div>
    </div>
  </div>
  <details>
    <summary style="font-size: 1.2em; font-weight: bold; cursor: pointer;">Connection instruction</summary>
    <ul style="padding-left: 20px;">
      <li>provide the system authorization for MIDI control</li>
      <li>use a recent version of Chrome</li>
      <li>connect the minichord with a USB cable and make sure it is on.</li>
    </ul>
    <div tabindex="1" id="information_zone">
      <strong id="information_text"></strong>
    </div>
  </details>
  <div id="instruction_zone" style="margin: 20px 0;">
    For instruction on how to use this tool, please refer to the 
    <a href="../user_manual/#custom-presets">minichord documentation.</a><br><br>
    To test and load user-submitted presets, visit the 
    <a href="https://minichord.com/minicontrol/minishop.html">minishop.</a>
  </div>
  <div id="parameters">
    {parameter_sections}
  </div>
  <script src="minichordcontroller.js"></script>
  <script src="index.js"></script>
</body>
</html>
'''

# Generate parameter sections based on JSON dictionary keys, excluding "hidden"
parameter_sections = []
for group_name, params in parameters.items():
    if group_name == 'sysex_name_map' or group_name == 'hidden':
        continue
    if group_name == 'rhythm_parameter':
        rhythm_params = [p for p in params if 220 <= p['sysex_adress'] <= 235]
        other_rhythm_params = [p for p in params if p['sysex_adress'] < 220 or p['sysex_adress'] > 235]
        if rhythm_params or other_rhythm_params:
            param_html = []
            if other_rhythm_params:
                grouped_rhythm_params = {}
                for param in other_rhythm_params:
                    param_group = param['group']
                    if param_group not in grouped_rhythm_params:
                        grouped_rhythm_params[param_group] = []
                    grouped_rhythm_params[param_group].append(param)
                param_html.append('<h3 style="margin: 10px 0; font-size: 1.1em;">Rhythm Settings</h3>')
                for param_group, group_params in sorted(grouped_rhythm_params.items()):
                    param_html.extend([generate_param_html(param) for param in group_params])
            if rhythm_params:
                param_html.append('<h3 style="margin: 10px 0; font-size: 1.1em;">Rhythm Pattern</h3>')
                param_html.append(generate_rhythm_grid_html())
            parameter_sections.append(f'''
                <details style="margin: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
                    <summary style="font-size: 1.2em; font-weight: bold; cursor: pointer;">Rhythm Parameters</summary>
                    <div style="padding: 10px;">
                        {''.join(param_html)}
                    </div>
                </details>
            ''')
    else:
        parameter_sections.append(generate_details_html(group_name, params))

# Insert into HTML
html_content = html_template.format(
    parameter_sections=''.join(parameter_sections)
)

# Write to index.html
with open('index.html', 'w') as f:
    f.write(html_content)

print("Generated index.html")
""" # Define sysex_handler_template with escaped braces
sysex_handler_template = '''#ifndef SYSEX_HANDLER_H
#define SYSEX_HANDLER_H

void apply_audio_parameter(int adress, int value) {{
    switch(adress) {{
{switch_cases}
        default:
            break;
    }}
}}

#endif // SYSEX_HANDLER_H
'''

# Generate switch cases
switch_cases = []
for group_name, param_list in parameters.items():
    if group_name == 'sysex_name_map':
        continue
    for param in param_list:
        sysex_address = param['sysex_adress']
        method = param.get('method', '')
        if not method:
            continue
        # Apply scaling for float parameters
        if param.get('data_type') == 'float':
            method = method.replace('value', 'value/100.0')
        # Ensure method ends with semicolon
        method = method.rstrip(';') + ';'
        # Handle iteration if specified
        iterate = param.get('iterate', 1)
        switch_case = f'''
        case {sysex_address}:'''
        if iterate > 1:
            switch_case += f'''
            for (int i=0;i<{iterate};i++){{
                {method}
            }}'''
        else:
            switch_case += f'''
            {method}'''
        switch_case += '''
            break;'''
        switch_cases.append(switch_case)

# Sort switch cases by sysex_address for readability
switch_cases.sort(key=lambda x: int(x.split('case ')[1].split(':')[0]))

# Write to sysex_handler.h
with open('sysex_handler.h', 'w') as f:
    f.write(sysex_handler_template.format(switch_cases=''.join(switch_cases)))

print("Generated index.html and sysex_handler.h") """