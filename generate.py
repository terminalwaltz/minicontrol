import json
import os

# Load source JSON
with open('parameters.json', 'r') as f:
    parameters = json.load(f)

# Load sysex name map, fallback to empty dict if file not found
sysex_name_map = {}
if os.path.exists('sysex_name_map.json'):
    with open('sysex_name_map.json', 'r') as f:
        sysex_name_map = json.load(f)

# Create a mapping of parameter names to sysex_adress for each group
name_to_sysex = {}
for group_name, params in parameters.items():
    if group_name == 'sysex_name_map':
        continue
    name_to_sysex[group_name] = {param['name']: param['sysex_adress'] for param in params}

# Define desired order of parameter groups
group_order = [
    'global_parameter',
    'chord_parameter',
    'harp_parameter',
    'chord_potentiometer',
    'harp_potentiometer',
    'modulation_potentiometer',
    'sharp_button_parameter',
    'rhythm_parameter'
]

# Define subgroup order for each group
subgroup_order = {
    'global_parameter': ['General', 'Effects'],
    'chord_parameter': ['General', 'Oscillator', 'Envelope', 'Low pass filter', 'Tremolo', 'Vibrato', 'Delay', 'Reverb', 'Crunch', 'Output filter'],
    'harp_parameter': ['General', 'Oscillator', 'Transient', 'Envelope', 'Low pass filter', 'Tremolo', 'Vibrato', 'Delay', 'Reverb', 'Crunch', 'Output filter'],
    'chord_potentiometer': ['Potentiometer'],
    'harp_potentiometer': ['Potentiometer'],
    'modulation_potentiometer': ['Potentiometer'],
    'sharp_button_parameter': ['General'],
    'rhythm_parameter': ['Rhythm']
}

# Define parameter order by name within each subgroup
parameter_name_order = {
    'rhythm_parameter': {
        'Rhythm': [
            'default_bpm',
            'cycle length',
            'measure update',
            'shuffle value',
            'note pushed duration',
            'rythm pattern'  # Covers SysEx 220–235 (grid)
        ]
    },
    'global_parameter': {
        'General': ['bank color', 'led attenuation', 'transpose'],
        'Effects': ['pan', 'reverb size', 'reverb high damping', 'reverb low damping', 'reverb low pass', 'reverb diffusion']
    },
    'chord_parameter': {
        'General': [
            'octave change',
            'chord frame shift',
            'key selection',
            'barry harris mode',
            'retrigger chords',
            'chord shuffling',
            'slash level',
            'inter-note delay',
            'random note delay'
        ],
        'Delay': [
            'delay length',
            'delay filter frequency',
            'delay filter resonance',
            'delay lowpass',
            'delay bandpass',
            'delay highpass',
            'dry mix',
            'delay mix'
        ],
        'Reverb': ['reverb level'],
        'Crunch': ['crunch level', 'crunch type'],
        'Oscillator': [
            'waveform 1',
            'amplitude 1',
            'frequency multiplier 1',
            'waveform 2',
            'amplitude 2',
            'frequency multiplier 2',
            'waveform 3',
            'amplitude 3',
            'frequency multiplier 3',
            'noise',
            'first note',
            'second note',
            'third note',
            'fourth note'
        ],
        'Envelope': ['attack', 'hold', 'decay', 'sustain', 'release', 'retrigger release'],
        'Low pass filter': [
            'base frequency',
            'keytrack value',
            'resonance',
            'attack',
            'hold',
            'decay',
            'sustain',
            'release',
            'retrigger release',
            'LFO waveform',
            'LFO frequency',
            'LFO amplitude',
            'filter sensitivity'
        ],
        'Tremolo': ['waveform', 'frequency', 'keytrack value', 'amplitude'],
        'Vibrato': ['waveform', 'frequency', 'keytrack value', 'amplitude']
    },
    'harp_parameter': {
        'General': [
            'string mode',
            'string tuning',
            'octave change',
            'harp frame shift',
            'key selection',
            'barry harris mode',
            'retrigger harp',
            'harp shuffling'
        ],
        'Delay': [
            'delay length',
            'delay filter frequency',
            'delay filter resonance',
            'delay lowpass',
            'delay bandpass',
            'delay highpass',
            'dry mix',
            'delay mix'
        ],
        'Reverb': ['reverb level'],
        'Crunch': ['crunch level', 'crunch type'],
        'Oscillator': ['waveform', 'frequency multiplier', 'amplitude', 'noise'],
        'Envelope': ['attack', 'decay', 'sustain', 'release', 'retrigger release'],
        'Low pass filter': [
            'base frequency',
            'keytrack value',
            'resonance',
            'attack',
            'hold',
            'decay',
            'sustain',
            'release',
            'retrigger release',
            'filter sensitivity'
        ],
        'Transient': ['waveform', 'amplitude', 'note level', 'attack', 'hold', 'decay'],
        'Tremolo': ['waveform', 'frequency', 'amplitude'],
        'Vibrato': [
            'waveform',
            'frequency',
            'amplitude',
            'attack',
            'hold',
            'decay',
            'sustain',
            'release',
            'retrigger release',
            'pitch bend',
            'attack bend',
            'hold bend',
            'decay bend',
            'retrigger release bend',
            'intensity'
        ],
        'Output filter': [
            'frequency',
            'resonance',
            'lowpass',
            'bandpass',
            'highpass',
            'LFO waveform',
            'LFO frequency',
            'LFO amplitude',
            'filter LFO sensitivity',
            'output amplifier'
        ]
    },
    'chord_potentiometer': {
        'Potentiometer': ['chord alternate control', 'chord alternate range']
    },
    'harp_potentiometer': {
        'Potentiometer': ['harp alternate control', 'harp alternate percent range']
    },
    'modulation_potentiometer': {
        'Potentiometer': [
            'mod main control',
            'mod main percent range',
            'mod alternate control',
            'mod alternate percent range'
        ]
    },
    'sharp_button_parameter': {
        'General': ['sharp function']
    }
}

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
        display_value = (default_value / float_multiplier) if data_type == 'float' else default_value
        display_value_str = f"{display_value:.2f}" if data_type == 'float' else str(display_value)
        slider_value = default_value * float_multiplier if data_type == 'float' else default_value
        html.append(f'''
            <div style="display: flex; align-items: center; margin: 8px 0;">
                <label for="param-{sysex_address}" style="width: 150px; font-weight: bold;">{name}</label>
                <input type="range" id="param-{sysex_address}" name="{name}"
                       min="{min_value * float_multiplier}" max="{max_value * float_multiplier}" 
                       step="{0.01 * float_multiplier if data_type == 'float' else 1}" 
                       value="{slider_value}"
                       {"data-discrete='true'" if ui_type == 'discrete_slider' else ''}
                       {' '.join(attrs)}
                       style="width: 150px; margin: 0 8px;">
                <input type="number" id="value-{sysex_address}" 
                       value="{display_value_str}"
                       min="{min_value}" max="{max_value}" step="{0.01 if data_type == 'float' else 1}"
                       style="width: 50px; text-align: right; border: none; padding: 2px;">
            </div>
        ''')
    elif ui_type == 'select':
        if 'options' in param:
            options_html = ''.join([
                f'<option value="{opt["value"]}">{opt["label"]}</option>'
                for opt in param.get('options', [])
            ])
        else:
            option_addresses = param.get('option_addresses', list(sysex_name_map.keys()))
            options_html = ''.join([
                f'<option value="{key}">{value}</option>'
                for key, value in sorted(sysex_name_map.items(), key=lambda x: x[1].lower())
                if key in option_addresses
            ])
        html.append(f'''
            <div style="display: flex; align-items: center; margin: 8px 0;">
                <label for="param-{sysex_address}" style="width: 150px; font-weight: bold;">{name}</label>
                <select id="param-{sysex_address}" name="{name}" {' '.join(attrs)}
                        style="width: 150px; padding: 5px; margin: 0 8px;">
                    {options_html}
                </select>
            </div>
        ''')
    elif ui_type == 'switch':
        html.append(f'''
            <div style="display: flex; align-items: center; margin: 8px 0;">
                <label for="param-{sysex_address}" style="width: 150px; font-weight: bold;">{name}</label>
                <input type="checkbox" id="param-{sysex_address}" name="{name}"
                       {'checked' if default_value else ''} {' '.join(attrs)}
                       style="margin: 0 8px;">
            </div>
        ''')
    return '\n'.join(html)

# Generate rhythm grid HTML
def generate_rhythm_grid_html():
    rhythm_params = [p for p in parameters.get('rhythm_parameter', []) if 220 <= p['sysex_adress'] <= 235]
    if not rhythm_params:
        return ''
    html = ['<div style="display: grid; grid-template-columns: repeat(16, 15px); gap: 5px; margin: 10px 0;">']
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

# Generate HTML for parameter controls with group headers
def generate_details_html(group_name, params):
    grouped_params = {}
    for param in params:
        param_group = param['group']
        if param_group == 'hidden':
            continue
        if param_group not in grouped_params:
            grouped_params[param_group] = []
        grouped_params[param_group].append(param)
    
    param_html = []
    # Use defined subgroup order or fallback to sorted
    ordered_subgroups = subgroup_order.get(group_name, sorted(grouped_params.keys()))
    for param_group in ordered_subgroups:
        if param_group not in grouped_params:
            continue
        # Convert name-based order to sysex_adress order
        name_order = parameter_name_order.get(group_name, {}).get(param_group, [])
        param_order = [
            name_to_sysex[group_name][name]
            for name in name_order
            if name in name_to_sysex[group_name]
        ]
        # Special handling for rhythm pattern (SysEx 220–235)
        if group_name == 'rhythm_parameter' and param_group == 'Rhythm':
            rhythm_pattern_sysex = [p['sysex_adress'] for p in params if p['name'] == 'rythm pattern']
            param_order.extend(rhythm_pattern_sysex)
        # Sort parameters by defined order or fallback to sysex_adress
        sorted_params = sorted(
            grouped_params[param_group],
            key=lambda p: param_order.index(p['sysex_adress']) if p['sysex_adress'] in param_order else len(param_order) + p['sysex_adress']
        )
        param_html.append(f'<h3 style="margin: 30px 0 10px; font-size: 1.5em;">{param_group}</h3>')
        param_html.extend([generate_param_html(param) for param in sorted_params])
    
    if not param_html:
        return ''
    
    display_name = group_name.replace('_parameter', '').replace('_', ' ').title() + ' Parameters'
    return f'''
        <details style="width: fit-content; margin: 20px 0; padding: 8px; border: none; border-radius: 5px;">
            <summary style="width: fit-content; font-size: 1.6em; font-weight: bold; cursor: pointer;">{display_name}</summary>
            <div style="padding: 10px;">
                {''.join(param_html)}
            </div>
        </details>
    '''

# Define HTML template
html_template = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Minichord UI</title>
  <style>
    :root {{
      --primary-color: hsl(0, 70%, 50%);
      --text-color: #ffffff;
    }}
    body {{
      font-family: Arial, sans-serif;
      margin: 20px;
      background-color: hsl(var(--primary-color-hue, 0), 10%, 95%);
    }}
    .status-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: hsl(var(--primary-color-hue, 0), 10%, 95%);
      color: #333;
      padding: 10px;
      border-radius: 5px;
    }}
    .connection-status {{
      display: flex;
      align-items: center;
    }}
    #dot {{
      margin-left: 2px;
      margin-right: 4px;
      font-size: 1.2em;
      color: green;
    }}
    .disconnected #dot {{
      color: red;
    }}
    #notification-bubble {{
      padding: 4px 10px;
      background: green;
      color: #fff;
      border: 1px solid #fff;
      border-radius: 12px;
      font-size: 0.9em;
      font-weight: 500;
      display: none;
    }}
    .connected #notification-bubble {{
      background: green;
      border: 1px solid #fff;
    }}
    .disconnected #notification-bubble {{
      background: red;
      border: 1px solid #fff;
    }}
    #header {{
      margin: 20px 0;
      padding: 10px;
      background-color: hsl(var(--primary-color-hue, 0), 10%, 95%);
      border-radius: 5px;
    }}
    .section {{
      margin-bottom: 10px;
    }}
    .controls {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }}
    .button_div {{
      margin-right: 10px;
    }}
    button {{
      padding: 8px;
      border: none;
      border-radius: 5px;
      background-color: var(--primary-color);
      color: var(--text-color);
      cursor: pointer;
    }}
    button:hover {{
      background-color: hsl(var(--primary-color-hue, 0), 70%, 45%);
    }}
    #bank_number_selection {{
      padding: 8px;
      border: none;
      border-radius: 5px;
      background-color: var(--primary-color);
      color: var(--text-color);
      cursor: pointer;
    }}
    #bank_number_selection:hover {{
      background-color: hsl(var(--primary-color-hue, 0), 70%, 40%);
    }}
    input[type="range"] {{
      -webkit-appearance: none;
      width: 150px;
      height: 6px;
      border-radius: 5px;
      background: linear-gradient(to right, var(--primary-color, hsl(0, 70%, 50%)) 0%, var(--primary-color, hsl(0, 70%, 50%)) 0%, #ccc 0%, #ccc 100%);
      outline: none;
    }}
    input[type="range"]::-webkit-slider-thumb {{
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary-color);
      cursor: pointer;
    }}
    input[type="range"]::-moz-range-track {{
      height: 6px;
      border-radius: 5px;
      background: linear-gradient(to right, var(--primary-color, hsl(0, 70%, 50%)) 0%, var(--primary-color, hsl(0, 70%, 50%)) 0%, #ccc 0%, #ccc 100%);
    }}
    input[type="range"]::-moz-range-thumb {{
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary-color);
      cursor: pointer;
    }}
    a {{
      color: var(--primary-color);
      text-decoration: none;
    }}
    a:hover {{
      text-decoration: underline;
    }}
    details summary:hover {{
      color: var(--primary-color);
    }}
    input[type="text"][readonly] {{
      border: none;
      background: transparent;
    }}
    /* Default single-column layout for smartphones */
    #parameters {{
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }}
    details {{
      width: 100%;
      margin: 0;
      padding: 8px;
      border: none;
      border-radius: none;
      box-sizing: border-box;
    }}
    /* Three-column grid layout for larger screens */
    @media screen and (min-width: 768px) {{
      #parameters {{
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 30px;
        width: 100%;
        max-width: 1600px; /* Increased for wider layout */
        margin: 0 auto;
      }}
      details {{
        width: 100%;
        max-width: 450px; /* Increased to reduce squishing */
        margin: 0;
        padding: 8px;
        box-sizing: border-box;
        overflow-x: auto; /* Allow scrolling for wide content */
      }}
      /* Fallback for older browsers */
      @supports not (display: grid) {{
        #parameters {{
          display: flex;
          flex-wrap: wrap;
          gap: 30px;
        }}
        details {{
          flex: 1 1 calc(33.33% - 30px);
          max-width: 400px; /* Match grid max-width */
          box-sizing: border-box;
        }}
      }}
    }}
  </style>
</head>
<body>
  <div id="container" style="max-width: 100vw; margin: 0 auto;">
    <div class="status-header">
      <h1>minicontrol</h1>
      <div id="connection-status" class="connection-status disconnected">
        <span id="dot">●</span>
        <span id="notification-bubble"></span>
      </div>
    </div>
    <div id="header">
      <div class="section">
        <h5 style="margin: 0; font-size: 1.5em;">saving:</h5>
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
        <h5 style="margin: 0; font-size: 1.5em;">sharing:</h5>
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
        <h5 style="margin: 0; font-size: 1.5em;">resetting:</h5>
      </div>
      <div class="controls">
        <div class="button_div">
          <button id="reset-bank-btn">reset bank</button>
        </div>
        <div class="button_div">
          <button id="reset-all-banks-btn">reset all banks</button>
        </div>
      </div>
      <div class="section">
        <h5 style="margin: 0; font-size: 1.5em;">randomising:</h5>
      </div>
      <div class="controls">
        <div class="button_div">
          <button id="randomise_btn">randomise</button>
        </div>
      </div>
    </div>
    <details>
      <summary style="width: fit-content; font-size: 1.6em; font-weight: bold; cursor: pointer;">Connection instruction</summary>
      <ul style="padding-left: 20px;">
        <li>provide the system authorization for MIDI control</li>
        <li>use a recent version of Chrome</li>
        <li>connect the minichord with a USB cable and make sure it is on.</li>
      </ul>
      <div tabindex="1" id="information_zone">
        <strong id="information_text"></strong>
      </div>
    </div>
    <div id="instruction_zone" style="margin: 20px 0;">
      For instruction on how to use this tool, please refer to the 
      <a href="../user_manual/#custom-presets">minichord documentation.</a><br><br>
      To test and load user-submitted presets, visit the 
      <a href="https://minichord.com/minicontrol/minishop.html">minishop.</a>
    </div>
    <div id="parameters">
      {parameter_sections}
    </div>
  </div>
  <script src="minichordcontroller.js"></script>
  <script src="index.js"></script>
</body>
</html>
'''

# Generate parameter sections in specified order
parameter_sections = []
for group_name in group_order:
    if group_name not in parameters or group_name == 'sysex_name_map' or group_name == 'hidden':
        continue
    params = parameters[group_name]
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
                # Use defined subgroup order for rhythm_parameter
                ordered_subgroups = subgroup_order.get(group_name, sorted(grouped_rhythm_params.keys()))
                for param_group in ordered_subgroups:
                    if param_group not in grouped_rhythm_params:
                        continue
                    # Convert name-based order to sysex_adress order
                    name_order = parameter_name_order.get(group_name, {}).get(param_group, [])
                    param_order = [
                        name_to_sysex[group_name][name]
                        for name in name_order
                        if name in name_to_sysex[group_name]
                    ]
                    sorted_params = sorted(
                        grouped_rhythm_params[param_group],
                        key=lambda p: param_order.index(p['sysex_adress']) if p['sysex_adress'] in param_order else len(param_order) + p['sysex_adress']
                    )
                    param_html.append(f'<h3 style="margin: 30px 0 10px; font-size: 1.5em;">{param_group}</h3>')
                    param_html.extend([generate_param_html(param) for param in sorted_params])
            if rhythm_params:
                param_html.append('<h3 style="margin: 30px 0 10px; font-size: 1.5em;">Rhythm Pattern</h3>')
                param_html.append(generate_rhythm_grid_html())
            parameter_sections.append(f'''
                <details style="width: fit-content; margin: 20px 0; padding: 8px; border: none; border-radius: 5px;">
                    <summary style="width: fit-content; font-size: 1.6em; font-weight: bold; cursor: pointer;">Rhythm Parameters</summary>
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

# Define sysex_handler_template with escaped braces
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

print("Generated index.html and sysex_handler.h")