// Global variables to store the state of the MIDI controller interface
var parameters = null; // Holds parameter definitions loaded from parameters.json
var currentValues = {}; // Current parameter values for the active bank (e.g., { "32": 54 } for led attenuation = 0.54)
var controller = new MiniChordController(); // Instance of MiniChordController to handle MIDI communication
var tempValues = {}; // Temporary values for parameters being edited before saving (e.g., { "32": 54 })
var bankSettings = {}; // Stores settings for each bank (e.g., bankSettings[1] = { "32": 54, ... })
let currentBankNumber = -1; // Tracks the currently active bank (0-11, or -1 if none)
const bankNames = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]; // Names for banks 1-12
let defaultValues = {}; // Default parameter values from parameters.json
let originalPresetValues = {}; // Stores original values before editing in a modal
let isLoadingPreset = false; // Prevents multiple preset loads at once
let isInitializing = false; // Tracks if app is initializing
let midiResponseQueue = []; // Queue for processing MIDI responses from the device
let loadBankSettingsCount = 0; // Unused in current code (possibly for tracking load attempts)
let lastMidiProcessed = 0; // Unused in current code (possibly for throttling MIDI processing)
let openParamGroup = null; // Tracks which parameter group modal is open (e.g., "global_parameter")
let notificationTimeout = null; // Timer for clearing notification messages
let rhythmPattern = new Array(16).fill(0); // Stores rhythm data for 16 steps (sysex 220-235)
let lastUpdate = 0; // Tracks last UI update time for throttling
const updateInterval = 50; // Throttle UI updates to every 50ms

// Legacy global variables added for compatibility
let minichord_device = false; // Tracks device connection status (legacy)
let active_bank_number = -1; // Legacy tracking of active bank

const waveformSysexAddresses = [42, 122, 125, 128, 59, 62, 93, 152, 156, 160, 100]; // Waveform-related sysex from sysexNameMap

// Maps sysex addresses to human-readable parameter names for UI and logging
const sysexNameMap = {
//   10: "Chord Alternate Control (Global)",
//   11: "Chord Alternate Range (Global)",
//   12: "Harp Alternate Control (Global)",
//   13: "Harp Alternate Percent Range (Global)",
//   14: "Mod Main Control (Global)",
//   15: "Mod Main Percent Range (Global)",
//   16: "Mod Alternate Control (Global)",
//   17: "Mod Alternate Percent Range (Global)",
  20: "Bank Color (Global)",
  21: "Retrigger Chords (Global)",
  22: "Change Held Strings (Global)",
  23: "Slash Level (Global)",
  24: "Reverb Size (Global)",
  25: "Reverb High Damping (Global)",
  26: "Reverb Low Damping (Global)",
  27: "Reverb Low Pass (Global)",
  28: "Reverb Diffusion (Global)",
  29: "Pan (Global)",
  30: "Transpose (Global)",
  31: "Sharp Function (Global)",
  32: "LED Attenuation (Global)",
  33: "Barry Harris Mode (Global)",
  40: "Harp Harp Shuffling",
  41: "Harp Oscillator Amplitude",
  42: "Harp Oscillator Waveform",
  43: "Harp Envelope Attack",
  44: "Harp Envelope Hold",
  45: "Harp Envelope Decay",
  46: "Harp Envelope Sustain",
  47: "Harp Envelope Release",
  48: "Harp Envelope Retrigger Release",
  49: "Harp Low Pass Filter Base Frequency",
  50: "Harp Low Pass Filter Keytrack Value",
  51: "Harp Low Pass Filter Resonance",
  52: "Harp Low Pass Filter Attack",
  53: "Harp Low Pass Filter Hold",
  54: "Harp Low Pass Filter Decay",
  55: "Harp Low Pass Filter Sustain",
  56: "Harp Low Pass Filter Release",
  57: "Harp Low Pass Filter Retrigger Release",
  58: "Harp Low Pass Filter Filter Sensitivity",
  59: "Harp Tremolo Waveform",
  60: "Harp Tremolo Frequency",
  61: "Harp Tremolo Amplitude",
  62: "Harp Vibrato Waveform",
  63: "Harp Vibrato Frequency",
  64: "Harp Vibrato Amplitude",
  65: "Harp Vibrato Attack",
  66: "Harp Vibrato Hold",
  67: "Harp Vibrato Decay",
  68: "Harp Vibrato Sustain",
  69: "Harp Vibrato Release",
  70: "Harp Vibrato Retrigger Release",
  71: "Harp Vibrato Pitch Bend",
  72: "Harp Vibrato Attack Bend",
  73: "Harp Vibrato Hold Bend",
  74: "Harp Vibrato Decay Bend",
  75: "Harp Vibrato Retrigger Release Bend",
  76: "Harp Vibrato Intensity",
  77: "Harp Effects Delay Length",
  78: "Harp Effects Delay Filter Frequency",
  79: "Harp Effects Delay Filter Resonance",
  80: "Harp Effects Delay Lowpass",
  81: "Harp Effects Delay Bandpass",
  82: "Harp Effects Delay Highpass",
  83: "Harp Effects Dry Mix",
  84: "Harp Effects Delay Mix",
  85: "Harp Effects Reverb Level",
  86: "Harp Effects Crunch Level",
  87: "Harp Effects Crunch Type",
  88: "Harp Output Filter Frequency",
  89: "Harp Output Filter Resonance",
  90: "Harp Output Filter Lowpass",
  91: "Harp Output Filter Bandpass",
  92: "Harp Output Filter Highpass",
  93: "Harp Output Filter LFO Waveform",
  94: "Harp Output Filter LFO Frequency",
  95: "Harp Output Filter LFO Amplitude",
  96: "Harp Output Filter Filter LFO Sensitivity",
  97: "Harp Output Filter Output Amplifier",
  98: "Harp Chromatic Mode",
  99: "Harp Octave Change",
  100: "Harp Transient Waveform",
  101: "Harp Transient Amplitude",
  102: "Harp Transient Attack",
  103: "Harp Transient Hold",
  104: "Harp Transient Decay",
  105: "Harp Transient Note Level",
  120: "Chord Chord Shuffling",
  121: "Chord Oscillator Amplitude 1",
  122: "Chord Oscillator Waveform 1",
  123: "Chord Oscillator Frequency Multiplier 1",
  124: "Chord Oscillator Amplitude 2",
  125: "Chord Oscillator Waveform 2",
  126: "Chord Oscillator Frequency Multiplier 2",
  127: "Chord Oscillator Amplitude 3",
  128: "Chord Oscillator Waveform 3",
  129: "Chord Oscillator Frequency Multiplier 3",
  130: "Chord Oscillator Noise",
  131: "Chord Oscillator First Note",
  132: "Chord Oscillator Second Note",
  133: "Chord Oscillator Third Note",
  134: "Chord Oscillator Fourth Note",
  135: "Chord Oscillator Inter-Note Delay",
  136: "Chord Oscillator Random Note Delay",
  137: "Chord Envelope Attack",
  138: "Chord Envelope Hold",
  139: "Chord Envelope Decay",
  140: "Chord Envelope Sustain",
  141: "Chord Envelope Release",
  142: "Chord Envelope Retrigger Release",
  143: "Chord Low Pass Filter Base Frequency",
  144: "Chord Low Pass Filter Keytrack Value",
  145: "Chord Low Pass Filter Resonance",
  146: "Chord Low Pass Filter Attack",
  147: "Chord Low Pass Filter Hold",
  148: "Chord Low Pass Filter Decay",
  149: "Chord Low Pass Filter Sustain",
  150: "Chord Low Pass Filter Release",
  151: "Chord Low Pass Filter Retrigger Release",
  152: "Chord Low Pass Filter LFO Waveform",
  153: "Chord Low Pass Filter LFO Frequency",
  154: "Chord Low Pass Filter LFO Amplitude",
  155: "Chord Low Pass Filter Filter Sensitivity",
  156: "Chord Tremolo Waveform",
  157: "Chord Tremolo Frequency",
  158: "Chord Tremolo Keytrack Value",
  159: "Chord Tremolo Amplitude",
  160: "Chord Vibrato Waveform",
  161: "Chord Vibrato Frequency",
  162: "Chord Vibrato Keytrack Value",
  163: "Chord Vibrato Amplitude",
  164: "Chord Vibrato Attack",
  165: "Chord Vibrato Hold",
  166: "Chord Vibrato Decay",
  167: "Chord Vibrato Sustain",
  168: "Chord Vibrato Release",
  169: "Chord Vibrato Retrigger Release",
  170: "Chord Vibrato Pitch Bend",
  171: "Chord Vibrato Attack Bend",
  172: "Chord Vibrato Hold Bend",
  173: "Chord Vibrato Decay Bend",
  174: "Chord Vibrato Retrigger Release Bend",
  175: "Chord Vibrato Intensity",
  176: "Chord Effects Delay Length",
  177: "Chord Effects Delay Filter Frequency",
  178: "Chord Effects Delay Filter Resonance",
  179: "Chord Effects Delay Lowpass",
  180: "Chord Effects Delay Bandpass",
  181: "Chord Effects Delay Highpass",
  182: "Chord Effects Dry Mix",
  183: "Chord Effects Delay Mix",
  184: "Chord Effects Reverb Level",
  185: "Chord Effects Crunch Level",
  186: "Chord Effects Crunch Type",
  187: "Chord Rythm Default BPM",
  188: "Chord Rythm Cycle Length",
  189: "Chord Rythm Measure Update",
  190: "Chord Rythm Shuffle Value",
  191: "Chord Rythm Note Pushed Duration",
  192: "Chord Output Filter Frequency",
  193: "Chord Output Filter Resonance",
  194: "Chord Output Filter Lowpass",
  195: "Chord Output Filter Bandpass",
  196: "Chord Output Filter Highpass",
  197: "Chord Output Filter Output Amplifier",
  198: "Chord Octave Change"
};

// Maps waveform values to names for select inputs (e.g., oscillator waveform)
const waveformMap = {
  0: "Sine",
  1: "Sawtooth",
  2: "Square",
  3: "Triangle",
  4: "Bandlimited Pulse",
  5: "Pulse",
  6: "Reverse Sawtooth",
  7: "Noise",
  8: "Variable Triangle",
  9: "Bandlimited Sawtooth",
  10: "Reverse Bandlimited Sawtooth",
  11: "Bandlimited Square"
};

// Legacy utility function to map values between ranges
function map_value(value, in_min, in_max, out_min, out_max) {
  return (value - in_min) * (out_max - out_min) / (in_max - in_min) + Number(out_min);
}

// Loads parameter definitions from parameters.json
let cachedParameters = null;
async function loadParameters() {
  if (cachedParameters) {
    console.log('[DEBUG] loadParameters: Using cached parameters', cachedParameters);
    return cachedParameters;
  }
  try {
    const response = await fetch('parameters.json');
    if (!response.ok) {
      console.error(`[loadParameters] Failed to fetch parameters.json: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error: ${response.status}`);
    }
    cachedParameters = await response.json();
    console.log('[DEBUG] loadParameters: Loaded params=', cachedParameters);
    ['global_parameter', 'chord_parameter', 'harp_parameter', 'rhythm_parameter'].forEach(group => {
      console.log(`[DEBUG] ${group}: ${cachedParameters[group]?.length || 0} parameters`, cachedParameters[group] || []);
    });
    return cachedParameters;
  } catch (error) {
    console.error('[loadParameters] Failed to load parameters:', error);
    showNotification("Failed to load parameters", "error");
    return {};
  }
}

// Sets up default values for all parameters from parameters.json
async function initializeDefaultValues() {
  const params = await loadParameters();
  defaultValues = {};
  Object.keys(params).forEach(group => {
    params[group].forEach(param => {
      const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 100.0);
      defaultValues[param.sysex_adress] = param.data_type === "float" 
        ? param.default_value * floatMultiplier
        : param.default_value;
    });
  });
  console.log('Default values initialized:', defaultValues);
}

// Updates the ambient backlight gradient based on bank color
function updateAmbientBacklight(color) {
  const backlight = document.getElementById("ambient-backlight");
  if (!backlight) {
    console.warn("Ambient backlight element not found");
    return;
  }
  backlight.style.background = `radial-gradient(circle at center, ${color} 0%, transparent 70%)`;
}

// Updates the power LED color based on bank color (sysex=20)
function updateLEDBankColor() {
  const bankColor = currentValues[20] !== undefined ? currentValues[20] : defaultValues[20] !== undefined ? defaultValues[20] : 120;
  const floatMultiplier = 1; // Bank color doesn’t scale
  const normalizedColor = bankColor / floatMultiplier;
  const colorIndex = Math.min(23, Math.floor(normalizedColor / 15)); // Map to 0-23 for color palette
  
  console.log(`updateLEDBankColor: bankColor=${bankColor}, floatMultiplier=${floatMultiplier}, normalizedColor=${normalizedColor}, colorIndex=${colorIndex}, currentBankNumber=${currentBankNumber}`);
  
  const led = document.getElementById("power_led");
  if (!led) {
    console.error("Power LED element not found: #power_led");
    return;
  }
  
  const colorMap = {
    0: 'hsl(0, 70%, 50%)',
    1: 'hsl(15, 70%, 50%)',
    2: 'hsl(30, 70%, 50%)',
    3: 'hsl(45, 70%, 50%)',
    4: 'hsl(60, 70%, 50%)',
    5: 'hsl(75, 70%, 50%)',
    6: 'hsl(90, 70%, 50%)',
    7: 'hsl(105, 70%, 50%)',
    8: 'hsl(120, 70%, 50%)',
    9: 'hsl(135, 70%, 50%)',
    10: 'hsl(150, 70%, 50%)',
    11: 'hsl(165, 70%, 50%)',
    12: 'hsl(180, 70%, 50%)',
    13: 'hsl(195, 70%, 50%)',
    14: 'hsl(210, 70%, 50%)',
    15: 'hsl(225, 70%, 50%)',
    16: 'hsl(240, 70%, 50%)',
    17: 'hsl(255, 70%, 50%)',
    18: 'hsl(270, 70%, 50%)',
    19: 'hsl(285, 70%, 50%)',
    20: 'hsl(300, 70%, 50%)',
    21: 'hsl(315, 70%, 50%)',
    22: 'hsl(330, 70%, 50%)',
    23: 'hsl(345, 70%, 50%)'
  };
  
  led.removeAttribute('fill');
  led.classList.remove(...Array.from({ length: 24 }, (_, i) => `color-${i}`));
  led.classList.add(`color-${colorIndex}`);
  led.setAttribute('fill', colorMap[colorIndex]);
  
  led.style.display = 'none';
  led.offsetHeight;
  led.style.display = '';
  updateAmbientBacklight(colorMap[colorIndex]);
  
  console.log(`Applied class: color-${colorIndex}, fill: ${colorMap[colorIndex]}`);
}


// Displays a temporary notification
function showNotification(message, type = 'info') {
  const statusElement = document.getElementById("connection-status");
  if (!statusElement) {
    console.warn("Status element not found: #connection-status");
    return;
  }

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }

  statusElement.textContent = message;
  statusElement.className = `connection-status ${type === 'success' ? 'connected' : 'disconnected'}`;

  notificationTimeout = setTimeout(() => {
    notificationTimeout = null;
    updateConnectionStatus(controller.isConnected(), 'notification timeout');
  }, 3000);
}

// Decodes a base64-encoded preset string into parameter values
function decodePresetData(encodedData) {
  try {
    const decodedString = atob(encodedData);
    const parameters = decodedString.split(';').map(param => {
      const num = parseInt(param);
      return isNaN(num) ? 0 : num;
    });
    return parameters;
  } catch (error) {
    console.error('Error decoding preset data:', error);
    showNotification('Invalid preset code', 'error');
    return new Array(controller.parameter_size || 199).fill(0);
  }
}

const BASE_ADDRESS_RHYTHM = 220;

// Creates the rhythm settings modal with a checkbox grid and sliders
async function checkbox_array() {
  const modal = document.getElementById('rhythm-modal');
  if (!modal) {
    console.error("Rhythm modal element not found: #rhythm-modal");
    showNotification("Rhythm modal not found", "error");
    return;
  }

  tempValues = { ...currentValues };

  if (!modal.querySelector('.modal-content')) {
    modal.innerHTML = '';
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const closeButton = document.createElement('span');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => hideModal('rhythm_parameter'));
    modalContent.appendChild(closeButton);

    const title = document.createElement('h2');
    title.textContent = 'Rhythm Settings';
    modalContent.appendChild(title);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'rhythm-grid';

    const headerRow = document.createElement('div');
    headerRow.className = 'rhythm-row header';
    const emptyCell = document.createElement('div');
    emptyCell.className = 'rhythm-cell';
    headerRow.appendChild(emptyCell);
    for (let step = 1; step <= 16; step++) {
      const stepHeader = document.createElement('div');
      stepHeader.className = 'rhythm-cell';
      stepHeader.textContent = step;
      headerRow.appendChild(stepHeader);
    }
    gridContainer.appendChild(headerRow);

    for (let voice = 0; voice < 7; voice++) {
      const row = document.createElement('div');
      row.className = 'rhythm-row';
      const rowLabel = document.createElement('div');
      rowLabel.className = 'rhythm-cell';
      rowLabel.textContent = `Voice ${voice + 1}`;
      row.appendChild(rowLabel);

      for (let step = 0; step < 16; step++) {
        const cell = document.createElement('div');
        cell.className = 'rhythm-cell';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `checkbox${voice}${step}`;
        checkbox.dataset.voice = voice;
        checkbox.dataset.step = step;
        checkbox.addEventListener('change', () => sendRhythmData(step));
        cell.appendChild(checkbox);
        row.appendChild(cell);
      }
      gridContainer.appendChild(row);
    }
    modalContent.appendChild(gridContainer);

    const params = await loadParameters();
    const rhythmParams = (params.rhythm_parameter || []).filter(
      param => param.group !== "hidden" && !(param.sysex_adress >= 220 && param.sysex_adress <= 235)
    );
    console.log(`[checkbox_array] Loaded ${rhythmParams.length} rhythm parameters`, rhythmParams);

    if (rhythmParams.length > 0) {
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'parameter-column';
      const controlsHeader = document.createElement('h3');
      controlsHeader.textContent = 'Rhythm Parameters';
      controlsContainer.appendChild(controlsHeader);

      rhythmParams.forEach(param => {
        console.log(`[DEBUG] Rendering rhythm param: sysex=${param.sysex_adress}, name=${param.name}, ui_type=${param.ui_type}`);
        if (!["slider", "select"].includes(param.ui_type)) {
          console.warn(`Skipping parameter with unsupported ui_type: ${param.name} (sysex_adress: ${param.sysex_adress}, ui_type: ${param.ui_type})`);
          return;
        }

        const container = document.createElement('div');
        container.className = 'parameter-row';
        const label = document.createElement('label');
        label.textContent = param.name;
        label.setAttribute('for', `param-${param.sysex_adress}`);
        label.title = param.tooltip || param.name;

        const floatMultiplier = param.data_type === 'float' ? (controller.float_multiplier || 100.0) : 1;
        const currentValue = currentValues[param.sysex_adress] !== undefined
          ? currentValues[param.sysex_adress]
          : param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value;

        if (param.ui_type === 'slider') {
          const sliderContainer = document.createElement('div');
          sliderContainer.className = 'slider-container';
          const input = document.createElement('input');
          input.type = 'range';
          input.id = `param-${param.sysex_adress}`;
          input.name = param.name;
          input.className = 'slider';
          input.min = param.min_value;
          input.max = param.max_value;
          input.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
          input.step = param.data_type === 'float' ? 0.01 : 1;
          input.title = param.tooltip || param.name;

          const valueInput = document.createElement('input');
          valueInput.type = 'number';
          valueInput.id = `value-${param.sysex_adress}`;
          valueInput.min = param.min_value;
          valueInput.max = param.max_value;
          valueInput.step = param.data_type === 'float' ? 0.01 : 1;
          valueInput.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
          valueInput.className = 'value-input';
          valueInput.title = param.tooltip || param.name;

          input.addEventListener('input', (e) => {
            const value = param.data_type === 'float' ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            valueInput.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
            controller.sendParameter(parseInt(param.sysex_adress), value);
            executeMethod(param.method, value);
          });

          valueInput.addEventListener('change', (e) => {
            let value = parseFloat(e.target.value) || 0;
            value = Math.max(param.min_value, Math.min(param.max_value, value));
            if (param.data_type === 'float') value *= floatMultiplier;
            tempValues[param.sysex_adress] = value;
            input.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
            valueInput.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
            controller.sendParameter(parseInt(param.sysex_adress), value);
            executeMethod(param.method, value);
          });

          sliderContainer.appendChild(input);
          sliderContainer.appendChild(valueInput);
          container.appendChild(label);
          container.appendChild(sliderContainer);
        } else if (param.ui_type === 'select') {
          const selectContainer = document.createElement('div');
          selectContainer.className = 'select-container';
          const input = document.createElement('select');
          input.id = `param-${param.sysex_adress}`;
          input.name = param.name;
          input.title = param.tooltip || param.name;

          const options = waveformSysexAddresses.includes(param.sysex_adress)
            ? Object.entries(waveformMap).map(([value, label]) => ({ value, label }))
            : param.options || [];
          console.log(`[DEBUG] Rhythm select options for sysex=${param.sysex_adress}:`, options);

          if (options.length === 0) {
            console.warn(`No options defined for rhythm select parameter ${param.name} (sysex=${param.sysex_adress})`);
            const opt = document.createElement('option');
            opt.value = '';
            opt.text = 'No options available';
            input.appendChild(opt);
          } else {
            options.forEach(option => {
              const opt = document.createElement('option');
              opt.value = option.value;
              opt.text = option.label;
              input.appendChild(opt);
            });
          }

          input.value = String(currentValue);

          input.addEventListener('change', (e) => {
            const value = param.data_type === 'float' ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            controller.sendParameter(parseInt(param.sysex_adress), value);
            executeMethod(param.method, value);
          });

          selectContainer.appendChild(input);
          container.appendChild(label);
          container.appendChild(selectContainer);
        }

        controlsContainer.appendChild(container);
      });

      modalContent.appendChild(controlsContainer);
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-buttons';
    const saveButton = document.createElement('button');
    saveButton.className = 'save-btn';
    saveButton.id = 'save-rhythm-btn';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
      saveSettings(currentBankNumber, 'rhythm_parameter');
      hideModal('rhythm_parameter');
    });
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-btn';
    cancelButton.id = 'cancel-rhythm-btn';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
      tempValues = { ...currentValues };
      hideModal('rhythm_parameter');
    });
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    modalContent.appendChild(buttonContainer);

    modal.appendChild(modalContent);
  } else {
    const params = await loadParameters();
    const rhythmParams = (params.rhythm_parameter || []).filter(
      param => param.group !== "hidden" && !(param.sysex_adress >= 220 && param.sysex_adress <= 235)
    );
    rhythmParams.forEach(param => {
      const floatMultiplier = param.data_type === 'float' ? (controller.float_multiplier || 100.0) : 1;
      const currentValue = currentValues[param.sysex_adress] !== undefined
        ? currentValues[param.sysex_adress]
        : param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value;
      const slider = document.getElementById(`param-${param.sysex_adress}`);
      const valueInput = document.getElementById(`value-${param.sysex_adress}`);
      if (slider) {
        slider.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
      }
      if (valueInput) {
        valueInput.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
      }
    });
  }

  modal.style.display = 'block';
  await new Promise(resolve => setTimeout(resolve, 0));
  await refreshRhythmGrid();
}

// Legacy function to send rhythm data (renamed from send_array_data for clarity)
function sendRhythmData(step) {
  let output_value = 0;
  for (let voice = 0; voice < 7; voice++) {
    const checkbox = document.getElementById(`checkbox${voice}${step}`);
    if (checkbox && checkbox.checked) {
      output_value |= 1 << voice;
    }
  }
  const sysexAddress = BASE_ADDRESS_RHYTHM + step;
  currentValues[sysexAddress] = output_value;
  tempValues[sysexAddress] = output_value;
  rhythmPattern[step] = output_value;
  console.log(`sendRhythmData: Step ${step + 1}, sysex=${sysexAddress}, value=${output_value}`);
  controller.sendParameter(sysexAddress, output_value);
}

// Executes parameter-specific methods
function executeMethod(method, value) {
  if (!method) return;
  const methodParts = method.split(';').map(part => part.trim());
  methodParts.forEach(part => {
    if (part.includes('rhythm_pattern')) {
      const index = parseInt(part.match(/\[(\d+)\]/)?.[1]);
      if (!isNaN(index)) rhythmPattern[index] = value;
    } else if (part === 'update_rhythm()') {
      updateRhythm();
    }
  });
}

// Logs rhythm pattern updates
function updateRhythm() {
  console.log('Rhythm updated:', rhythmPattern);
}

// Creates the global settings modal
async function generateGlobalSettingsForm() {
  const globalSettings = document.getElementById("global-settings");
  const settingsForm = document.getElementById("global-settings-form");
  if (!globalSettings || !settingsForm) {
    console.error("Global settings elements not found: #global-settings or #global-settings-form");
    showNotification("Global settings form not found", "error");
    return;
  }
  const params = await loadParameters();
  const globalParams = params.global_parameter || [];
  console.log(`[generateGlobalSettingsForm] Loaded ${globalParams.length} global parameters`, globalParams);

  if (globalParams.length === 0) {
    console.warn("No global parameters found");
    settingsForm.innerHTML = "<p>No global parameters available.</p>";
    return;
  }

  settingsForm.innerHTML = "";

  globalParams.forEach((param) => {
    console.log(`[DEBUG] Rendering global param: sysex=${param.sysex_adress}, name=${param.name}, ui_type=${param.ui_type}, data_type=${param.data_type}, currentValue=${currentValues[param.sysex_adress]}`);
    
    // Use floatMultiplier only for float parameters, default to 1 for int or Sysex 20
    const floatMultiplier = param.data_type === "float" && param.sysex_adress !== 20 ? (controller.float_multiplier || 100.0) : 1;
    
    // Calculate current and scaled values
    const currentValue = currentValues[param.sysex_adress] !== undefined
      ? currentValues[param.sysex_adress]
      : tempValues[param.sysex_adress] !== undefined
        ? tempValues[param.sysex_adress]
        : param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value;
    const scaledValue = param.data_type === "float" ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;

    const row = document.createElement("div");
    row.className = "parameter-row";
    const label = document.createElement("label");
    label.textContent = param.name;
    label.setAttribute("for", `param-${param.sysex_adress}`);
    label.title = param.description || param.tooltip || param.name;

    if (param.ui_type === "slider") {
      row.innerHTML = `
        <div class="slider-container">
          <input type="range" class="slider" id="param-${param.sysex_adress}"
            min="${param.min_value}" max="${param.max_value}"
            value="${scaledValue}" step="${param.step || (param.data_type === 'float' ? 0.01 : 1)}">
          <input type="number" class="value-input" value="${scaledValue}"
            step="${param.step || (param.data_type === 'float' ? 0.01 : 1)}"
            min="${param.min_value}" max="${param.max_value}">
        </div>
      `;
      row.insertBefore(label, row.firstChild);

      const slider = row.querySelector(".slider");
      const valueInput = row.querySelector(".value-input");

      slider.addEventListener("input", () => {
        const newValue = param.data_type === "float" ? parseFloat(slider.value) * floatMultiplier : parseInt(slider.value);
        tempValues[param.sysex_adress] = newValue;
        currentValues[param.sysex_adress] = newValue; // Update currentValues to sync UI
        valueInput.value = param.data_type === "float" ? Number((newValue / floatMultiplier).toFixed(2)) : newValue;
        if (controller.isConnected()) {
          console.log(`[SEND PARAMETER] Sysex=${param.sysex_adress}, value=${newValue}`);
          controller.sendParameter(parseInt(param.sysex_adress), newValue);
        }
        if (param.method) {
          executeMethod(param.method, newValue);
        }
      });

      valueInput.addEventListener("input", (e) => {
        let newValue = parseFloat(e.target.value);
        if (isNaN(newValue)) {
          newValue = scaledValue;
          valueInput.value = newValue;
          slider.value = newValue;
          return;
        }
        newValue = Math.max(param.min_value, Math.min(param.max_value, newValue));
        const scaledNewValue = param.data_type === "float" ? newValue * floatMultiplier : Math.round(newValue);
        tempValues[param.sysex_adress] = scaledNewValue;
        currentValues[param.sysex_adress] = scaledNewValue; // Update currentValues to sync UI
        slider.value = newValue;
        valueInput.value = newValue;
        if (controller.isConnected()) {
          console.log(`[SEND PARAMETER] Sysex=${param.sysex_adress}, value=${scaledNewValue}`);
          controller.sendParameter(parseInt(param.sysex_adress), scaledNewValue);
        }
        if (param.method) {
          executeMethod(param.method, scaledNewValue);
        }
      });
    } else if (param.ui_type === "select") {
      // Existing select logic remains unchanged
      const selectContainer = document.createElement("div");
      selectContainer.className = "select-container";
      const input = document.createElement("select");
      input.id = `param-${param.sysex_adress}`;
      input.name = param.name;
      input.title = param.description || param.tooltip || param.name;

      const options = waveformSysexAddresses.includes(param.sysex_adress)
        ? Object.entries(waveformMap).map(([value, label]) => ({ value, label }))
        : param.options || [];
      console.log(`[DEBUG] Select options for sysex=${param.sysex_adress}:`, options);

      if (options.length === 0) {
        console.warn(`No options defined for select parameter ${param.name} (sysex=${param.sysex_adress})`);
        const opt = document.createElement("option");
        opt.value = "";
        opt.text = "No options available";
        input.appendChild(opt);
      } else {
        options.forEach(option => {
          const opt = document.createElement("option");
          opt.value = option.value;
          opt.text = option.label;
          input.appendChild(opt);
        });
      }

      input.value = String(currentValue);

      input.addEventListener("change", (e) => {
        const newValue = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
        tempValues[param.sysex_adress] = newValue;
        currentValues[param.sysex_adress] = newValue; // Update currentValues
        if (controller.isConnected()) {
          console.log(`[SEND PARAMETER] Sysex=${param.sysex_adress}, value=${newValue}`);
          controller.sendParameter(parseInt(param.sysex_adress), newValue);
        }
        if (param.method) {
          executeMethod(param.method, newValue);
        }
      });

      selectContainer.appendChild(input);
      row.appendChild(label);
      row.appendChild(selectContainer);
    } else {
      console.warn(`Unsupported ui_type for param ${param.name}: ${param.ui_type}`);
    }

    settingsForm.appendChild(row);
  });

  const saveBtn = document.getElementById("save-global-btn");
  const cancelBtn = document.getElementById("cancel-global-btn");

  if (!saveBtn || !cancelBtn) {
    console.error("Global settings buttons not found: #save-global-btn or #cancel-global-btn");
    showNotification("Global settings buttons not found", "error");
    return;
  }

  const saveBtnClone = saveBtn.cloneNode(true);
  const cancelBtnClone = cancelBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(saveBtnClone, saveBtn);
  cancelBtn.parentNode.replaceChild(cancelBtnClone, cancelBtn);

  saveBtnClone.addEventListener("click", async () => {
    console.log("[DEBUG] Save global button clicked");
    await saveSettings(currentBankNumber, "global_parameter");
  });

  cancelBtnClone.addEventListener("click", async () => {
    console.log("[DEBUG] Cancel global button clicked");
    tempValues = { ...currentValues };
    await generateGlobalSettingsForm();
    if (currentValues[20] !== undefined) {
      updateLEDBankColor();
    }
    showNotification("Changes discarded", "info");
  });

  globalSettings.style.display = "block";
}

// Creates modals for chord, harp, or potentiometer parameters
async function generateSettingsForm(paramGroup) {
  if (paramGroup === "global_parameter") return;
  if (paramGroup === "rhythm_parameter") {
    await checkbox_array();
    return;
  }
  const params = await loadParameters();
  const form = document.getElementById("settings-form");
  if (!form) {
    console.error("Settings form not found: #settings-form");
    showNotification("Settings form not found", "error");
    return;
  }
  form.innerHTML = "";
  document.getElementById("settings-title").textContent = paramGroup.replace(/_/g, " ").toUpperCase();

  const groupParams = (params[paramGroup] || []).filter(param => param.group !== "hidden");
  if (groupParams.length === 0) {
    console.warn(`No parameters found for ${paramGroup}`);
    form.innerHTML = "<p>No parameters available for this group.</p>";
    return;
  }

  const groupedParams = {};
  groupParams.forEach(param => {
    const groupName = param.group || "Other";
    if (!groupedParams[groupName]) groupedParams[groupName] = [];
    groupedParams[groupName].push(param);
  });

  Object.keys(groupedParams).forEach(groupName => {
    const column = document.createElement("div");
    column.className = "parameter-column";
    const header = document.createElement("h3");
    header.textContent = groupName;
    column.appendChild(header);

    groupedParams[groupName].forEach(param => {
      console.log(`[DEBUG] Processing param: sysex=${param.sysex_adress}, name=${param.name}, ui_type=${param.ui_type}, data_type=${param.data_type}, currentValue=${currentValues[param.sysex_adress]}, group=${paramGroup}, paramGroup=${param.group}, iterate=${param.iterate}`);
      const container = document.createElement("div");
      container.className = "parameter-row";
      const label = document.createElement("label");
      label.textContent = param.name;
      label.setAttribute("for", `param-${param.sysex_adress}`);
      label.title = param.description || param.tooltip || param.name;

      const floatMultiplier = param.data_type === "float" && param.sysex_adress !== 20 ? (controller.float_multiplier || 100.0) : 1;
      const currentValue = currentValues[param.sysex_adress] !== undefined
        ? currentValues[param.sysex_adress]
        : tempValues[param.sysex_adress] !== undefined
          ? tempValues[param.sysex_adress]
          : param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value;
      const scaledValue = param.data_type === "float" ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;

      if (param.ui_type === "slider") {
        const sliderContainer = document.createElement("div");
        sliderContainer.className = "slider-container";
        const input = document.createElement("input");
        input.type = "range";
        input.className = "slider";
        input.id = `param-${param.sysex_adress}`;
        input.min = param.min_value;
        input.max = param.max_value;
        input.step = param.step || (param.data_type === "float" ? 0.01 : 1);
        input.value = scaledValue;
        console.log(`[DEBUG] Slider sysex=${param.sysex_adress}, min=${input.min}, max=${input.max}, step=${input.step}, value=${input.value}`);

        const valueInput = document.createElement("input");
        valueInput.type = "number";
        valueInput.className = "value-input";
        valueInput.id = `value-${param.sysex_adress}`;
        valueInput.value = scaledValue;
        valueInput.step = param.step || (param.data_type === "float" ? 0.01 : 1);
        valueInput.min = param.min_value;
        valueInput.max = param.max_value;

        input.addEventListener("input", () => {
          const newValue = param.data_type === "float" ? parseFloat(input.value) * floatMultiplier : parseInt(input.value);
          tempValues[param.sysex_adress] = newValue;
          currentValues[param.sysex_adress] = newValue;
          valueInput.value = param.data_type === "float" ? Number((newValue / floatMultiplier).toFixed(2)) : newValue;
          if (controller.isConnected()) {
            console.log(`[SEND PARAMETER] Sysex=${param.sysex_adress}, value=${newValue}`);
            controller.sendParameter(parseInt(param.sysex_adress), newValue);
          }
          if (param.method) {
            executeMethod(param.method, newValue);
          }
        });

        valueInput.addEventListener("input", (e) => {
          let newValue = parseFloat(e.target.value);
          if (isNaN(newValue)) {
            newValue = scaledValue;
            valueInput.value = newValue;
            input.value = newValue;
            return;
          }
          newValue = Math.max(param.min_value, Math.min(param.max_value, newValue));
          const scaledNewValue = param.data_type === "float" ? newValue * floatMultiplier : Math.round(newValue);
          tempValues[param.sysex_adress] = scaledNewValue;
          currentValues[param.sysex_adress] = scaledNewValue;
          input.value = newValue;
          valueInput.value = newValue;
          if (controller.isConnected()) {
            console.log(`[SEND PARAMETER] Sysex=${param.sysex_adress}, value=${scaledNewValue}`);
            controller.sendParameter(parseInt(param.sysex_adress), scaledNewValue);
          }
          if (param.method) {
            executeMethod(param.method, scaledNewValue);
          }
        });

        sliderContainer.appendChild(input);
        sliderContainer.appendChild(valueInput);
        container.appendChild(label);
        container.appendChild(sliderContainer);
      } else {
        // Existing select and switch logic remains unchanged
        // ... (omitted for brevity)
      }

      column.appendChild(container);
    });
    form.appendChild(column);
  });

  const saveBtn = document.getElementById("save-settings-btn");
  const cancelBtn = document.getElementById("cancel-settings-btn");

  if (!saveBtn || !cancelBtn) {
    console.error("Save or cancel button not found: #save-settings-btn or #cancel-settings-btn");
    showNotification("Modal buttons not found", "error");
    return;
  }

  const saveBtnClone = saveBtn.cloneNode(true);
  const cancelBtnClone = cancelBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(saveBtnClone, saveBtn);
  cancelBtn.parentNode.replaceChild(cancelBtnClone, cancelBtn);

  saveBtnClone.addEventListener("click", async () => {
    console.log(`[DEBUG] Save button clicked for paramGroup=${paramGroup}`);
    await saveSettings(currentBankNumber, paramGroup);
  });

  cancelBtnClone.addEventListener("click", async () => {
    console.log(`[DEBUG] Cancel button clicked for paramGroup=${paramGroup}`);
    await cancelSettings(currentBankNumber, paramGroup);
    hideModal(paramGroup);
  });

  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "block";
  }
}
// Updates the entire UI for a given bank
async function updateUI(bankNumber) {
  console.log(`updateUI: Updating UI for bank ${bankNumber}`);
  try {
    currentBankNumber = bankNumber;
    active_bank_number = bankNumber; // Sync legacy variable
    const bankSelect = document.getElementById("bank_number_selection");
    if (bankSelect) {
      bankSelect.value = bankNumber;
      console.log(`[DEBUG] updateUI: Set bank-select to bank ${bankNumber}`);
    } else {
      console.warn("Bank select element not found: #bank-select");
    }

    updateBankIndicator();

    // Update bank color
    if (currentValues[20] !== undefined) {
      updateLEDBankColor(currentValues[20]);
    }

    // Re-render global settings
    await generateGlobalSettingsForm();

    // Re-render the active modal if it’s open
    const modal = document.getElementById("settings-modal");
    if (modal && modal.style.display === "block") {
      const settingsTitle = document.getElementById("settings-title").textContent.toLowerCase().replace(/ /g, "_");
      if (settingsTitle && settingsTitle !== "global_parameter" && settingsTitle !== "rhythm_parameter") {
        console.log(`[DEBUG] updateUI: Re-rendering modal for ${settingsTitle}`);
        await generateSettingsForm(settingsTitle);
      }
    }

    // Update rhythm modal if open
    const rhythmModal = document.getElementById("rhythm-modal");
    if (rhythmModal && rhythmModal.style.display === "block") {
      await checkbox_array();
      await refreshRhythmGrid();
    }
  } catch (error) {
    console.error(`updateUI: Error updating UI for bank ${bankNumber}`, error);
    showNotification("Error updating UI", "error");
  }
  console.log(`[DEBUG] updateUI: Harp Envelope values:`, {
  attack: currentValues[43],
  hold: currentValues[44],
  decay: currentValues[45],
  sustain: currentValues[46],
  release: currentValues[47]
});
}

// Loads settings for a specific bank
async function loadBankSettings(bankNumber) {
  try {
    console.log(`loadBankSettings: bankNumber=${bankNumber}`);
    
    // Validate bank number
    if (bankNumber < 0 || bankNumber > 11) {
      console.warn(`Invalid bank number ${bankNumber}, defaulting to 0`);
      bankNumber = 0;
    }

    currentBankNumber = bankNumber;
    active_bank_number = bankNumber;

    // Initialize bankSettings[bankNumber] if it doesn't exist
    if (!bankSettings[bankNumber]) {
      bankSettings[bankNumber] = { ...defaultValues };
    }

    // Update currentValues with stored settings or defaults
    currentValues = { ...defaultValues, ...bankSettings[bankNumber] };

    if (!controller.isConnected()) {
      minichord_device = false;
      await updateUI(bankNumber);
      showNotification(`Bank ${bankNumber + 1} loaded (device not connected)`, "warning");
      return;
    }

    minichord_device = true;

    // Request parameter dump to sync with device
    controller.sendSysEx([0, 0, 0, 0]);

    // Wait for response
    const maxWaitTime = 5000; // 5 seconds
    const startTime = Date.now();
    await new Promise((resolve, reject) => {
      const checkResponse = setInterval(async () => {
        if (!controller.pendingSave || Date.now() - startTime > maxWaitTime) {
          clearInterval(checkResponse);
          if (Date.now() - startTime > maxWaitTime) {
            console.warn(`loadBankSettings: Timeout waiting for device response for bank ${bankNumber}`);
            showNotification(`Timeout loading bank ${bankNumber + 1}`, "error");
            reject(new Error("Timeout waiting for device response"));
            return;
          }
          // Update bankSettings with currentValues after device response
          bankSettings[bankNumber] = { ...currentValues };
          await updateUI(bankNumber);
          showNotification(`Bank ${bankNumber + 1} loaded`, "success");
          resolve();
        }
      }, 100);
    });

    // Only send parameters to the device if they differ from the received values
    const params = await loadParameters();
    const paramGroups = ['global_parameter', 'harp_parameter', 'chord_parameter', 'rhythm_parameter'];
    for (const group of paramGroups) {
      if (params[group]) {
        for (const param of params[group]) {
          const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 100.0);
          const storedValue = currentValues[param.sysex_adress] !== undefined 
            ? currentValues[param.sysex_adress] 
            : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
          // Only send if the value differs (to avoid overwriting device state)
          if (bankSettings[bankNumber][param.sysex_adress] !== storedValue) {
            console.log(`[SEND PARAMETER] Sysex=${param.sysex_adress}, value=${storedValue}`);
            controller.sendParameter(param.sysex_adress, storedValue);
          }
        }
      }
    }
  } catch (error) {
    console.error(`loadBankSettings: Error loading bank ${bankNumber}`, error);
    showNotification(`Error loading bank ${bankNumber + 1}`, "error");
  }
}

// Processes queued MIDI responses from the device
async function processMidiQueue() {
  while (midiResponseQueue.length > 0) {
    const processedData = midiResponseQueue.shift();
    const bankNumber = processedData.bankNumber;
    if (!bankSettings[bankNumber]) {
      bankSettings[bankNumber] = {};
      processedData.parameters.forEach((value, index) => {
        if (value !== undefined) bankSettings[bankNumber][index] = value;
      });
    }
    if (bankNumber !== currentBankNumber && !isLoadingPreset && !isInitializing) {
      await loadBankSettings(bankNumber);
    }
  }
}

// Initializes the entire application
async function init() {
  isInitializing = true;
  showNotification("Connecting...", "info");
  try {
    if (!parameters) {
      parameters = await loadParameters();
    }
    await initializeDefaultValues();
    
    const isInitialized = await controller.initialize();
    minichord_device = controller.isConnected();
    
    if (!isInitialized || !controller.isConnected()) {
      showNotification("Failed to connect to MiniChord device", "error");
      // Use bank 0 with defaults or stored settings if available
      currentBankNumber = 0;
      active_bank_number = 0;
      bankSettings[0] = bankSettings[0] || { ...defaultValues };
      currentValues = { ...defaultValues, ...bankSettings[0] };
      await updateUI(0);
    } else {
      midiResponseQueue = [];
      // Wait for the device to provide the active bank number
      const activeBankNumber = await new Promise((resolve) => {
        const checkBank = setInterval(() => {
          if (controller.active_bank_number !== undefined && controller.active_bank_number >= 0 && controller.active_bank_number <= 11) {
            clearInterval(checkBank);
            resolve(controller.active_bank_number);
          }
        }, 100);
        // Timeout after 2 seconds, default to 0
        setTimeout(() => {
          clearInterval(checkBank);
          resolve(0);
        }, 2000);
      });
      active_bank_number = activeBankNumber;
      await loadBankSettings(activeBankNumber);
    }
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Initialization failed.", "error");
    currentBankNumber = 0;
    active_bank_number = 0;
    bankSettings[0] = bankSettings[0] || { ...defaultValues };
    currentValues = { ...defaultValues, ...bankSettings[0] };
    await updateUI(0);
  } finally {
    isInitializing = false;
  }
}


// Updates the connection status display
function updateConnectionStatus(connected, message) {
  const statusElement = document.getElementById("connection-status");
  const body = document.body;
  if (!statusElement) return;

  minichord_device = connected; // Sync legacy variable
  if (connected) {
    statusElement.className = "connection-status connected";
    body.classList.remove("control_full");
    const bankText = currentBankNumber >= 0 ? ` | Bank ${currentBankNumber + 1}` : '';
    statusElement.textContent = `minichord connected${bankText}`;
  } else {
    statusElement.className = "connection-status disconnected";
    body.classList.add("control_full");
    const elements = document.getElementsByClassName("active");
    while (elements.length > 0) {
      elements[0].classList.add("inactive");
      elements[0].classList.remove("active");
    }
    statusElement.textContent = "minichord disconnected";
    window.scrollTo(0, 0);
  }
}

// Opens a modal for editing parameters
async function openModal(paramGroup) {
  openParamGroup = paramGroup;

  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
    return;
  }

  if (paramGroup === "rhythm_parameter") {
    if (!controller.isConnected()) {
      showNotification("Device not connected", "error");
      return;
    }
    await checkbox_array();
    document.getElementById("rhythm-modal").style.display = 'block';
    return;
  }

  const modal = document.getElementById("settings-modal");
  if (!modal) {
    showNotification("Settings modal not found", "error");
    return;
  }

  const params = await loadParameters();
  originalPresetValues = {};
  const groupParams = params[paramGroup] || [];
  groupParams.forEach(param => {
    const address = param.sysex_adress;
    originalPresetValues[address] = currentValues[address] !== undefined 
      ? currentValues[address] 
      : (param.data_type === "float" ? param.default_value * (controller.float_multiplier || 100.0) : param.default_value);
  });
  tempValues = { ...originalPresetValues };

  await generateSettingsForm(paramGroup);
  modal.style.display = "block";

  const closeButton = modal.querySelector(".close-button");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      cancelSettings(currentBankNumber, paramGroup);
      hideModal(paramGroup);
    });
  }
}

// Saves parameter changes to the device and UI
async function saveSettings(presetId, paramGroup) {
  console.log(`[saveSettings] Saving for bank ${presetId + 1}, paramGroup=${paramGroup}, tempValues=`, tempValues);
  const tempCopy = { ...tempValues };
  
  try {
    // Merge tempValues into currentValues and bankSettings
    currentValues = { ...currentValues, ...tempValues };
    bankSettings[presetId] = { ...currentValues };
    console.log(`[saveSettings] Updated currentValues=`, currentValues);

    if (controller.isConnected()) {
      // Send all changed parameters to the device
      for (const sysex of Object.keys(tempValues)) {
        const value = Math.round(tempValues[sysex]);
        console.log(`[saveSettings] Sending Sysex=${sysex}, value=${value}`);
        controller.sendParameter(parseInt(sysex), value);
      }

      // Send the save command
      console.log(`[saveSettings] Sending save command for bank ${presetId + 1}`);
      const success = controller.saveCurrentSettings(presetId);
      if (!success) {
        console.error(`[saveSettings] Failed to send save command for bank ${presetId + 1}`);
        showNotification(`Failed to save bank ${presetId + 1}`, "error");
        currentValues = { ...currentValues, ...tempCopy };
        return;
      }

      // Wait for device confirmation
      const maxWaitTime = 5000;
      const startTime = Date.now();
      await new Promise((resolve, reject) => {
        const checkSave = setInterval(() => {
          if (!controller.pendingSave || Date.now() - startTime > maxWaitTime) {
            clearInterval(checkSave);
            if (Date.now() - startTime > maxWaitTime) {
              console.warn(`[saveSettings] Save timeout for bank ${presetId + 1}`);
              showNotification(`Save timeout for bank ${presetId + 1}`, "error");
              reject(new Error("Save timeout"));
              return;
            }
            console.log(`[saveSettings] Save confirmed for bank ${presetId + 1}`);
            resolve();
          }
        }, 100);
      });

      // Request parameter dump to sync
      controller.sendSysEx([0, 0, 0, 0]);
      await updateUIAfterSave(presetId, paramGroup);
      showNotification(`Saved to bank ${presetId + 1}`, "success");
    } else {
      console.warn(`[saveSettings] Device not connected, saving locally for bank ${presetId + 1}`);
      showNotification("Device not connected, saved locally", "warning");
      await updateUIAfterSave(presetId, paramGroup);
    }
  } catch (error) {
    console.error(`[saveSettings] Error saving bank ${presetId + 1}:`, error);
    showNotification(`Error saving bank ${presetId + 1}`, "error");
    currentValues = { ...currentValues, ...tempCopy };
  }
}

// Updates UI after saving settings
async function updateUIAfterSave(presetId, paramGroup) {
  tempValues = {};
  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
  } else if (paramGroup === "rhythm_parameter") {
    await checkbox_array();
    await refreshRhythmGrid();
  } else {
    await generateSettingsForm(paramGroup);
  }

  if (paramGroup !== "global_parameter") {
    hideModal(paramGroup);
  }

  if (currentValues[20] !== undefined) {
    updateLEDBankColor();
  }

  showNotification(`Saved settings to bank ${presetId + 1}`, 'success');
}

// Reverts changes and restores original values
async function cancelSettings(bankNumber, paramGroup) {
  console.log(`[cancelSettings] Cancelling for bank ${bankNumber + 1}, paramGroup=${paramGroup}`);
  const params = await loadParameters();
  const groupParams = params[paramGroup] || [];

  try {
    groupParams.forEach(param => {
      const address = param.sysex_adress;
      if (originalPresetValues[address] !== undefined) {
        currentValues[address] = originalPresetValues[address];
        if (controller.isConnected()) {
          console.log(`[cancelSettings] Sending Sysex=${address}, value=${currentValues[address]}`);
          controller.sendParameter(parseInt(address), currentValues[address]);
        }
      }
    });

    bankSettings[bankNumber] = { ...currentValues };
    tempValues = {};

    if (paramGroup === "global_parameter") {
      await generateGlobalSettingsForm();
      hideModal(paramGroup);
    } else if (paramGroup === "rhythm_parameter") {
      if (document.getElementById('rhythm-modal').style.display === 'block') {
        await checkbox_array();
        await refreshRhythmGrid();
      }
      hideModal("rhythm_parameter");
    } else {
      await generateSettingsForm(paramGroup);
      hideModal(paramGroup);
    }

    if (currentValues[20] !== undefined) {
      updateLEDBankColor();
    }

    showNotification(`Cancelled changes for ${paramGroup.replace(/_/g, " ")}`, "info");
  } catch (error) {
    console.error(`[cancelSettings] Error cancelling for bank ${bankNumber + 1}:`, error);
    showNotification(`Error cancelling changes for ${paramGroup.replace(/_/g, " ")}`, "error");
  }
}

// Shows a modal based on the parameter group
function showModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
    'global_parameter': 'global-settings-modal',
    'harp_parameter': 'settings-modal',
    'chord_parameter': 'settings-modal',
    'chord_potentiometer': 'settings-modal',
    'harp_potentiometer': 'settings-modal',
    'modulation_potentiometer': 'settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) return;

  const modal = document.getElementById(modalId);
  if (!modal) return;

  const config = loadParameters();
  config.then((data) => {
    const parameters = data[section] || [];
    for (const param of parameters) {
      const address = param.sysex_adress;
      originalPresetValues[address] = currentValues[address] !== undefined 
        ? currentValues[address] 
        : param.default_value;
    }
  });

  modal.style.display = 'block';
  if (section === 'rhythm_parameter') {
    checkbox_array();
  } else {
    generateSettingsForm(section);
  }
}

// Hides a modal based on the parameter group
function hideModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
    'harp_parameter': 'settings-modal',
    'chord_parameter': 'settings-modal',
    'chord_potentiometer': 'settings-modal',
    'harp_potentiometer': 'settings-modal',
    'modulation_potentiometer': 'settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) return;
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    openParamGroup = null;
    tempValues = {};
  }
}

// Updates the rhythm grid checkboxes based on current values
async function refreshRhythmGrid() {
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    const patternValue = currentValues[sysexAddress] || 0;
    rhythmPattern[step] = patternValue;
    for (let voice = 0; voice < 7; voice++) {
      const checkbox = document.getElementById(`checkbox${voice}${step}`);
      if (!checkbox) continue;
      const bit = (patternValue >> voice) & 1;
      checkbox.checked = !!bit;
    }
  }
}

// Updates the bank number display
function updateBankIndicator() {
  const bankValue = document.getElementById('current-bank-value');
  if (bankValue) {
    bankValue.textContent = (currentBankNumber + 1).toString();
  }
}

// Legacy function to reset all banks
function reset_memory() {
  if (controller.isConnected()) {
    showNotification("Resetting all banks", "success");
    return controller.resetMemory();
  } else {
    showNotification("Device not connected", "error");
    return false;
  }
}

// Legacy function to save settings to the current or target bank
function save_current_settings(targetBank) {
  if (!controller.isConnected()) {
    showNotification("Device not connected", "error");
    return false;
  }

  const bankNumber = targetBank !== undefined ? targetBank : currentBankNumber;
  console.log(`[SAVE] Saving to bank ${bankNumber + 1}`);

  // Store currentValues in bankSettings
  bankSettings[bankNumber] = { ...currentValues };

  // Send all current parameters to the device
  Object.keys(currentValues).forEach(sysex => {
    const value = currentValues[sysex];
    console.log(`[SAVE] Sending Sysex=${sysex}, value=${value}`);
    controller.sendParameter(parseInt(sysex), value);
  });

  // Send the save command
  const success = controller.saveCurrentSettings(bankNumber);
  if (!success) {
    showNotification(`Failed to save bank ${bankNumber + 1}`, "error");
    return false;
  }

  // Wait for device confirmation
  const checkSave = setInterval(async () => {
    if (!controller.pendingSave) {
      clearInterval(checkSave);
      // Request a parameter dump to confirm the save
      controller.sendSysEx([0, 0, 0, 0]);
      // Wait briefly for response
      await new Promise(resolve => setTimeout(resolve, 200));
      // Verify bankSettings against device state
      if (bankSettings[bankNumber]) {
        Object.keys(bankSettings[bankNumber]).forEach(sysex => {
          if (currentValues[sysex] !== bankSettings[bankNumber][sysex]) {
            console.warn(`[SAVE] Mismatch for bank ${bankNumber}, sysex=${sysex}: current=${currentValues[sysex]}, stored=${bankSettings[bankNumber][sysex]}`);
            currentValues[sysex] = bankSettings[bankNumber][sysex];
          }
        });
      }
      await updateUI(bankNumber);
      showNotification(`Saved to bank ${bankNumber + 1}`, "success");
    }
  }, 100);

  return true;
}

// Legacy function to reset the current bank
function reset_current_bank() {
  if (!controller.isConnected()) {
    showNotification("Device not connected", "error");
    return false;
  }

  const targetBank = parseInt(document.getElementById('bank_number_selection').value);
  console.log(`[RESET] Resetting bank ${targetBank + 1}`);

  // Send reset command
  const success = controller.resetCurrentBank(targetBank);
  if (!success) {
    showNotification(`Failed to reset bank ${targetBank + 1}`, "error");
    return false;
  }

  // Clear bank settings and reset to defaults
  bankSettings[targetBank] = { ...defaultValues };
  if (targetBank === currentBankNumber) {
    currentValues = { ...defaultValues };
  }

  // Request parameter dump to confirm reset
  controller.sendSysEx([0, 0, 0, 0]);

  // Wait for device response and update UI
  const checkReset = setInterval(async () => {
    if (!controller.pendingSave) {
      clearInterval(checkReset);
      await loadBankSettings(targetBank);
      showNotification(`Bank ${targetBank + 1} reset`, "success");
    }
  }, 100);

  return true;
}

// Adds tooltips to SVG elements
function addSvgTooltip(element, tooltipText) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = tooltipText;
  element.appendChild(title);
}

// Handles data received from the device
async function handleDataReceived(processedData) {
  if (!processedData) {
    console.warn("handleDataReceived: Received null data, skipping.");
    return;
  }

  const now = Date.now();
  if (now - lastUpdate < updateInterval) {
    console.log(`[handleDataReceived] Throttling update, lastUpdate=${lastUpdate}, now=${now}`);
    return;
  }
  lastUpdate = now;

  const { bankNumber, parameters } = processedData;
  if (!bankSettings[bankNumber]) bankSettings[bankNumber] = {};
  
  parameters.forEach((value, index) => {
    if (value !== undefined && index !== controller.firmware_adress) {
      // Skip updating parameters being edited in an open modal
      if (openParamGroup && tempValues[index] !== undefined) {
        console.log(`[handleDataReceived] Skipping Sysex=${index} update (user editing, tempValues=${tempValues[index]})`);
        return;
      }
      bankSettings[bankNumber][index] = value;
      if (bankNumber === currentBankNumber) {
        currentValues[index] = value;
        if (index >= BASE_ADDRESS_RHYTHM && index < BASE_ADDRESS_RHYTHM + 16) {
          rhythmPattern[index - BASE_ADDRESS_RHYTHM] = value;
        }
      }
      console.log(`[handleDataReceived] Sysex=${index}, value=${value}, bank=${bankNumber}, currentBank=${currentBankNumber}`);
    }
  });

  console.log(`[handleDataReceived] Updated bank ${bankNumber}, currentValues:`, currentValues);
  if (bankNumber !== currentBankNumber && !isLoadingPreset && !isInitializing) {
    await loadBankSettings(bankNumber);
  } else if (bankNumber === currentBankNumber) {
    await updateUI(bankNumber);
  }
  updateConnectionStatus(true);
  const sharpButton = document.getElementById("sharp-button");
  if (sharpButton) {
    sharpButton.classList.toggle("active", currentValues[31] === 1);
  }
}

// Main event listener for when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const svgTooltips = {
    "chord-button": "Open settings for chords",
    "sharp-button": "Toggle sharp/flat mode",
    "rhythm-button": "Open rhythm settings",
    "harp-plate": "Open harp settings",
    "chord-volume-pot": "Assign parameters to chord pot",
    "harp-volume-pot": "Assign parameters to harp pot",
    "mod-pot": "Assign parameters to mod pot",
    "power_led": "Indicates power status"
  };

  controller.onDataReceived = handleDataReceived;

  controller.onConnectionChange = function(connected, message) {
    updateConnectionStatus(connected, message);
  };

  setTimeout(() => {
    updateConnectionStatus(controller.isConnected(), `delayed check`);
  }, 1000);

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("settings-modal");
    const rhythmModal = document.getElementById("rhythm-modal");

    if (modal && e.target === modal) {
      const paramGroup = openParamGroup || "chord_parameter";
      cancelSettings(currentBankNumber, paramGroup);
      modal.style.display = "none";
      tempValues = {};
      openParamGroup = null;
    }
    if (rhythmModal && e.target === rhythmModal && !e.target.closest('.modal-content')) {
      cancelSettings(currentBankNumber, "rhythm_parameter");
      rhythmModal.style.display = "none";
      tempValues = {};
      openParamGroup = null;
    }
  });

  document.querySelectorAll(".chord-button").forEach((button) => {
    addSvgTooltip(button, svgTooltips["chord-button"]);
    button.addEventListener("click", () => openModal("chord_parameter"));
  });

  const harpPlate = document.getElementById("harp-plate");
  if (harpPlate) {
    addSvgTooltip(harpPlate, svgTooltips["harp-plate"]);
    harpPlate.addEventListener("click", () => openModal("harp_parameter"));
  }

  const potMappings = {
    "chord-volume-pot": { paramGroup: "chord_potentiometer" },
    "harp-volume-pot": { paramGroup: "harp_potentiometer" },
    "mod-pot": { paramGroup: "modulation_potentiometer" }
  };
  document.querySelectorAll(".pot").forEach(pot => {
    addSvgTooltip(pot, svgTooltips[pot.id] || "Adjust parameter");
    pot.addEventListener("click", () => openModal(potMappings[pot.id].paramGroup));
  });

  const sharpButton = document.getElementById("sharp-button");
  if (sharpButton) {
    addSvgTooltip(sharpButton, svgTooltips["sharp-button"]);
    sharpButton.addEventListener("click", () => {
      if (!controller.isConnected()) {
        showNotification("Device not connected", "error");
        return;
      }
      const currentState = currentValues[31] || 0;
      const newState = currentState === 0 ? 1 : 0;
      if (controller.sendParameter(31, newState)) {
        currentValues[31] = newState;
        bankSettings[currentBankNumber] = { ...currentValues };
        sharpButton.classList.toggle("active", newState === 1);
        showNotification(`Switched to ${newState === 1 ? 'Flat' : 'Sharp'}`, 'success');
      }
    });
  }

  const rhythmButton = document.getElementById("rhythm-button");
  if (rhythmButton) {
    addSvgTooltip(rhythmButton, "Open rhythm settings");
    rhythmButton.addEventListener("click", async () => {
      if (!controller.isConnected()) {
        showNotification("Device not connected", "error");
        return;
      }
      openParamGroup = 'rhythm_parameter';
      originalPresetValues = { ...currentValues };
      tempValues = { ...originalPresetValues };
      await checkbox_array();
      document.getElementById("rhythm-modal").style.display = 'block';
    });
  }

 const saveToBankBtn = document.getElementById('save-to-bank-btn');
  if (saveToBankBtn) {
    saveToBankBtn.addEventListener('click', async () => {
      const targetBank = parseInt(document.getElementById('bank_number_selection').value);
      if (save_current_settings(targetBank)) {
        // Wait for save to complete before loading the bank
        const checkSave = setInterval(async () => {
          if (!controller.pendingSave) {
            clearInterval(checkSave);
            await loadBankSettings(targetBank);
          }
        }, 100);
      }
    });
  }

  const exportSettingsBtn = document.getElementById('export-settings-btn');
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', () => {
      if (controller.isConnected()) {
        var sysex_array = Array(controller.parameter_size || 199).fill(0);
        for (let address = 0; address < sysex_array.length; address++) {
          const value = currentValues[address] !== undefined ? currentValues[address] : defaultValues[address] || 0;
          sysex_array[address] = value;
        }
        let output_base64 = sysex_array.join(";");
        const encoded = btoa(output_base64);
        navigator.clipboard.writeText(encoded);
        showNotification("Preset code copied to clipboard", "success");
      } else {
        showNotification("Device not connected", "error");
      }
    });
  }

  const loadSettingsBtn = document.getElementById('load-settings-btn');
  if (loadSettingsBtn) {
    loadSettingsBtn.addEventListener('click', async () => {
      if (controller.isConnected()) {
        let preset_code = prompt('Paste preset code');
        if (preset_code != null) {
          const presetParameters = decodePresetData(preset_code);
          if (presetParameters.length !== (controller.parameter_size || 199)) {
            showNotification("Malformed preset code", "error");
            return;
          }
          for (let i = 2; i < presetParameters.length; i++) {
            controller.sendParameter(i, presetParameters[i]);
          }
          controller.sendParameter(0, 0);
          currentValues = { ...defaultValues, ...presetParameters.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {}) };
          bankSettings[currentBankNumber] = { ...currentValues };
          await generateGlobalSettingsForm();
          updateLEDBankColor();
          showNotification("Preset loaded successfully", "success");
        }
      } else {
        showNotification("Device not connected", "error");
      }
    });
  }

  const resetBankBtn = document.getElementById('reset-bank-btn');
  if (resetBankBtn) {
    resetBankBtn.addEventListener('click', () => {
      const targetBank = parseInt(document.getElementById('bank_number_selection').value);
      reset_current_bank(targetBank);
      if (targetBank === currentBankNumber) {
        currentValues = { ...defaultValues };
        generateGlobalSettingsForm();
      }
    });
  }

  const resetAllBanksBtn = document.getElementById('reset-all-banks-btn');
  if (resetAllBanksBtn) {
    resetAllBanksBtn.addEventListener('click', () => {
      reset_memory();
      bankSettings = {};
      currentValues = { ...defaultValues };
      for (let i = 0; i < 12; i++) {
        bankSettings[i] = { ...defaultValues };
      }
      generateGlobalSettingsForm();
    });
  }

  init();
});