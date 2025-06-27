var parameters = null;
var currentValues = {};
var activeHarpNotes = [];
var activeChordNotes = [];
var controller = new MiniChordController();
var tempValues = {};
var bankSettings = {};
var currentPreset = 0;
var presetNames = JSON.parse(localStorage.getItem('presetNames')) || {};
const bankNames = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
let defaultValues = {};

async function loadParameters() {
    if (!parameters) {
        try {
            const response = await fetch('parameters.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            parameters = await response.json();
        } catch (error) {
            console.error('Error loading parameters.json:', error);
            parameters = { global_parameter: [], harp_parameter: [], chord_parameter: [] };
        }
    }
    return parameters;
}

async function initializeDefaultValues() {
    const params = await loadParameters();
    defaultValues = {};
    Object.keys(params).forEach(group => {
        params[group].forEach(param => {
            defaultValues[param.sysex_adress] = param.data_type === "float" 
                ? param.default_value * (controller.float_multiplier || 1)
                : param.default_value;
        });
    });
    console.log('Default values initialized:', defaultValues);
}

function updatePresetButtons() {
    const presetButtons = document.querySelectorAll(".preset-button");
    if (presetButtons.length === 0) {
        console.warn("No preset buttons found: .preset-button");
        return;
    }
    presetButtons.forEach((button, index) => {
        button.classList.remove("active");
        if (index === currentPreset) {
            button.classList.add("active");
        }
    });
    console.log(`Updated preset buttons: currentPreset=${currentPreset}`);
}

function updateLEDBankColor() {
    const bankColor = currentValues[20] !== undefined ? currentValues[20] : defaultValues[20] !== undefined ? defaultValues[20] : 120;
    // Force floatMultiplier=1 for sysex 20 (int type)
    const floatMultiplier = 1; // Ignore controller.float_multiplier for bank color
    const normalizedColor = bankColor / floatMultiplier;
    const colorIndex = Math.min(23, Math.floor(normalizedColor / 15));
    
    console.log(`updateLEDBankColor: bankColor=${bankColor}, floatMultiplier=${floatMultiplier}, controller.float_multiplier=${controller.float_multiplier}, normalizedColor=${normalizedColor}, colorIndex=${colorIndex}, currentPreset=${currentPreset}, bankSettings[${currentPreset}][20]=${bankSettings[currentPreset]?.[20]}, defaultValues[20]=${defaultValues[20]}`);
    
    const led = document.getElementById("power_led");
    if (!led) {
        console.error("Power LED element not found: #power_led");
        return;
    }
    
    const colorMap = {
        0: 'hsl(0, 70%, 50%)',    // Red
        1: 'hsl(15, 70%, 50%)',   // Red-Orange
        2: 'hsl(30, 70%, 50%)',   // Orange-Red
        3: 'hsl(45, 70%, 50%)',   // Orange
        4: 'hsl(60, 70%, 50%)',   // Yellow-Orange
        5: 'hsl(75, 70%, 50%)',   // Yellow
        6: 'hsl(90, 70%, 50%)',   // Yellow-Green
        7: 'hsl(105, 70%, 50%)',  // Lime
        8: 'hsl(120, 70%, 50%)',  // Green
        9: 'hsl(135, 70%, 50%)',  // Green-Cyan
        10: 'hsl(150, 70%, 50%)', // Cyan-Green
        11: 'hsl(165, 70%, 50%)', // Cyan
        12: 'hsl(180, 70%, 50%)', // Cyan-Blue
        13: 'hsl(195, 70%, 50%)', // Light Blue
        14: 'hsl(210, 70%, 50%)', // Blue-Cyan
        15: 'hsl(225, 70%, 50%)', // Blue
        16: 'hsl(240, 70%, 50%)', // Blue-Purple
        17: 'hsl(255, 70%, 50%)', // Indigo
        18: 'hsl(270, 70%, 50%)', // Purple
        19: 'hsl(285, 70%, 50%)', // Purple-Magenta
        20: 'hsl(300, 70%, 50%)', // Magenta
        21: 'hsl(315, 70%, 50%)', // Magenta-Red
        22: 'hsl(330, 70%, 50%)', // Pink
        23: 'hsl(345, 70%, 50%)'  // Red-Pink
    };
    
    led.removeAttribute('fill');
    led.classList.remove(...Array.from({ length: 24 }, (_, i) => `color-${i}`));
    led.classList.add(`color-${colorIndex}`);
    led.setAttribute('fill', colorMap[colorIndex]);
    
    // Force SVG repaint
    led.style.display = 'none';
    led.offsetHeight; // Trigger reflow
    led.style.display = '';
    
    console.log(`Applied class: color-${colorIndex}, fill: ${colorMap[colorIndex]}, current classes: ${led.className}, fill attribute: ${led.getAttribute('fill')}`);
}

async function generateGlobalSettingsForm() {
    const params = await loadParameters();
    const form = document.querySelector(".global-settings");
    if (!form) {
        console.error("Global settings form not found: .global-settings");
        return;
    }
    form.innerHTML = "";

    const groupParams = (params.global_parameter || []).filter(param => param.group !== "hidden");
    if (groupParams.length === 0) {
        form.innerHTML = "<p>No parameters available.</p>";
        return;
    }

    groupParams.forEach(param => {
        if (!param.ui_type || !["button", "switch", "slider", "select"].includes(param.ui_type)) {
            console.warn(`Invalid ui_type for global parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
            return;
        }
        const container = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = param.name;
        label.setAttribute("for", `global-param-${param.sysex_adress}`);
        let input;
        const currentValue = currentValues[param.sysex_adress] !== undefined 
            ? currentValues[param.sysex_adress] 
            : (param.data_type === "float" ? param.default_value * (controller.float_multiplier || 1) : param.default_value);
        if (param.ui_type === "button" || param.ui_type === "switch") {
            input = document.createElement("input");
            input.type = "checkbox";
            input.id = `global-param-${param.sysex_adress}`;
            input.name = param.name;
            input.checked = currentValue === 1;
            input.addEventListener("change", (e) => {
                const value = e.target.checked ? 1 : 0;
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                controller.sendParameter(parseInt(param.sysex_adress), value);
            });
        } else if (param.ui_type === "slider") {
            input = document.createElement("input");
            input.type = "range";
            input.id = `global-param-${param.sysex_adress}`;
            input.name = param.name;
            input.min = param.min_value;
            input.max = param.max_value;
            input.value = currentValue / (param.data_type === "float" ? controller.float_multiplier || 1 : 1);
            input.step = param.data_type === "float" ? 0.01 : 1;
            input.addEventListener("input", (e) => {
                const value = param.data_type === "float" ? parseFloat(e.target.value) * (controller.float_multiplier || 1) : parseInt(e.target.value);
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                controller.sendParameter(parseInt(param.sysex_adress), value);
                if (param.sysex_adress === 20) {
                    console.log(`Global slider changed: sysex=20, value=${value}`);
                    updateLEDBankColor();
                }
            });
        } else if (param.ui_type === "select") {
            input = document.createElement("select");
            input.id = `global-param-${param.sysex_adress}`;
            input.name = param.name;
            for (let i = param.min_value; i <= param.max_value; i++) {
                const option = document.createElement("option");
                option.value = i;
                option.textContent = param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
                input.appendChild(option);
            }
            input.value = currentValue;
            input.addEventListener("change", (e) => {
                const value = parseInt(e.target.value);
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                controller.sendParameter(parseInt(param.sysex_adress), value);
                if (param.sysex_adress === 20) {
                    console.log(`Global select changed: sysex=20, value=${value}`);
                    updateLEDBankColor();
                }
            });
        }
        container.appendChild(label);
        container.appendChild(input);
        form.appendChild(container);
    });
}

async function generateSettingsForm(paramGroup) {
    if (paramGroup === "global_parameter") return;
    const params = await loadParameters();
    const form = document.getElementById("settings-form");
    if (!form) {
        console.error("Settings form not found: #settings-form");
        return;
    }
    form.innerHTML = "";
    document.getElementById("settings-title").textContent = paramGroup.replace(/_/g, " ").toUpperCase();

    const groupParams = (params[paramGroup] || []).filter(param => param.group !== "hidden");
    if (groupParams.length === 0) {
        form.innerHTML = "<p>No parameters available for this group.</p>";
        return;
    }

    const groupedParams = {};
    groupParams.forEach(param => {
        const groupName = param.group || "Other";
        if (!groupedParams[groupName]) groupedParams[groupName] = [];
        groupedParams[groupName].push(param);
    });

    tempValues = { ...currentValues };

    Object.keys(groupedParams).forEach(groupName => {
        const column = document.createElement("div");
        column.className = "parameter-column";
        const header = document.createElement("h3");
        header.textContent = groupName;
        column.appendChild(header);

        if (groupName === "Rhythm") {
            const rhythmContainer = document.createElement("div");
            rhythmContainer.className = "rhythm-grid";
            groupedParams[groupName].forEach(param => {
                if (!param.ui_type || !["slider"].includes(param.ui_type)) {
                    console.warn(`Invalid ui_type for rhythm parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
                    return;
                }
                const container = document.createElement("div");
                const label = document.createElement("label");
                label.textContent = param.name.replace("rhythm pattern step ", "Step ");
                label.setAttribute("for", `param-${param.sysex_adress}`);
                const input = document.createElement("input");
                input.type = "range";
                input.id = `param-${param.sysex_adress}`;
                input.name = param.name;
                input.min = param.min_value;
                input.max = param.max_value;
                const currentValue = currentValues[param.sysex_adress] !== undefined 
                    ? currentValues[param.sysex_adress] 
                    : (param.data_type === "float" ? param.default_value * (controller.float_multiplier || 1) : param.default_value);
                input.value = currentValue / (param.data_type === "float" ? controller.float_multiplier || 1 : 1);
                input.step = param.data_type === "float" ? 0.01 : 1;
                input.addEventListener("input", (e) => {
                    const value = param.data_type === "float" ? parseFloat(e.target.value) * (controller.float_multiplier || 1) : parseInt(e.target.value);
                    tempValues[param.sysex_adress] = value;
                    controller.sendParameter(parseInt(param.sysex_adress), value);
                });
                container.appendChild(label);
                container.appendChild(input);
                rhythmContainer.appendChild(container);
            });
            column.appendChild(rhythmContainer);
        } else {
            groupedParams[groupName].forEach(param => {
                if (!param.ui_type || !["button", "switch", "slider", "select"].includes(param.ui_type)) {
                    console.warn(`Invalid ui_type for parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
                    return;
                }
                const container = document.createElement("div");
                const label = document.createElement("label");
                label.textContent = param.name;
                label.setAttribute("for", `param-${param.sysex_adress}`);
                let input;
                const currentValue = currentValues[param.sysex_adress] !== undefined 
                    ? currentValues[param.sysex_adress] 
                    : (param.data_type === "float" ? param.default_value * (controller.float_multiplier || 1) : param.default_value);
                if (param.ui_type === "button" || param.ui_type === "switch") {
                    input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = `param-${param.sysex_adress}`;
                    input.name = param.name;
                    input.checked = currentValue === 1;
                    input.addEventListener("change", (e) => {
                        const value = e.target.checked ? 1 : 0;
                        tempValues[param.sysex_adress] = value;
                        controller.sendParameter(parseInt(param.sysex_adress), value);
                    });
                } else if (param.ui_type === "slider") {
                    input = document.createElement("input");
                    input.type = "range";
                    input.id = `param-${param.sysex_adress}`;
                    input.name = param.name;
                    input.min = param.min_value;
                    input.max = param.max_value;
                    input.value = currentValue / (param.data_type === "float" ? controller.float_multiplier || 1 : 1);
                    input.step = param.data_type === "float" ? 0.01 : 1;
                    input.addEventListener("input", (e) => {
                        const value = param.data_type === "float" ? parseFloat(e.target.value) * (controller.float_multiplier || 1) : parseInt(e.target.value);
                        tempValues[param.sysex_adress] = value;
                        controller.sendParameter(parseInt(param.sysex_adress), value);
                    });
                } else if (param.ui_type === "select") {
                    input = document.createElement("select");
                    input.id = `param-${param.sysex_adress}`;
                    input.name = param.name;
                    for (let i = param.min_value; i <= param.max_value; i++) {
                        const option = document.createElement("option");
                        option.value = i;
                        option.textContent = param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
                        input.appendChild(option);
                    }
                    input.value = currentValue;
                    input.addEventListener("change", (e) => {
                        const value = parseInt(e.target.value);
                        tempValues[param.sysex_adress] = value;
                        controller.sendParameter(parseInt(param.sysex_adress), value);
                    });
                }
                container.appendChild(label);
                container.appendChild(input);
                column.appendChild(container);
            });
        }
        form.appendChild(column);
    });
}

function saveSettings() {
    controller.saveCurrentSettings(currentPreset);
    bankSettings[currentPreset] = { ...currentValues };
    localStorage.setItem('presetNames', JSON.stringify(presetNames));
}

async function loadBankSettings(bankIndex) {
    currentPreset = bankIndex;
    currentValues = { ...defaultValues, ...(bankSettings[bankIndex] || {}) };
    console.log(`loadBankSettings: bankIndex=${bankIndex}, currentValues[20]=${currentValues[20]}`);
    await generateGlobalSettingsForm();
    for (let address in currentValues) {
        controller.sendParameter(parseInt(address), currentValues[address]);
    }
    updateLEDBankColor();
    updatePresetButtons();
}

async function init() {
    await initializeDefaultValues();
    controller.initialize();
    await loadBankSettings(0);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    controller.onDataReceived = (processedData) => {
        const bankNumber = processedData.bankNumber;
        if (!bankSettings[bankNumber]) {
            bankSettings[bankNumber] = {};
            processedData.parameters.forEach((value, index) => {
                if (value !== undefined) bankSettings[bankNumber][index] = value;
            });
        }
        if (bankNumber !== currentPreset) {
            loadBankSettings(bankNumber);
        }
    };
});

const modal = document.getElementById("settings-modal");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");

function openModal(paramGroup) {
    generateSettingsForm(paramGroup);
    modal.style.display = "block";
}

saveBtn.addEventListener("click", () => {
    currentValues = { ...tempValues };
    bankSettings[currentPreset] = { ...currentValues };
    saveSettings();
    modal.style.display = "none";
});

cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    tempValues = {};
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
        tempValues = {};
    }
});

// Chord buttons
document.querySelectorAll(".chord-button").forEach(button => {
    const id = button.id.split("-");
    const row = parseInt(id[1]) - 1;
    const index = parseInt(id[2]) - 1;
    button.addEventListener("mousedown", () => triggerChordNote(index, row));
    button.addEventListener("mouseup", () => {
        activeChordNotes.forEach(note => controller.sendParameter(8, 0));
        activeChordNotes = [];
    });
    button.addEventListener("click", () => openModal("chord_parameter"));
});

// Harp plate
const harpPlate = document.getElementById("harp-plate");
function handleHarpInteraction(e) {
    const rect = harpPlate.getBoundingClientRect();
    const y = (e.type.includes("touch") ? e.touches[0].clientY : e.clientY) - rect.top;
    const noteIndex = Math.floor((y / rect.height) * 12);
    if (noteIndex >= 0 && noteIndex < 12) {
        triggerHarpNote(noteIndex);
    }
}
harpPlate.addEventListener("mousedown", handleHarpInteraction);
harpPlate.addEventListener("mousemove", (e) => {
    if (e.buttons === 1) handleHarpInteraction(e);
});
harpPlate.addEventListener("touchstart", handleHarpInteraction);
harpPlate.addEventListener("touchmove", handleHarpInteraction);
harpPlate.addEventListener("mouseup", () => {
    activeHarpNotes.forEach(note => controller.sendParameter(9, 0));
    activeHarpNotes = [];
});
harpPlate.addEventListener("touchend", () => {
    activeHarpNotes.forEach(note => controller.sendParameter(9, 0));
    activeHarpNotes = [];
});
harpPlate.addEventListener("click", () => openModal("harp_parameter"));

// Potentiometers
const potMappings = {
    "chord-volume-pot": { address: 3, paramGroup: "potentiometer" },
    "harp-volume-pot": { address: 2, paramGroup: "potentiometer" },
    "mod-pot": { address: 14, paramGroup: "potentiometer" }
};
document.querySelectorAll(".pot").forEach(pot => {
    let isDragging = false;
    let startY;
    let currentValue = 0.5 * (controller.float_multiplier || 1);
    function handlePotInteraction(e) {
        const rect = pot.getBoundingClientRect();
        const y = (e.type.includes("touch") ? e.touches[0].clientY : e.clientY) - rect.top;
        if (e.type === "mousedown" || e.type === "touchstart") {
            isDragging = true;
            startY = y;
        } else if ((e.type === "mousemove" && e.buttons === 1) || e.type === "touchmove") {
            if (isDragging) {
                const deltaY = startY - y;
                currentValue = Math.min(controller.float_multiplier || 1, Math.max(0, currentValue + (deltaY / 2)));
                controller.sendParameter(potMappings[pot.id].address, currentValue);
                currentValues[potMappings[pot.id].address] = currentValue;
                bankSettings[currentPreset] = { ...currentValues };
                if (potMappings[pot.id].address === 20) updateLEDBankColor();
                startY = y;
            }
        }
    }
    pot.addEventListener("mousedown", handlePotInteraction);
    pot.addEventListener("mousemove", handlePotInteraction);
    pot.addEventListener("mouseup", () => isDragging = false);
    pot.addEventListener("touchstart", handlePotInteraction);
    pot.addEventListener("touchmove", handlePotInteraction);
    pot.addEventListener("touchend", () => isDragging = false);
    pot.addEventListener("click", () => openModal(potMappings[pot.id].paramGroup));
});

// Preset buttons
document.getElementById("preset-up").addEventListener("click", () => {
    currentPreset = (currentPreset + 1) % 12;
    loadBankSettings(currentPreset);
});
document.getElementById("preset-down").addEventListener("click", () => {
    currentPreset = (currentPreset - 1 + 12) % 12;
    loadBankSettings(currentPreset);
});

// Sharp and Rhythm buttons
const sharpButton = document.getElementById("sharp-button");
sharpButton.addEventListener("click", () => {
    const currentState = controller.getButtonState("sharp function") || 0;
    const newState = currentState === 0 ? 1 : 0;
    controller.sendParameter(31, newState);
    sharpButton.textContent = newState === 1 ? "Sharp" : "Flat";
    sharpButton.classList.toggle("active", newState === 1);
});
document.getElementById("rhythm-button").addEventListener("click", () => controller.sendParameter(17, 127));

function triggerChordNote(chordIndex, chordType) {
    const notes = [
        [0, 4, 7], // Major
        [0, 3, 7], // Minor
        [0, 4, 7, 10] // Seventh
    ][chordType].map(note => note + 60 + chordIndex);
    activeChordNotes.forEach(note => controller.sendParameter(8, 0));
    activeChordNotes = notes;
    notes.forEach(note => controller.sendParameter(8, note));
}

function triggerHarpNote(noteIndex) {
    const note = 60 + noteIndex;
    if (!activeHarpNotes.includes(note)) {
        activeHarpNotes.push(note);
        controller.sendParameter(9, note);
    }
}