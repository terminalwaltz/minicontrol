// State
const controller = new MiniChordController();
let parameters = null;
let bankSettings = {};
let currentBank = 0;
let currentValues = {};
let tempValues = {};
let defaultValues = {};

// Load parameters.json
async function loadParameters() {
  if (parameters) return parameters;
  try {
    console.log('[INIT] Loading parameters.json...');
    const response = await fetch('parameters.json');
    parameters = await response.json();
    console.log('[INIT] parameters.json loaded successfully');
    return parameters;
  } catch (err) {
    console.error('[INIT] Failed to load parameters.json:', err);
    return {};
  }
}

// Initialize default values
async function initDefaults() {
  console.log('[INIT] Initializing default values...');
  const params = await loadParameters();
  defaultValues = {};
  Object.entries(params).forEach(([group, paramList]) => {
    paramList.forEach(param => {
      const value = param.default_value !== undefined 
        ? (param.data_type === 'float' ? param.default_value * controller.floatMultiplier : param.default_value)
        : (param.data_type === 'float' ? 0 : 0);
      defaultValues[param.sysex_adress] = value;
    });
  });
  for (let i = 0; i < controller.parameterSize; i++) {
    if (defaultValues[i] === undefined) {
      defaultValues[i] = 0;
    }
  }
  console.log('[INIT] Default values initialized:', defaultValues);
}

// Update LED color
function updateLedColor() {
  const hue = currentValues[20] || defaultValues[20] || 120;
  const attenuation = (currentValues[32] || defaultValues[32] || 0) / controller.floatMultiplier;
  const led = document.getElementById('power_led');
  if (led) {
    led.setAttribute('fill', `hsl(${hue}, 70%, ${Math.max(10, 50 * (1 - attenuation))}%)`);
  }
}

// Show notification
function showNotification(message, type = 'info') {
  console.log(`[NOTIFY] ${message} (type: ${type})`);
  const status = document.getElementById('connection-status');
  if (status) {
    status.textContent = `● ${message}`;
    status.className = `connection-status ${type}`;
    setTimeout(() => {
      status.textContent = controller.isConnected() ? `● MiniChord connected | Bank ${currentBank + 1}` : '● MiniChord disconnected';
      status.className = `connection-status ${controller.isConnected() ? 'connected' : 'disconnected'}`;
    }, 3000);
  }
}

// Generate parameter modal
async function openModal(paramGroup) {
  const isRhythm = paramGroup === 'rhythm_parameter';
  const modal = isRhythm ? document.getElementById('rhythm-modal') : document.getElementById('settings-modal');
  if (!modal) {
    console.error(`[MODAL] Modal not found for group: ${paramGroup}`);
    return;
  }
  tempValues = { ...currentValues };
  modal.innerHTML = `<div class="modal-content">
    <span class="close-button" onclick="closeModal('${paramGroup}')">×</span>
    <h2>${paramGroup.replace(/_/g, ' ').toUpperCase()}</h2>
  </div>`;
  const content = modal.querySelector('.modal-content');
  let params = (await loadParameters())[paramGroup] || [];
  if (paramGroup === 'potentiometer_parameter') {
    const allParams = await loadParameters();
    params = [
      ...(allParams.chord_potentiometer || []),
      ...(allParams.harp_potentiometer || []),
      ...(allParams.modulation_potentiometer || [])
    ];
  }
  const groupedParams = params.reduce((acc, param) => {
    if (param.group !== 'hidden' && !(isRhythm && param.sysex_adress >= 220 && param.sysex_adress <= 235)) {
      acc[param.group] = acc[param.group] || [];
      acc[param.group].push(param);
    }
    return acc;
  }, {});
  if (isRhythm) {
    const grid = document.createElement('div');
    grid.className = 'rhythm-grid';
    const header = document.createElement('div');
    header.className = 'rhythm-row header';
    header.innerHTML = '<div class="rhythm-cell">Voice</div>' + Array(16).fill().map((_, i) => `<div class="rhythm-cell">${i + 1}</div>`).join('');
    grid.appendChild(header);
    for (let voice = 0; voice < 7; voice++) {
      const row = document.createElement('div');
      row.className = 'rhythm-row';
      row.innerHTML = `<div class="rhythm-cell">Voice ${voice + 1}</div>`;
      for (let step = 0; step < 16; step++) {
        const cell = document.createElement('div');
        cell.className = 'rhythm-cell';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!(currentValues[220 + step] & (1 << voice));
        checkbox.id = `checkbox${voice}${step}`;
        checkbox.onchange = async () => {
          const value = Array(16).fill(0);
          for (let s = 0; s < 16; s++) {
            for (let v = 0; v < 7; v++) {
              if (document.getElementById(`checkbox${v}${s}`)?.checked) {
                value[s] |= 1 << v;
              }
            }
            tempValues[220 + s] = value[s];
            await controller.sendParameter(220 + s, value[s]);
          }
        };
        cell.appendChild(checkbox);
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
    content.appendChild(grid);
    if (groupedParams['Rhythm']) {
      const rhythmParams = document.createElement('div');
      rhythmParams.className = 'parameter-group';
      rhythmParams.innerHTML = '<h3>Rhythm Settings</h3>';
      groupedParams['Rhythm'].forEach(param => {
        const control = createParameterControl(param);
        if (control) rhythmParams.appendChild(control);
      });
      content.appendChild(rhythmParams);
    }
  } else {
    Object.entries(groupedParams).forEach(([groupName, paramList]) => {
      const group = document.createElement('div');
      group.className = 'parameter-group';
      group.innerHTML = `<h3>${groupName}</h3>`;
      paramList.forEach(param => {
        const control = createParameterControl(param);
        if (control) group.appendChild(control);
      });
      content.appendChild(group);
    });
  }
  const buttons = document.createElement('div');
  buttons.className = 'modal-buttons';
  buttons.innerHTML = `
    <button onclick="saveModal('${paramGroup}')">Save</button>
    <button onclick="closeModal('${paramGroup}')">Cancel</button>
  `;
  content.appendChild(buttons);
  modal.style.display = 'block';
}

// Create parameter control
function createParameterControl(param) {
  if (!param || !param.sysex_adress || !param.name) {
    console.warn('[MODAL] Invalid parameter:', param);
    return null;
  }
  const row = document.createElement('div');
  row.className = 'parameter-row';
  const floatMultiplier = param.data_type === 'float' ? controller.floatMultiplier : 1;
  const value = tempValues[param.sysex_adress] ?? currentValues[param.sysex_adress] ?? defaultValues[param.sysex_adress] ?? 0;

  if (param.ui_type === 'switch') {
    row.innerHTML = `<label for="param-${param.sysex_adress}">${param.name}</label>`;
    const inputElement = document.createElement('input');
    inputElement.type = 'checkbox';
    inputElement.id = `param-${param.sysex_adress}`;
    inputElement.checked = !!value;
    inputElement.onchange = async () => {
      tempValues[param.sysex_adress] = inputElement.checked ? 1 : 0;
      await controller.sendParameter(param.sysex_adress, tempValues[param.sysex_adress]);
      if (param.sysex_adress === 20 || param.sysex_adress === 32) updateLedColor();
    };
    row.appendChild(inputElement);
  } else if (param.ui_type === 'select' && param.options?.length) {
    row.innerHTML = `<label for="param-${param.sysex_adress}">${param.name}</label>`;
    const inputElement = document.createElement('select');
    inputElement.id = `param-${param.sysex_adress}`;
    param.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value == value) option.selected = true;
      inputElement.appendChild(option);
    });
    inputElement.onchange = async () => {
      tempValues[param.sysex_adress] = parseInt(inputElement.value);
      await controller.sendParameter(param.sysex_adress, tempValues[param.sysex_adress]);
      if (param.sysex_adress === 20 || param.sysex_adress === 32) updateLedColor();
    };
    row.appendChild(inputElement);
  } else {
    row.innerHTML = `
      <label for="param-${param.sysex_adress}">${param.name}</label>
      <div class="slider-container">
        <input type="range" id="param-${param.sysex_adress}" class="slider"
               min="${param.min_value ?? 0}" max="${param.max_value ?? 100}" step="${param.data_type === 'float' ? 0.01 : 1}"
               value="${param.data_type === 'float' ? (value / floatMultiplier).toFixed(2) : value}">
        <input type="number" class="value-input" value="${param.data_type === 'float' ? (value / floatMultiplier).toFixed(2) : value}"
               min="${param.min_value ?? 0}" max="${param.max_value ?? 100}" step="${param.data_type === 'float' ? 0.01 : 1}">
      </div>
    `;
    const slider = row.querySelector('.slider');
    const input = row.querySelector('.value-input');
    slider.oninput = async () => {
      const val = param.data_type === 'float' ? parseFloat(slider.value) * floatMultiplier : parseInt(slider.value);
      tempValues[param.sysex_adress] = val;
      input.value = param.data_type === 'float' ? (val / floatMultiplier).toFixed(2) : val;
      await controller.sendParameter(param.sysex_adress, val, param.data_type === 'float');
      if (param.sysex_adress === 20 || param.sysex_adress === 32) updateLedColor();
    };
    input.onchange = async () => {
      let val = parseFloat(input.value);
      val = Math.max(param.min_value ?? 0, Math.min(param.max_value ?? 100, val));
      val = param.data_type === 'float' ? val * floatMultiplier : Math.round(val);
      tempValues[param.sysex_adress] = val;
      slider.value = param.data_type === 'float' ? val / floatMultiplier : val;
      await controller.sendParameter(param.sysex_adress, val, param.data_type === 'float');
      if (param.sysex_adress === 20 || param.sysex_adress === 32) updateLedColor();
    };
  }
  row.title = param.tooltip || '';
  return row;
}

async function saveModal(paramGroup) {
  Object.assign(currentValues, tempValues);
  bankSettings[currentBank] = { ...currentValues };
  if (controller.isConnected()) {
    const params = await loadParameters();
    for (const [sysex, value] of Object.entries(tempValues)) {
      const param = Object.values(params).flat().find(p => p.sysex_adress == sysex);
      if (param && value !== undefined && !isNaN(value)) {
        await controller.sendParameter(sysex, value, param.data_type === 'float');
      }
    }
    if (await controller.saveBank(currentBank)) {
      showNotification(`Saved to bank ${currentBank + 1}`, 'success');
    } else {
      showNotification(`Failed to save bank ${currentBank + 1}`, 'error');
    }
  } else {
    showNotification('Cannot save: MiniChord disconnected', 'error');
  }
  closeModal(paramGroup);
}

function closeModal(paramGroup) {
  const modal = paramGroup === 'rhythm_parameter' ? document.getElementById('rhythm-modal') : document.getElementById('settings-modal');
  if (modal) {
    modal.style.display = 'none';
    tempValues = {};
  }
}

async function loadBank(bankNumber) {
  console.log('[BANK] Loading bank:', bankNumber);
  currentBank = bankNumber;
  currentValues = bankSettings[bankNumber] ? { ...bankSettings[bankNumber] } : { ...defaultValues };
  if (controller.isConnected()) {
    const params = await loadParameters();
    for (const group of Object.keys(params)) {
      if (group !== 'hidden') {
        for (const param of params[group]) {
          const value = currentValues[param.sysex_adress] ?? defaultValues[param.sysex_adress] ?? 0;
          if (!isNaN(value)) {
            await controller.sendParameter(param.sysex_adress, value, param.data_type === 'float');
          }
        }
      }
    }
  }
  updateUI();
  showNotification(`Loaded bank ${bankNumber + 1}`, 'success');
}

function updateUI() {
  document.getElementById('bank_number_selection').value = currentBank;
  updateLedColor();
  ['settings-modal', 'rhythm-modal'].forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal && modal.style.display === 'block') {
      const paramGroup = modalId === 'rhythm-modal' ? 'rhythm_parameter' : modal.querySelector('h2').textContent.toLowerCase().replace(/ /g, '_');
      openModal(paramGroup);
    }
  });
}

// Initialize
async function init() {
  console.log('[INIT] Starting initialization...');
  await initDefaults();
  controller.onConnectionChange = (connected, message) => {
    console.log(`[INIT] Connection change: ${message}, connected: ${connected}`);
    showNotification(message, connected ? 'success' : 'error');
  };
  controller.onDataReceived = (data) => {
    console.log('[INIT] Data received:', data);
    bankSettings[data.bankNumber] = data.parameters.reduce((acc, val, i) => {
      acc[i] = isNaN(val) ? (defaultValues[i] ?? 0) : val;
      return acc;
    }, {});
    if (data.bankNumber === currentBank) {
      currentValues = { ...bankSettings[data.bankNumber] };
      updateUI();
    }
  };
  const connected = await controller.initialize();
  console.log('[INIT] MIDI initialization result:', connected);
  if (connected) {
    await loadBank(0);
  } else {
    console.warn('[INIT] Using default values due to no MIDI connection');
    currentValues = { ...defaultValues };
    bankSettings[0] = { ...defaultValues };
    updateUI();
  }
}

// DOM setup
document.addEventListener('DOMContentLoaded', () => {
  console.log('[INIT] DOM loaded, initializing...');
  init();
  document.querySelectorAll('.chord-button').forEach(btn => {
    btn.addEventListener('click', () => openModal('chord_parameter'));
  });
  document.getElementById('harp-plate')?.addEventListener('click', () => openModal('harp_parameter'));
  document.getElementById('rhythm-button')?.addEventListener('click', () => openModal('rhythm_parameter'));
  document.getElementById('sharp-button')?.addEventListener('click', () => openModal('sharp_button_parameter'));
  document.getElementById('chord-volume-pot')?.addEventListener('click', () => openModal('potentiometer_parameter'));
  document.getElementById('harp-volume-pot')?.addEventListener('click', () => openModal('potentiometer_parameter'));
  document.getElementById('mod-pot')?.addEventListener('click', () => openModal('potentiometer_parameter'));
  document.getElementById('preset-up')?.addEventListener('click', () => {
    const newBank = (currentBank + 1) % 12;
    loadBank(newBank);
  });
  document.getElementById('preset-down')?.addEventListener('click', () => {
    const newBank = (currentBank - 1 + 12) % 12;
    loadBank(newBank);
  });
  document.getElementById('bank_number_selection')?.addEventListener('change', (e) => loadBank(parseInt(e.target.value)));
  document.getElementById('save-to-bank-btn')?.addEventListener('click', async () => {
    const bank = parseInt(document.getElementById('bank_number_selection').value);
    if (controller.isConnected()) {
      const params = await loadParameters();
      for (const [sysex, value] of Object.entries(currentValues)) {
        const param = Object.values(params).flat().find(p => p.sysex_adress == sysex);
        if (param && !isNaN(value)) {
          await controller.sendParameter(sysex, value, param.data_type === 'float');
        }
      }
      await controller.saveBank(bank);
    } else {
      showNotification('Cannot save: MiniChord disconnected', 'error');
    }
    bankSettings[bank] = { ...currentValues };
    await loadBank(bank);
  });
  document.getElementById('export-settings-btn')?.addEventListener('click', () => {
    const sysexArray = Array(controller.parameterSize).fill(0);
    for (const [sysex, value] of Object.entries(currentValues)) {
      sysexArray[sysex] = !isNaN(value) ? value : 0;
    }
    const encoded = btoa(sysexArray.join(';'));
    navigator.clipboard.writeText(encoded);
    showNotification('Preset copied to clipboard', 'success');
  });
  document.getElementById('load-settings-btn')?.addEventListener('click', async () => {
    const code = prompt('Paste preset code');
    if (code) {
      const values = atob(code).split(';').map(v => parseInt(v) || 0);
      if (values.length === controller.parameterSize) {
        currentValues = values.reduce((acc, val, i) => ({ ...acc, [i]: val }), {});
        bankSettings[currentBank] = { ...currentValues };
        if (controller.isConnected()) {
          const params = await loadParameters();
          for (const [sysex, value] of Object.entries(currentValues)) {
            const param = Object.values(params).flat().find(p => p.sysex_adress == sysex);
            if (param && !isNaN(value)) {
              await controller.sendParameter(sysex, value, param.data_type === 'float');
            }
          }
          await controller.saveBank(currentBank);
        }
        updateUI();
        showNotification('Preset loaded', 'success');
      } else {
        showNotification('Invalid preset code', 'error');
      }
    }
  });
  document.getElementById('reset-bank-btn')?.addEventListener('click', async () => {
    if (controller.isConnected()) {
      await controller.resetBank(currentBank);
    } else {
      showNotification('Cannot reset: MiniChord disconnected', 'error');
    }
    bankSettings[currentBank] = { ...defaultValues };
    await loadBank(currentBank);
  });
  document.getElementById('reset-all-banks-btn')?.addEventListener('click', async () => {
    if (controller.isConnected()) {
      await controller.resetAllBanks();
    } else {
      showNotification('Cannot reset all banks: MiniChord disconnected', 'error');
    }
    bankSettings = {};
    for (let i = 0; i < 12; i++) bankSettings[i] = { ...defaultValues };
    await loadBank(currentBank);
  });
});