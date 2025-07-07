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

// Maps sysex addresses to human-readable parameter names for UI and logging
const sysexNameMap = {
  20: "Bank Color (Global)",
  21: "Retrigger Chords",
  22: "Change Held Strings",
  23: "Slash Level",
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
  40: "Harp Array Shuffling",
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
  77: "Harp Delay Length",
  78: "Harp Delay Filter Frequency",
  79: "Harp Delay Filter Resonance",
  80: "Harp Delay Lowpass",
  81: "Harp Delay Bandpass",
  82: "Harp Delay Highpass",
  83: "Harp Dry Mix",
  84: "Harp Delay Mix",
  85: "Harp Reverb Level",
  86: "Harp Crunch Level",
  87: "Harp Crunch Type",
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
  176: "Chord Delay Length",
  177: "Chord Delay Filter Frequency",
  178: "Chord Delay Filter Resonance",
  179: "Chord Delay Lowpass",
  180: "Chord Delay Bandpass",
  181: "Chord Delay Highpass",
  182: "Chord Dry Mix",
  183: "Chord Delay Mix",
  184: "Chord Reverb Level",
  185: "Chord Crunch Level",
  186: "Chord Crunch Type",
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

// Loads parameter definitions from parameters.json
// Why: Defines how parameters (e.g., led attenuation) are displayed and controlled
async function loadParameters() {
  try {
    const response = await fetch('parameters.json'); // Fetch parameter config
    const params = await response.json(); // Parse JSON
    console.log('[DEBUG] loadParameters: Loaded params=', params);
    console.log('[DEBUG] loadParameters: harp_parameter sysex 98=', params.harp_parameter?.find(param => param.sysex_adress === 98));
    return params; // Returns object with groups like global_parameter, harp_parameter, etc.
  } catch (error) {
    console.error('Failed to load parameters:', error);
    return {}; // Return empty object on failure
  }
}

// Sets up default values for all parameters from parameters.json
// Why: Ensures every parameter has a fallback value (e.g., led attenuation defaults to 0.5)
async function initializeDefaultValues() {
  const params = await loadParameters();
  defaultValues = {};
  Object.keys(params).forEach(group => {
    params[group].forEach(param => {
      // Scale float parameters by float_multiplier (usually 100, except bank color)
      defaultValues[param.sysex_adress] = param.data_type === "float" 
        ? param.default_value * (controller.float_multiplier || 1)
        : param.default_value;
    });
  });
  console.log('Default values initialized:', defaultValues);
}

// Updates the ambient backlight gradient based on bank color
// Why: Provides visual feedback for bank color (sysex=20) in the UI
function updateAmbientBacklight(color) {
  const backlight = document.getElementById("ambient-backlight");
  if (!backlight) {
    console.warn("Ambient backlight element not found");
    return;
  }
  backlight.style.background = `radial-gradient(circle at center, ${color} 0%, transparent 70%)`;
}

// Updates the power LED color based on bank color (sysex=20)
// Why: Visually indicates the active bank’s color on the UI
function updateLEDBankColor() {
  // Get bank color or fallback to default (120)
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
  
  // Define color palette (HSL colors for 0-23)
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
  
  // Update LED’s class and fill for color
  led.removeAttribute('fill');
  led.classList.remove(...Array.from({ length: 24 }, (_, i) => `color-${i}`));
  led.classList.add(`color-${colorIndex}`);
  led.setAttribute('fill', colorMap[colorIndex]);
  
  // Force redraw to ensure LED updates
  led.style.display = 'none';
  led.offsetHeight;
  led.style.display = '';
  updateAmbientBacklight(colorMap[colorIndex]);
  
  console.log(`Applied class: color-${colorIndex}, fill: ${colorMap[colorIndex]}`);
}

// Displays a temporary notification (e.g., "Saved settings")
// Why: Informs the user of actions like saving or errors
function showNotification(message, type = 'info') {
  const statusElement = document.getElementById("connection-status");
  if (!statusElement) {
    console.warn("Status element not found: #connection-status");
    return;
  }

  // Clear existing notification timer
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }

  // Set message and style (connected = green, disconnected = red)
  statusElement.textContent = message;
  statusElement.className = `connection-status ${type === 'success' ? 'connected' : 'disconnected'}`;

  // Clear notification after 3 seconds
  notificationTimeout = setTimeout(() => {
    notificationTimeout = null;
    updateConnectionStatus(controller.isConnected(), 'notification timeout');
  }, 3000);
}

// Decodes a base64-encoded preset string into parameter values
// Why: Allows importing preset data from a string
function decodePresetData(encodedData) {
  try {
    const decodedString = atob(encodedData); // Decode base64
    const parameters = decodedString.split(';').map(param => {
      const num = parseInt(param);
      return isNaN(num) ? 0 : num; // Convert to number or 0
    });
    return parameters;
  } catch (error) {
    console.error('Error decoding preset data:', error);
    showNotification('Invalid preset code', 'error');
    return new Array(controller.parameter_size || 199).fill(0); // Return zeros on error
  }
}

const BASE_ADDRESS_RHYTHM = 220; // Starting sysex address for rhythm data (220-235)

// Creates the rhythm settings modal with a checkbox grid and sliders
// Why: Lets users edit rhythm patterns (voices 1-7, steps 1-16) and parameters
async function checkbox_array() {
  const modal = document.getElementById('rhythm-modal');
  if (!modal) {
    console.error("Rhythm modal element not found: #rhythm-modal");
    showNotification("Rhythm modal not found", "error");
    return;
  }

  // Only rebuild modal if it’s not already populated
  if (!modal.querySelector('.modal-content')) {
    modal.innerHTML = ''; // Clear modal
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Add close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => hideModal('rhythm_parameter'));
    modalContent.appendChild(closeButton);

    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Rhythm Settings';
    modalContent.appendChild(title);

    // Create 7x16 checkbox grid for rhythm patterns
    const gridContainer = document.createElement('div');
    gridContainer.className = 'rhythm-grid';

    // Header row (steps 1-16)
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

    // Rows for voices 1-7
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

    // Add sliders for rhythm parameters (e.g., BPM)
    const params = await loadParameters();
    console.log('checkbox_array: Loaded parameters=', params);
    const rhythmParams = (params.rhythm_parameter || []).filter(param => param.group !== "hidden");
    console.log('checkbox_array: rhythmParams=', rhythmParams);
    if (rhythmParams.length > 0) {
      const slidersContainer = document.createElement('div');
      slidersContainer.className = 'parameter-column';
      const slidersHeader = document.createElement('h3');
      slidersHeader.textContent = 'Rhythm Parameters';
      slidersContainer.appendChild(slidersHeader);

      rhythmParams.forEach(param => {
        if (param.ui_type !== 'slider') {
          console.warn(`Skipping non-slider parameter: ${param.name} (sysex_adress: ${param.sysex_adress})`);
          return;
        }

        const container = document.createElement('div');
        container.className = 'parameter-row';
        const label = document.createElement('label');
        label.textContent = param.name;
        label.setAttribute('for', `param-${param.sysex_adress}`);
        label.title = param.tooltip || param.name;

        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        const input = document.createElement('input');
        input.type = 'range';
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.className = 'slider';
        input.min = param.min_value;
        input.max = param.max_value;
        const floatMultiplier = param.data_type === 'float' ? (controller.float_multiplier || 100.0) : 1;
        const currentValue = tempValues[param.sysex_adress] !== undefined
          ? tempValues[param.sysex_adress]
          : currentValues[param.sysex_adress] !== undefined
            ? currentValues[param.sysex_adress]
            : param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value;
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

        console.log(`[SLIDER] sysex=${param.sysex_adress}, name=${param.name}, currentValue=${currentValue}, floatMultiplier=${floatMultiplier}, input.value=${input.value}`);

        input.addEventListener('input', (e) => {
          const value = param.data_type === 'float' ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          valueInput.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
          console.log(`[RHYTHM] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
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
          console.log(`[RHYTHM] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
          executeMethod(param.method, value);
        });

        sliderContainer.appendChild(input);
        sliderContainer.appendChild(valueInput);
        container.appendChild(label);
        container.appendChild(sliderContainer);
        slidersContainer.appendChild(container);
      });

      modalContent.appendChild(slidersContainer);
    } else {
      console.warn('No rhythm_parameter found in parameters.json');
    }

    // Add Save and Cancel buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-buttons';
    const saveButton = document.createElement('button');
    saveButton.className = 'save-btn';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
      saveSettings(currentBankNumber, 'rhythm_parameter');
      saveSettings(currentBankNumber, 'rhythm_parameter');
      hideModal('rhythm_parameter');
    });
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-btn';
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
    // Update existing sliders in the modal
    const params = await loadParameters();
    const rhythmParams = (params.rhythm_parameter || []).filter(param => param.group !== "hidden");
    rhythmParams.forEach(param => {
      const input = document.getElementById(`param-${param.sysex_adress}`);
      const valueInput = document.getElementById(`value-${param.sysex_adress}`);
      if (input && valueInput) {
        const floatMultiplier = param.data_type === 'float' ? (controller.float_multiplier || 100.0) : 1;
        const currentValue = tempValues[param.sysex_adress] !== undefined
          ? tempValues[param.sysex_adress]
          : currentValues[param.sysex_adress] !== undefined
            ? currentValues[param.sysex_adress]
            : param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value;
        input.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
        valueInput.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
        console.log(`[SLIDER UPDATE] sysex=${param.sysex_adress}, name=${param.name}, currentValue=${currentValue}, input.value=${input.value}`);
      }
    });
  }

  modal.style.display = 'block';

  // Initialize rhythm data (sysex 220-235)
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    if (!(sysexAddress in currentValues)) {
      currentValues[sysexAddress] = 0;
      rhythmPattern[step] = 0;
    }
  }

  await new Promise(resolve => setTimeout(resolve, 0)); // Ensure DOM updates
  await refreshRhythmGrid();
  console.log('checkbox_array: Generated/Updated rhythm grid and sliders, currentValues[187-191,220-235]=', 
    Object.fromEntries(Object.entries(currentValues).filter(([k]) => (k >= 187 && k <= 191) || (k >= 220 && k <= 235))));
}

// Sends rhythm data for a specific step to the device
// Why: Updates the device when a rhythm checkbox is toggled
function sendRhythmData(step) {
  let output_value = 0;
  for (let voice = 0; voice < 7; voice++) {
    const checkbox = document.getElementById(`checkbox${voice}${step}`);
    if (checkbox && checkbox.checked) {
      output_value |= 1 << voice; // Set bit for active voice
    }
  }
  const sysexAddress = BASE_ADDRESS_RHYTHM + step;
  currentValues[sysexAddress] = output_value;
  tempValues[sysexAddress] = output_value;
  rhythmPattern[step] = output_value;
  console.log(`sendRhythmData: Step ${step + 1}, sysex=${sysexAddress}, value=${output_value}, voices=${output_value.toString(2).padStart(7, '0')}`);
  controller.sendParameter(sysexAddress, output_value);
}

// Executes parameter-specific methods (e.g., updating rhythm pattern)
// Why: Handles special actions defined in parameters.json
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

// Logs rhythm pattern updates (placeholder for synthesizer logic)
// Why: Tracks rhythm changes for debugging or future synth integration
function updateRhythm() {
  console.log('Rhythm updated:', rhythmPattern);
}

// Creates the global settings modal with sliders, switches, or selects
// Why: Allows editing global parameters like led attenuation (sysex=32)
// Note: This is where the slider visual issue (jumping to max) likely occurs
async function generateGlobalSettingsForm() {
  const params = await loadParameters();
  const form = document.querySelector(".global-settings");
  if (!form) {
    console.error("Global settings form not found: .global-settings");
    const modal = document.getElementById("global-settings-modal");
    if (!modal) {
      console.error("Global settings modal not found: #global-settings-modal");
      return;
    }
    // Create form dynamically if missing
    const newForm = document.createElement("div");
    newForm.className = "global-settings";
    newForm.innerHTML = '<div id="global-settings-form"></div>';
    modal.appendChild(newForm);
    console.log("generateGlobalSettingsForm: Created .global-settings dynamically");
  }
  const formBody = document.getElementById("global-settings-form");
  if (!formBody) {
    console.error("Global settings form body not found: #global-settings-form");
    return;
  }
  formBody.innerHTML = ""; // Clear form

  const groupParams = (params.global_parameter || []).filter(param => param.group !== "hidden");
  if (groupParams.length === 0) {
    formBody.innerHTML = "<p>No parameters available.</p>";
    return;
  }

  groupParams.forEach(param => {
    if (!param.ui_type || !["button", "switch", "slider", "select"].includes(param.ui_type)) {
      console.warn(`Invalid ui_type for global parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
      return;
    }
    const container = document.createElement("div");
    container.className = "parameter-row";
    const label = document.createElement("label");
    label.textContent = param.name;
    label.setAttribute("for", `global-param-${param.sysex_adress}`);
    label.title = param.tooltip || param.name;
    let input;
    const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 100.0);
    const currentValue = currentValues[param.sysex_adress] !== undefined 
      ? currentValues[param.sysex_adress] 
      : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);

    if (param.ui_type === "slider") {
      const sliderContainer = document.createElement("div");
      sliderContainer.className = "slider-container";
      input = document.createElement("input");
      input.type = "range";
      input.id = `param-${param.sysex_adress}`;
      input.name = param.name;
      input.className = "slider";

      const floatMultiplier = param.data_type === "float" ? (controller.float_multiplier || 100.0) : 1;

      // Set slider attributes based on param definition
      input.min = param.min_value.toString();
      input.max = param.max_value.toString();
      input.step = param.data_type === "float" ? "0.01" : "1";

      const sliderValue = param.data_type === "float"
        ? Number((currentValue / floatMultiplier).toFixed(2))
        : currentValue;

      input.value = sliderValue;
      input.title = param.tooltip || param.name;

      // Create number input box next to slider
      const valueInput = document.createElement("input");
      valueInput.type = "number";
      valueInput.id = `value-${param.sysex_adress}`;
      valueInput.min = param.min_value.toString();
      valueInput.max = param.max_value.toString();
      valueInput.step = param.data_type === "float" ? "0.01" : "1";
      valueInput.value = sliderValue;
      valueInput.title = param.tooltip || param.name;
      valueInput.className = "value-input";

      // Debug log
      console.log(`[SLIDER] sysex=${param.sysex_adress}, min=${input.min}, max=${input.max}, current=${sliderValue}, scaled=${currentValue}`);

      // Event: slider moved
      input.addEventListener("input", (e) => {
        const rawValue = parseFloat(e.target.value);
        const scaled = param.data_type === "float" ? rawValue * floatMultiplier : parseInt(rawValue);
        tempValues[param.sysex_adress] = scaled;
        valueInput.value = rawValue;
        controller.sendParameter(parseInt(param.sysex_adress), scaled);
        if (param.method) executeMethod(param.method, scaled);
      });

      // Event: number box changed
      valueInput.addEventListener("change", (e) => {
        let rawValue = parseFloat(e.target.value) || 0;
        rawValue = Math.max(param.min_value, Math.min(param.max_value, rawValue));
        const scaled = param.data_type === "float" ? rawValue * floatMultiplier : parseInt(rawValue);
        tempValues[param.sysex_adress] = scaled;
        input.value = rawValue;
        valueInput.value = rawValue;
        controller.sendParameter(parseInt(param.sysex_adress), scaled);
        if (param.method) executeMethod(param.method, scaled);
      });

      sliderContainer.appendChild(input);
      sliderContainer.appendChild(valueInput);
      container.appendChild(label);
      container.appendChild(sliderContainer);
    } else if (param.ui_type === "button" || param.ui_type === "switch") {
      // Handle switches/buttons (unchanged)
    } else if (param.ui_type === "select") {
      // Handle select inputs (unchanged)
    }
    formBody.appendChild(container);
  });

  // Add Save and Cancel buttons
  if (!form.querySelector(".settings-buttons")) {
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "settings-buttons";
    const saveBtn = document.createElement("button");
    saveBtn.id = "global-save-btn";
    saveBtn.className = "save-btn";
    saveBtn.textContent = "Save";
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "global-cancel-btn";
    cancelBtn.className = "cancel-btn";
    cancelBtn.textContent = "Cancel";
    buttonsContainer.appendChild(saveBtn);
    buttonsContainer.appendChild(cancelBtn);
    form.prepend(buttonsContainer);

    saveBtn.addEventListener("click", () => {
      saveSettings(currentBankNumber, "global_parameter");
      const modal = document.getElementById("global-settings-modal");
      if (modal) modal.style.display = "none";
      openParamGroup = null;
    });

    cancelBtn.addEventListener("click", () => {
      cancelSettings(currentBankNumber, "global_parameter");
      const modal = document.getElementById("global-settings-modal");
      if (modal) modal.style.display = "none";
      openParamGroup = null;
    });
  }
}

// Creates modals for chord, harp, or potentiometer parameters
// Why: Allows editing parameters like oscillator amplitudes or filter settings
async function generateSettingsForm(paramGroup) {
  if (paramGroup === "global_parameter") return; // Handled by generateGlobalSettingsForm
  if (paramGroup === "rhythm_parameter") {
    await checkbox_array();
    return;
  }
  const params = await loadParameters();
  const form = document.getElementById("settings-form");
  if (!form) {
    console.error("Settings form not found: #settings-form");
    return;
  }
  form.innerHTML = "";
  document.getElementById("settings-title").textContent = paramGroup.replace(/_/g, " ").toUpperCase();

  console.log(`[DEBUG] Raw parameters for ${paramGroup}:`, params[paramGroup] || []);
  const groupParams = (params[paramGroup] || []).filter(param => param.group !== "hidden");
  console.log(`[DEBUG] Filtered parameters for ${paramGroup} (excluding hidden):`, groupParams);
  if (groupParams.length === 0) {
    form.innerHTML = "<p>No parameters available for this group.</p>";
    return;
  }

  // Group parameters by their group name (e.g., "General", "Filter")
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
      console.log(`[DEBUG] Processing param: sysex=${param.sysex_adress}, name=${param.name}, ui_type=${param.ui_type}, group=${param.group}`);
      if (!param.ui_type || !["button", "switch", "slider", "select"].includes(param.ui_type)) {
        console.warn(`Invalid ui_type for parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
        return;
      }
      const container = document.createElement("div");
      container.className = "parameter-row";
      const label = document.createElement("label");
      label.textContent = param.name;
      label.setAttribute("for", `param-${param.sysex_adress}`);
      label.title = param.tooltip || param.name;
      let input;
      const floatMultiplier = param.data_type === "float" ? (controller.float_multiplier || 100.0) : 1;
      const currentValue = tempValues[param.sysex_adress] !== undefined 
        ? tempValues[param.sysex_adress] 
        : currentValues[param.sysex_adress] !== undefined 
          ? currentValues[param.sysex_adress] 
          : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
      console.log(`[DEBUG] sysex=${param.sysex_adress}, name=${param.name}, data_type=${param.data_type}, currentValue=${currentValue}, tempValues=${tempValues[param.sysex_adress]}, currentValues=${currentValues[param.sysex_adress]}, default_value=${param.default_value}`);
      if (param.ui_type === "button" || param.ui_type === "switch") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.checked = currentValue === 1;
        input.title = param.tooltip || param.name;
        input.addEventListener("change", (e) => {
          const value = e.target.checked ? 1 : 0;
          tempValues[param.sysex_adress] = value;
          console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.method) executeMethod(param.method, value);
        });
        container.appendChild(label);
        container.appendChild(input);
        console.log(`[DEBUG] Appended switch for sysex=${param.sysex_adress}, name=${param.name}`);
      } else if (param.ui_type === "slider") {
          const sliderContainer = document.createElement("div");
          sliderContainer.className = "slider-container";
          input = document.createElement("input");
          input.type = "range";
          input.id = `param-${param.sysex_adress}`;
          input.name = param.name;
          input.className = "slider";
          input.min = param.min_value.toString();
          input.max = param.max_value.toString();
          input.step = param.data_type === "float" ? "0.01" : "1";
          const sliderValue = param.data_type === "float" 
            ? Number((currentValue / floatMultiplier).toFixed(2)) 
            : currentValue;
          input.value = sliderValue.toString();
          input.title = param.tooltip || param.name;
          const valueInput = document.createElement("input");
          valueInput.type = "number";
          valueInput.id = `value-${param.sysex_adress}`;
          valueInput.min = param.min_value.toString();
          valueInput.max = param.max_value.toString();
          valueInput.step = param.data_type === "float" ? "0.01" : "1";
          valueInput.value = sliderValue.toString();
          valueInput.className = "value-input";
          valueInput.title = param.tooltip || param.name;
          console.log(`[SLIDER] sysex=${param.sysex_adress}, name=${param.name}, currentValue=${currentValue}, floatMultiplier=${floatMultiplier}, sliderValue=${sliderValue}, input.value=${input.value}, valueInput.value=${valueInput.value}, input.min=${input.min}, input.max=${input.max}, input.step=${input.step}`);

          // Force redraw for mobile browsers
          if (param.data_type === "float") {
            setTimeout(() => {
              input.value = ''; // Clear value first
              input.value = sliderValue.toString(); // Re-set value
              input.dispatchEvent(new Event('input')); // Trigger input event
              input.dispatchEvent(new Event('change')); // Trigger change event
              input.style.display = 'none'; // Force reflow
              input.offsetHeight; // Trigger reflow
              input.style.display = '';
              console.log(`[SLIDER RENDER] sysex=${param.sysex_adress}, forced input.value=${input.value}`);
            }, 100); // Increased delay for mobile
          }

          input.addEventListener("input", (e) => {
            const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)).toString() : value.toString();
            console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}, valueInput.value=${valueInput.value}`);
            controller.sendParameter(parseInt(param.sysex_adress), value);
            if (param.method) executeMethod(param.method, value);
          });

          input.addEventListener("touchend", (e) => {
            const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)).toString() : value.toString();
            console.log(`[SLIDER TOUCHEND] sysex=${param.sysex_adress}, value=${value}, name=${param.name}, valueInput.value=${valueInput.value}`);
            controller.sendParameter(parseInt(param.sysex_adress), value);
            if (param.method) executeMethod(param.method, value);
            input.dispatchEvent(new Event('input')); // Trigger input event
            input.style.display = 'none';
            input.offsetHeight;
            input.style.display = '';
          });

          valueInput.addEventListener("change", (e) => {
            let value = parseFloat(e.target.value) || 0;
            value = Math.max(param.min_value, Math.min(param.max_value, value));
            if (param.data_type === "float") value *= floatMultiplier;
            tempValues[param.sysex_adress] = value;
            const scaledValue = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
            input.value = scaledValue.toString();
            valueInput.value = scaledValue.toString();
            console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}, scaledValue=${scaledValue}, valueInput.value=${valueInput.value}`);
            controller.sendParameter(parseInt(param.sysex_adress), value);
            if (param.method) executeMethod(param.method, value);
            input.dispatchEvent(new Event('input')); // Trigger input event
          });

          sliderContainer.appendChild(input);
          sliderContainer.appendChild(valueInput);
          container.appendChild(label);
          container.appendChild(sliderContainer);
    } else if (param.ui_type === "select") {
        input = document.createElement("select");
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.title = param.tooltip || param.name;
        const isWaveform = param.name.toLowerCase().includes("waveform");
        let options;
        if (["Potentiometer", "harp_potentiometer", "mod_potentiometer"].includes(param.group)) {
          options = [];
          for (let i = param.min_value; i <= param.max_value; i++) {
            if (sysexNameMap[i]) {
              options.push({ value: i, label: sysexNameMap[i] });
            }
          }
        } else {
          options = isWaveform 
            ? Object.entries(waveformMap).map(([value, label]) => ({ value: parseInt(value), label })) 
            : (param.options || []);
        }
        if (!options.length) {
          console.warn(`No options provided for sysex=${param.sysex_adress}, name=${param.name}`);
          return;
        }
        options.forEach(option => {
          const opt = document.createElement("option");
          opt.value = option.value;
          opt.text = option.label;
          input.appendChild(opt);
        });
        input.value = String(currentValue);
        input.addEventListener("change", (e) => {
          const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}${isWaveform ? `, waveform=${waveformMap[value]}` : ''}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.method) executeMethod(param.method, value);
        });
        container.appendChild(label);
        container.appendChild(input);
      }
      column.appendChild(container);
    });
    form.appendChild(column);
  });
}

// Updates the entire UI for a given bank
// Why: Ensures all UI elements (sliders, LEDs, bank indicator) reflect the current bank’s state
async function updateUI(bankIndex) {
  console.log(`updateUI: Updating UI for bank ${bankIndex}, currentValues=`, JSON.stringify(currentValues));
  currentBankNumber = bankIndex;
  await generateGlobalSettingsForm(); // Refresh global settings modal
  updateLEDBankColor(); // Update LED color
  updateBankIndicator(); // Update bank number display

  // Update other open modals if needed
  const modal = document.getElementById("settings-modal");
  const rhythmModal = document.getElementById("rhythm-modal");

  if (modal && modal.style.display === "block" && openParamGroup && openParamGroup !== "global_parameter") {
    tempValues = { ...currentValues };
    await generateSettingsForm(openParamGroup);
  }

  if (rhythmModal && rhythmModal.style.display === "block") {
    tempValues = { ...currentValues };
    await checkbox_array();
    await refreshRhythmGrid();
  }

  const bankSelect = document.getElementById('bank_number_selection');
  if (bankSelect) bankSelect.value = bankIndex;
}

// Loads settings for a specific bank
// Why: Switches the UI and device to a new bank (e.g., bank 1)
async function loadBankSettings(bankNumber) {
  try {
    console.log(`loadBankSettings: bankNumber=${bankNumber}`);
    currentBankNumber = bankNumber;
    currentValues = bankSettings[bankNumber] || { ...defaultValues };
    console.log(`loadBankSettings: currentValues=`, JSON.stringify(currentValues));
    document.getElementById("current-bank-value").textContent = bankNumber + 1;

    if (parameters) {
      const floatMultiplier = controller.float_multiplier || 100.0;
      for (const param of [
        ...parameters.global_parameter,
        ...parameters.harp_parameter,
        ...parameters.chord_parameter,
        ...parameters.rhythm_button_parameters,
        ...parameters.rhythm_parameter,
      ]) {
        const value = currentValues[param.sysex_adress] ?? param.default_value * (param.sysex_adress === 20 ? 1 : floatMultiplier);
        controller.sendParameter(parseInt(param.sysex_adress), value);
      }
      controller.sendParameter(0, bankNumber);
      updateLEDBankColor();

      // Update existing sliders for global settings
      if (document.getElementById("global-settings").style.display !== "none") {
        document.querySelectorAll('#global-settings .slider').forEach(slider => {
          const sysex = slider.id.replace('global-param-', '');
          const param = parameters.global_parameter.find(p => p.sysex_adress == sysex);
          if (param) {
            const currentValue = currentValues[sysex] ?? param.default_value * (param.sysex_adress === 20 ? 1 : floatMultiplier);
            const sliderValue = param.data_type === "float" ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
            slider.value = sliderValue.toString();
            const valueInput = document.getElementById(`value-${sysex}`);
            if (valueInput) valueInput.value = sliderValue.toString();
            slider.dispatchEvent(new Event('input'));
            slider.dispatchEvent(new Event('change'));
            slider.style.display = 'none';
            slider.offsetHeight;
            slider.style.display = '';
            console.log(`[SLIDER UPDATE] sysex=${sysex}, name=${param.name}, sliderValue=${sliderValue}, input.value=${slider.value}, computedStyle.width=${getComputedStyle(slider).width}`);
          }
        });
      }

      // Update existing sliders for harp/chord settings
      if (document.getElementById("settings-modal").style.display === "block") {
        const paramGroup = document.getElementById("settings-form").dataset.paramGroup;
        document.querySelectorAll('#settings-modal .slider').forEach(slider => {
          const sysex = slider.id.replace('param-', '');
          const param = parameters[paramGroup]?.find(p => p.sysex_adress == sysex);
          if (param) {
            const currentValue = currentValues[sysex] ?? param.default_value * floatMultiplier;
            const sliderValue = param.data_type === "float" ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
            slider.value = sliderValue.toString();
            const valueInput = document.getElementById(`value-${sysex}`);
            if (valueInput) valueInput.value = sliderValue.toString();
            slider.dispatchEvent(new Event('input'));
            slider.dispatchEvent(new Event('change'));
            slider.style.display = 'none';
            slider.offsetHeight;
            slider.style.display = '';
            console.log(`[SLIDER UPDATE] sysex=${sysex}, name=${param.name}, sliderValue=${sliderValue}, input.value=${slider.value}, computedStyle.width=${getComputedStyle(slider).width}`);
          }
        });
      }

      // Update rhythm modal if open
      if (document.getElementById("rhythm-modal").style.display === "block") {
        checkbox_array();
        refreshRhythmGrid();
      }
    }
  } catch (error) {
    console.error("Error loading bank settings:", error);
    showNotification("Error loading bank settings", "error");
  }
}

// Processes queued MIDI responses from the device
// Why: Handles incoming data (e.g., parameter dumps) and updates the UI
async function processMidiQueue() {
  while (midiResponseQueue.length > 0) {
    const processedData = midiResponseQueue.shift();
    const bankNumber = processedData.bankNumber;
    console.log(`processMidiQueue: processing bank ${bankNumber}, active_bank_number=${controller.active_bank_number}, time=${new Date().toISOString()}`);
    if (!bankSettings[bankNumber]) {
      bankSettings[bankNumber] = {};
      processedData.parameters.forEach((value, index) => {
        if (value !== undefined) bankSettings[bankNumber][index] = value;
      });
    }
    if (bankNumber !== currentBankNumber && !isLoadingPreset && !isInitializing) {
      console.log(`processMidiQueue: triggering loadBankSettings for bank ${bankNumber}, currentBankNumber=${currentBankNumber}`);
      await loadBankSettings(bankNumber);
    } else {
      console.log(`processMidiQueue: skipped loadBankSettings: bankNumber=${bankNumber}, currentBankNumber=${currentBankNumber}, active_bank_number=${controller.active_bank_number}, isLoadingPreset=${isLoadingPreset}, isInitializing=${isInitializing}`);
    }
  }
}

// Initializes the entire application
// Why: Sets up defaults, connects to the device, and loads initial bank
async function init() {
  isInitializing = true;
  console.log('init: starting, time=', new Date().toISOString());
  showNotification("Connecting...", "info");
  try {
    if (!parameters) {
      parameters = await loadParameters();
      console.log('[DEBUG] init: Loaded parameters=', parameters);
    } else {
      console.log('[DEBUG] init: Parameters already loaded=', parameters);
    }
    await initializeDefaultValues();
    controller.initialize();
    midiResponseQueue = [];
    console.log('init: cleared midiResponseQueue');
    await loadBankSettings(0);
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Initialization failed. Check console for details.", "error");
  } finally {
    isInitializing = false;
    console.log('init: completed, time=', new Date().toISOString());
  }
}

// Updates the connection status display
// Why: Shows if the MiniChord is connected and the current bank
function updateConnectionStatus(connected, message) {
  const statusElement = document.getElementById("connection-status");
  const body = document.body;
  if (!statusElement) {
    console.warn("Status element not found: #connection-status");
    return;
  }

  if (connected) {
    statusElement.className = "connection-status connected";
    body.classList.remove("control_full");
    const bankText = currentBankNumber >= 0 ? ` | Bank ${currentBankNumber + 1}` : '';
    statusElement.textContent = `minichord connected${bankText}`;
    console.log(`updateConnectionStatus: connected, message=${message}`);
  } else {
    statusElement.className = "connection-status disconnected";
    body.classList.add("control_full");
    const elements = document.getElementsByClassName("active");
    while (elements.length > 0) {
      elements[0].classList.add("inactive");
      elements[0].classList.remove("active");
    }
    statusElement.textContent = "minichord disconnected";
    console.log(`updateConnectionStatus: disconnected, message=${message}`);
    window.scrollTo(0, 0);
  }
}
let modalEventListenersAdded = false;
// Opens a modal for editing parameters
// Why: Displays the UI for global, chord, harp, or rhythm settings
async function openModal(paramGroup) {
  console.log(`openModal: Opening modal for paramGroup=${paramGroup}`);
  openParamGroup = paramGroup;
  const modal = document.getElementById("settings-modal");
  if (!modal) {
    console.error("Settings modal element not found: #settings-modal");
    showNotification("Settings modal not found", "error");
    return;
  }

  // Save current values as original for cancel functionality
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
  console.log(`openModal: paramGroup=${paramGroup}, originalPresetValues=`, JSON.stringify(originalPresetValues));

  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
    modal.style.display = "block";
    if (originalPresetValues["42"] !== undefined) {
      const value = parseInt(originalPresetValues["42"]);
      console.log(`[MODAL] Sending sysex=42, value=${value}, name=waveform, waveform=${waveformMap[value] || value}`);
      controller.sendParameter(42, value);
    }
    return;
  }

  if (paramGroup === "rhythm_parameter") {
    const rhythmModal = document.getElementById('rhythm-modal');
    if (!rhythmModal) {
      console.error("Rhythm modal element not found: #rhythm-modal");
      showNotification("Rhythm modal not found", "error");
      return;
    }
    if (!controller.isConnected()) {
      console.warn("Rhythm modal: device not connected");
      showNotification("Device not connected", "error");
      return;
    }
    await checkbox_array();
    rhythmModal.style.display = 'block';
    return;
  }

  await generateSettingsForm(paramGroup);
  modal.style.display = "block";

  const saveBtn = document.getElementById("save-btn");
  const cancelBtn = document.getElementById("cancel-btn");

  if (!saveBtn || !cancelBtn) {
    console.error("Save or cancel button not found");
    showNotification("Modal buttons not found", "error");
    return;
  }

  // Add event listeners only once
  if (!modalEventListenersAdded) {
    saveBtn.addEventListener("click", () => {
      saveSettings(currentBankNumber, paramGroup);
      modal.style.display = "none";
      openParamGroup = null;
    });

    cancelBtn.addEventListener("click", () => {
      cancelSettings(currentBankNumber, paramGroup);
      modal.style.display = "none";
      openParamGroup = null;
    });
    modalEventListenersAdded = true;
  }
}

// Saves parameter changes to the device and UI
// Why: Commits edited values (e.g., led attenuation = 0.54) to the current bank
// Note: Slider jumping likely occurs in updateUIAfterSave
function saveSettings(presetId, paramGroup) {
  console.log(`saveSettings: before save, preset=${presetId}, tempValues=`, JSON.stringify(tempValues));
  console.log(`saveSettings: currentValues before merge=`, JSON.stringify(currentValues));
  const tempCopy = { ...tempValues };
  currentValues = { ...currentValues, ...tempValues }; // Merge temp values
  bankSettings[presetId] = { ...currentValues }; // Update bank settings
  
  if (controller.isConnected()) {
    console.log(`saveSettings: Attempting to save to bank ${presetId}, values=`, JSON.stringify(currentValues));
    const success = controller.saveCurrentSettings(presetId); // Send save command
    if (!success) {
      console.error(`saveSettings: Failed to save settings for bank ${presetId}, controller state=`, {
        isConnected: controller.isConnected(),
        active_bank_number: controller.active_bank_number
      });
      showNotification(`Failed to save bank ${presetId + 1}. Check device connection.`, "error");
      currentValues = { ...currentValues, ...tempCopy }; // Restore on failure
    } else {
      console.log(`saveSettings: Sent save command for bank ${presetId}`);
      const checkSave = setInterval(() => {
        if (!controller.pendingSave) {
          clearInterval(checkSave);
          console.log(`saveSettings: Save confirmed for bank ${presetId}, updating UI`);
          updateUIAfterSave(presetId, paramGroup);
          // Log slider state to debug visual issue
          if (paramGroup === "global_parameter") {
            const sliders = document.querySelectorAll(".slider");
            sliders.forEach(slider => {
              console.log(`[SLIDER POST-SAVE] id=${slider.id}, value=${slider.value}, min=${slider.min}, max=${slider.max}, step=${slider.step}`);
            });
          }
        }
      }, 100);
      return;
    }
  } else {
    console.warn(`saveSettings: Device not connected, cannot save bank ${presetId}`);
    showNotification("Device not connected", "error");
    currentValues = { ...currentValues, ...tempCopy };
  }

  updateUIAfterSave(presetId, paramGroup);
}

// Updates UI after saving settings
// Why: Refreshes modals and UI elements to reflect saved values
async function updateUIAfterSave(presetId, paramGroup) {
  tempValues = {}; // Clear temporary values after save
  console.log(`updateUIAfterSave: Saved preset ${presetId}, paramGroup=${paramGroup}`);

  try {
    // Refresh the appropriate modal content if the modal is still visible
    if (paramGroup === "global_parameter") {
      await generateGlobalSettingsForm();
    } else if (paramGroup === "rhythm_button_parameters" || paramGroup === "rhythm_parameter") {
      await checkbox_array();
      await refreshRhythmGrid();
    } else {
      await generateSettingsForm(paramGroup);
    }

    // Hide all relevant modals cleanly
    hideModal(paramGroup);

    // Reapply LED color (sysex 20)
    if (currentValues[20] !== undefined) {
      updateLEDBankColor();
    }

    // Show success notification
    showNotification(`Saved settings to bank ${presetId + 1}`, 'success');

    // Optional: Force visual refresh of sliders if needed
    setTimeout(() => {
      document.querySelectorAll('.slider').forEach(slider => {
        const currentValue = slider.value;
        slider.value = currentValue; // Re-apply value
        slider.dispatchEvent(new Event('input')); // Re-trigger logic
        console.log(`[SLIDER SYNC] id=${slider.id}, value=${slider.value}`);
      });
    }, 50);
  } catch (error) {
    console.error("updateUIAfterSave: Error updating UI", error);
    showNotification("Failed to refresh UI after save", "error");
  }

  // Reset open param group
  openParamGroup = null;
}


/*   // Force update all sliders
  setTimeout(() => {
    document.querySelectorAll('.slider').forEach(slider => {
      const currentValue = slider.value;
      slider.value = currentValue; // Re-apply value
      slider.dispatchEvent(new Event('input')); // Trigger input event
      slider.style.display = 'none';
      slider.offsetHeight;
      slider.style.display = '';
      console.log(`[SLIDER POST-SAVE] id=${slider.id}, value=${slider.value}`);
    }); 
  }, 100); // Increased delay for mobile*/

// Reverts changes and restores original values
// Why: Allows users to cancel edits in a modal
async function cancelSettings(bankNumber, paramGroup) {
  console.log(`cancelSettings: Restoring settings for bank ${bankNumber}, paramGroup: ${paramGroup}`);
  
  const params = await loadParameters();
  const groupParams = params[paramGroup] || [];
  if (groupParams.length === 0) {
    console.warn(`cancelSettings: No parameters found for paramGroup=${paramGroup}`);
    showNotification(`No parameters available for ${paramGroup.replace(/_/g, " ")}`, "error");
  }

  console.log(`cancelSettings: originalPresetValues=`, JSON.stringify(originalPresetValues));
  console.log(`cancelSettings: currentValues before restore=`, JSON.stringify(currentValues));

  // Restore original values for the parameter group
  groupParams.forEach(param => {
    const address = param.sysex_adress;
    if (originalPresetValues[address] !== undefined) {
      currentValues[address] = originalPresetValues[address];
      if (controller.isConnected()) {
        console.log(`[CANCEL] Restoring sysex=${address}, value=${currentValues[address]}, name=${param.name}`);
        const success = controller.sendParameter(parseInt(address), currentValues[address]);
        if (!success) {
          console.error(`[CANCEL] Failed to send sysex=${address}, value=${currentValues[address]}`);
          showNotification(`Failed to restore ${param.name}`, "error");
        }
      } else {
        console.warn(`[CANCEL] Device not connected, cannot send sysex=${address}`);
        showNotification("Device not connected", "error");
      }
    } else {
      console.warn(`[CANCEL] No original value found for sysex=${address}, name=${param.name}`);
    }
  });

  bankSettings[bankNumber] = { ...currentValues };
  console.log(`cancelSettings: currentValues after restore=`, JSON.stringify(currentValues));

  tempValues = {};

  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
    hideModal(paramGroup);
  } else if (paramGroup === "rhythm_parameter" || paramGroup === "rhythm_parameter") {
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
}

// Shows a modal based on the parameter group
// Why: Helper to open modals consistently
function showModal(section) {
  const modalMap = {
    'chord_parameter': 'settings-modal',
    'harp_parameter': 'settings-modal',
    'global_parameter': 'global-settings-modal',
    'rhythm_parameter': 'rhythm-modal',
    'rhythm_parameter': 'rhythm-modal'
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
// Why: Closes modals and clears state
function hideModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
    'rhythm_parameter': 'rhythm-modal',
    'global_parameter': 'global-settings-modal',
    'harp_parameter': 'settings-modal',
    'chord_parameter': 'settings-modal',
    'chord_potentiometer': 'settings-modal',
    'harp_potentiometer': 'settings-modal',
    'modulation_potentiometer': 'settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) {
    console.error(`No modal mapped for section: ${section}`);
    return;
  }
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    openParamGroup = null;
    tempValues = {};
    console.log(`hideModal: Closed modal for section=${section}, modalId=${modalId}`);
  } else {
    console.error(`Modal element not found: #${modalId}`);
  }
}

// Updates the rhythm grid checkboxes based on current values
// Why: Reflects rhythm pattern changes in the UI
async function refreshRhythmGrid() {
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    const patternValue = currentValues[sysexAddress] || 0;
    rhythmPattern[step] = patternValue;
    for (let voice = 0; voice < 7; voice++) {
      const checkbox = document.getElementById(`checkbox${voice}${step}`);
      if (!checkbox) {
        console.error(`refreshRhythmGrid: Checkbox not found: checkbox${voice}${step}`);
        continue;
      }
      const bit = (patternValue >> voice) & 1;
      checkbox.checked = !!bit;
    }
  }
  console.log('refreshRhythmGrid: Updated grid with currentValues[220-235]=', 
    Object.fromEntries(Object.entries(currentValues).filter(([k]) => k >= 220 && k <= 235)));
}

// Updates the bank number display
// Why: Shows the current bank (e.g., "1") in the UI
function updateBankIndicator() {
  const bankValue = document.getElementById('current-bank-value');
  if (bankValue) {
    bankValue.textContent = (currentBankNumber + 1).toString();
  }
}

// Maps a value from one range to another
// Why: Used for scaling values (not currently used in code but available)
function map_value(value, in_min, in_max, out_min, out_max) {
  return (value - in_min) * (out_max - out_min) / (in_max - in_min) + Number(out_min);
}

// Resets all banks to default values
// Why: Clears all settings on the device and UI
function reset_memory() {
  if (controller.isConnected()) {
    showNotification("Resetting all banks", "success");
    return controller.resetMemory();
  } else {
    showNotification("Device not connected", "error");
    document.getElementById("information_zone")?.focus();
    return false;
  }
}

// Saves settings to the current bank
// Why: Wrapper for saving settings via bank selection dropdown
function save_current_settings() {
  if (controller.isConnected()) {
    var e = document.getElementById("bank_number_selection");
    var bank_number = e ? parseInt(e.value) : currentBankNumber;
    console.log(`save_current_settings: bank=${bank_number}`);
    showNotification(`Saving to bank ${bank_number + 1}`, "success");
    return controller.saveCurrentSettings(bank_number);
  } else {
    showNotification("Device not connected", "error");
    document.getElementById("information_zone")?.focus();
    return false;
  }
}

// Resets the current bank to default values
// Why: Clears settings for the selected bank
function reset_current_bank() {
  if (controller.isConnected()) {
    const targetBank = parseInt(document.getElementById('bank_number_selection').value);
    console.log(`reset_current_bank: bank=${targetBank}`);
    showNotification(`Reset bank ${targetBank + 1}`, "success");
    return controller.resetCurrentBank();
  } else {
    showNotification("Device not connected", "error");
    document.getElementById("information_zone")?.focus();
    return false;
  }
}

// Adds tooltips to SVG elements
// Why: Provides hover text for UI elements like buttons and LEDs
function addSvgTooltip(element, tooltipText) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = tooltipText;
  element.appendChild(title);
}

// Main event listener for when the page loads
// Why: Sets up all UI interactions and initializes the app
document.addEventListener('DOMContentLoaded', () => {
  // Define tooltips for SVG elements
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

  // Handle MIDI data from the device
  let lastUpdate = 0;
  const updateInterval = 50; // Throttle UI updates to every 50ms

  controller.onDataReceived = async (processedData) => {
    const now = Date.now();
    if (now - lastUpdate > updateInterval) {
      lastUpdate = now;
      const { bankNumber, parameters, rhythmData } = processedData;
      console.log(`onDataReceived: Bank ${bankNumber}, rhythmData=`, rhythmData, 
        `parameters[220-235]=`, parameters.slice(220, 236));

      if (!bankSettings[bankNumber]) bankSettings[bankNumber] = {};

      // Update parameters and rhythm data
      parameters.forEach((value, index) => {
        if (value !== undefined) {
          bankSettings[bankNumber][index] = value;
          currentValues[index] = value;
          if (index >= BASE_ADDRESS_RHYTHM && index < BASE_ADDRESS_RHYTHM + 16) {
            rhythmPattern[index - BASE_ADDRESS_RHYTHM] = value;
          }
        }
      });

      if (bankNumber !== currentBankNumber) {
        currentBankNumber = bankNumber;
        const bankSelect = document.getElementById('bank_number_selection');
        if (bankSelect) bankSelect.value = bankNumber;
      }

      await updateUI(bankNumber);
      updateConnectionStatus(true);

      const sharpButton = document.getElementById("sharp-button");
      if (sharpButton) {
        sharpButton.classList.toggle("active", currentValues[31] === 1);
      }
      console.log(`onDataReceived: UI updated for bank ${bankNumber}, currentValues[220-235]=`, 
        Object.fromEntries(Object.entries(currentValues).filter(([k]) => k >= 220 && k <= 235)));
    } else {
      console.log("onDataReceived: throttled");
    }
  };

  // Handle connection changes
  controller.onConnectionChange = function(connected, message) {
    console.log(`onConnectionChange: connected=${connected}, message=${message}, isConnected=${controller.isConnected()}`);
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }
    updateConnectionStatus(connected, message);
  };

  // Check connection after 1 second
  setTimeout(() => {
    const isConnected = controller.isConnected();
    console.log(`Delayed check: minichord isConnected=${isConnected}`);
    updateConnectionStatus(isConnected, `delayed check: ${isConnected ? 'connected' : 'not connected'}`);
  }, 1000);

  // Close modals when clicking outside
  const modal = document.getElementById("settings-modal");
  const rhythmModal = document.getElementById("rhythm-modal");
  window.addEventListener("click", (e) => {
    if (modal && e.target === modal) {
      const paramGroup = openParamGroup || document.getElementById("settings-title")?.textContent.toLowerCase().replace(/ /g, "_") || "global_parameter";
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
      console.log("Closed rhythm modal via click outside");
    }
  });

  // Chord buttons
  document.querySelectorAll(".chord-button").forEach((button) => {
    addSvgTooltip(button, svgTooltips["chord-button"]);
    button.addEventListener("click", () => openModal("chord_parameter"));
  });

  // Harp plate
  const harpPlate = document.getElementById("harp-plate");
  if (harpPlate) {
    addSvgTooltip(harpPlate, svgTooltips["harp-plate"]);
    harpPlate.addEventListener("click", () => openModal("harp_parameter"));
  }

  // Potentiometer buttons
  const potMappings = {
    "chord-volume-pot": { paramGroup: "chord_potentiometer" },
    "harp-volume-pot": { paramGroup: "harp_potentiometer" },
    "mod-pot": { paramGroup: "modulation_potentiometer" }
  };
  document.querySelectorAll(".pot").forEach(pot => {
    addSvgTooltip(pot, svgTooltips[pot.id] || "Adjust parameter");
    pot.addEventListener("click", () => openModal(potMappings[pot.id].paramGroup));
  });

  // Sharp/Flat button
  const sharpButton = document.getElementById("sharp-button");
  if (sharpButton) {
    addSvgTooltip(sharpButton, svgTooltips["sharp-button"]);
    sharpButton.addEventListener("click", () => {
      if (!controller.isConnected()) {
        console.warn("Sharp button: device not connected");
        showNotification("Device not connected", "error");
        return;
      }
      const currentState = currentValues[31] || 0;
      const newState = currentState === 0 ? 1 : 0;
      if (controller.sendParameter(31, newState)) {
        currentValues[31] = newState;
        bankSettings[currentBankNumber] = { ...currentValues };
        sharpButton.classList.toggle("active", newState === 1);
        const toggleInput = document.getElementById("global-param-31");
        if (toggleInput) {
          toggleInput.checked = newState === 1;
          toggleInput.nextElementSibling.classList.toggle("checked", newState === 1);
          toggleInput.parentElement.style.display = 'none';
          toggleInput.parentElement.offsetHeight;
          toggleInput.parentElement.style.display = '';
          console.log(`Sharp button: synced toggle switch to state=${newState === 1 ? 'Flat' : 'Sharp'}`);
        }
        console.log(`Sharp button: sent sysex=31, value=${newState}, state=${newState === 1 ? 'Flat' : 'Sharp'}`);
        showNotification(`Switched to ${newState === 1 ? 'Flat' : 'Sharp'}`, 'success');
      } else {
        console.error("Sharp button: failed to send parameter");
        showNotification("Failed to switch Sharp/Flat", "error");
      }
    });
  }

  // Rhythm button
  const rhythmButton = document.getElementById("rhythm-button");
  if (rhythmButton) {
    addSvgTooltip(rhythmButton, "Open rhythm settings");
    rhythmButton.addEventListener("click", async () => {
      if (!controller.isConnected()) {
        console.warn("Rhythm button: device not connected");
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

  // Save to bank
  const saveToBankBtn = document.getElementById('save-to-bank-btn');
  if (saveToBankBtn) {
    saveToBankBtn.addEventListener('click', () => {
      const targetBank = parseInt(document.getElementById('bank_number_selection').value);
      console.log(`Saving to target bank ${targetBank + 1}`);
      save_current_settings(targetBank);
      loadBankSettings(targetBank);
      console.log(`Switched to bank ${targetBank + 1}`);
    });
  }

  // Export settings
  const exportSettingsBtn = document.getElementById('export-settings-btn');
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', () => {
      if (controller.isConnected()) {
        var sysex_array = Array(controller.parameter_size || 199).fill(0);
        for (let address = 0; address < sysex_array.length; address++) {
          const value = currentValues[address] !== undefined ? currentValues[address] : defaultValues[address] || 0;
          if (parameters.global_parameter.some(param => param.sysex_adress == address) || 
              parameters.harp_parameter.some(param => param.sysex_adress == address) || 
              parameters.chord_parameter.some(param => param.sysex_adress == address) ||
              parameters.rhythm_parameter.some(param => param.sysex_adress == address)) {
            sysex_array[address] = value;
          }
        }
        let output_base64 = "";
        for (let i = 0; i < sysex_array.length - 1; i++) {
          output_base64 += sysex_array[i] + ";";
        }
        output_base64 += sysex_array[sysex_array.length - 1];
        const encoded = btoa(output_base64);
        console.log(encoded);
        navigator.clipboard.writeText(encoded);
        showNotification("Preset code copied to clipboard", "success");
        console.log(atob(encoded));
        document.getElementById("output_zone") && (document.getElementById("output_zone").innerHTML = `{${sysex_array.join(",")}},`);
      } else {
        showNotification("Device not connected", "error");
        document.getElementById("information_zone")?.focus();
      }
    });
  }

  // Load settings
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
        try {
          const params = await loadParameters(); // Load parameters fresh
          if (!params.global_parameter) {
            showNotification("Invalid parameters.json: missing global_parameter", "error");
            return;
          }
          for (let i = 2; i < presetParameters.length; i++) {
            if (
              params.global_parameter.some(param => param.sysex_adress == i) ||
              params.harp_parameter?.some(param => param.sysex_adress == i) ||
              params.chord_parameter?.some(param => param.sysex_adress == i) ||
              params.rhythm_parameter?.some(param => param.sysex_adress == i)
            ) {
              controller.sendParameter(i, presetParameters[i]);
            }
          }
          controller.sendParameter(0, 0);
          currentValues = { ...defaultValues, ...presetParameters.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {}) };
          bankSettings[currentBankNumber] = { ...currentValues };
          await generateGlobalSettingsForm();
          updateLEDBankColor();
          showNotification("Preset loaded successfully", "success");
        } catch (error) {
          console.error('Error loading preset:', error);
          showNotification("Error loading preset", "error");
        }
      }
    } else {
      showNotification("Device not connected", "error");
      document.getElementById("information_zone")?.focus();
    }
  });
}

  // Reset bank
  const resetBankBtn = document.getElementById('reset-bank-btn');
  if (resetBankBtn) {
    resetBankBtn.addEventListener('click', () => {
      const targetBank = parseInt(document.getElementById('bank_number_selection').value);
      reset_current_bank(targetBank);
      if (targetBank === currentBankNumber) {
        currentValues = { ...defaultValues };
        generateGlobalSettingsForm();
      }
      console.log(`Reset bank ${targetBank + 1}`);
    });
  }

  // Reset all banks
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
      console.log('Reset all banks');
    });
  }

  init(); // Start the app
});