var parameters = null;
var currentValues = {};
var activeHarpNotes = [];
var activeChordNotes = [];
var controller = new MiniChordController();
var tempValues = {};
var bankSettings = {};
var currentPreset = 0;
const bankNames = ["a.txt", "b.txt", "c.txt", "d.txt", "e.txt", "f.txt", "g.txt", "h.txt", "i.txt", "j.txt", "k.txt", "l.txt"];

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

function updateLEDBankColor() {
    const bankColor = currentValues[20] !== undefined ? currentValues[20] : 0; // Default to 0 (red)
    console.log(`Updating LED color: bankColor=${bankColor}, currentPreset=${currentPreset}`); // Debug
    const led = document.getElementById("power_led");
    led.classList.remove("color-0", "color-1", "color-2", "color-3", "color-4");
    led.classList.add(`color-${Math.floor(bankColor) % 5}`); // Ensure integer and modulo 5
}

async function generateGlobalSettingsForm() {
    const params = await loadParameters();
    const form = document.getElementById("global-settings-form");
    form.innerHTML = `<div class="bank-display">Bank: ${bankNames[currentPreset]}</div>`;

    const groupParams = (params["global_parameter"] || []).filter(param => param.group !== "hidden");
    if (groupParams.length === 0) {
        form.innerHTML += "<p>No global parameters available.</p>";
        return;
    }

    groupParams.forEach((param) => {
        const container = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = param.name;
        label.title = param.tooltip;
        let input;

        const currentValue = currentValues[param.sysex_adress] !== undefined 
            ? currentValues[param.sysex_adress] 
            : (param.data_type === "float" ? param.default_value * controller.float_multiplier : param.default_value);

        if (param.ui_type === "button") {
            input = document.createElement("input");
            input.type = "checkbox";
            input.checked = currentValue === 1;
            input.dataset.address = param.sysex_adress;
            input.dataset.name = param.name;
            input.addEventListener("change", (e) => {
                const value = e.target.checked ? 1 : 0;
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                controller.sendParameter(parseInt(param.sysex_adress), value);
                if (param.sysex_adress === 20) updateLEDBankColor();
            });
        } else if (param.ui_type === "slider") {
            input = document.createElement("input");
            input.type = "range";
            input.min = param.min_value;
            input.max = param.max_value;
            input.value = currentValue / (param.data_type === "float" ? controller.float_multiplier : 1);
            input.step = param.data_type === "float" ? 0.01 : 1;
            input.dataset.address = param.sysex_adress;
            input.dataset.name = param.name;
            input.addEventListener("input", (e) => {
                const value = param.data_type === "float" ? parseFloat(e.target.value) * controller.float_multiplier : parseInt(e.target.value);
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                controller.sendParameter(parseInt(param.sysex_adress), value);
                if (param.sysex_adress === 20) updateLEDBankColor();
            });
        } else if (param.ui_type === "select") {
            input = document.createElement("select");
            for (let i = param.min_value; i <= param.max_value; i++) {
                const option = document.createElement("option");
                option.value = i;
                option.textContent = param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
                input.appendChild(option);
            }
            input.value = currentValue;
            input.dataset.address = param.sysex_adress;
            input.dataset.name = param.name;
            input.addEventListener("change", (e) => {
                const value = parseInt(e.target.value);
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                controller.sendParameter(parseInt(param.sysex_adress), value);
                if (param.sysex_adress === 20) updateLEDBankColor();
            });
        }

        container.appendChild(label);
        container.appendChild(input);
        form.appendChild(container);
    });
    updateLEDBankColor(); // Ensure LED updates after form generation
}

function loadBankSettings(bankNumber) {
    currentValues = bankSettings[bankNumber] ? { ...bankSettings[bankNumber] } : {};
    controller.active_bank_number = bankNumber;
    currentPreset = bankNumber;
    console.log(`Loading bank ${bankNumber}:`, currentValues); // Debug
    generateGlobalSettingsForm();
}

document.addEventListener("DOMContentLoaded", () => {
    controller.initialize();
    loadBankSettings(0); // Initialize with bank 0

    controller.onDataReceived = (processedData) => {
        const bankNumber = processedData.bankNumber;
        if (!bankSettings[bankNumber]) {
            bankSettings[bankNumber] = {};
            processedData.parameters.forEach((value, index) => {
                if (value !== undefined) bankSettings[bankNumber][index] = value;
            });
        }
        loadBankSettings(bankNumber);
    };

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
        "chord-volume-pot": { address: 3, paramGroup: "chord_parameter" },
        "harp-volume-pot": { address: 2, paramGroup: "harp_parameter" },
        "mod-pot": { address: 14, paramGroup: "global_parameter" }
    };
    document.querySelectorAll(".pot").forEach(pot => {
        let isDragging = false;
        let startY;
        let currentValue = 0.5 * controller.float_multiplier;
        function handlePotInteraction(e) {
            const rect = pot.getBoundingClientRect();
            const y = (e.type.includes("touch") ? e.touches[0].clientY : e.clientY) - rect.top;
            if (e.type === "mousedown" || e.type === "touchstart") {
                isDragging = true;
                startY = y;
            } else if ((e.type === "mousemove" && e.buttons === 1) || e.type === "touchmove") {
                if (isDragging) {
                    const deltaY = startY - y;
                    currentValue = Math.min(controller.float_multiplier, Math.max(0, currentValue + (deltaY / 2)));
                    controller.sendParameter(potMappings[pot.id].address, currentValue);
                    currentValues[potMappings[pot.id].address] = currentValue;
                    bankSettings[currentPreset] = { ...currentValues };
                    if (potMappings[pot.id].address === 20) updateLEDBankColor();
                    startY = y;
                }
            }
        }
        pot.addEventListener("mousedown", handlePotInteraction); // Fixed from handleHarpInteraction
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
    document.getElementById("sharp-button").addEventListener("click", () => controller.sendParameter(16, 127));
    document.getElementById("rhythm-button").addEventListener("click", () => controller.sendParameter(17, 127));
});

async function generateSettingsForm(paramGroup) {
    if (paramGroup === "global_parameter") return;
    const params = await loadParameters();
    const form = document.getElementById("settings-form");
    form.innerHTML = "";
    document.getElementById("settings-title").textContent = paramGroup.replace(/_/g, " ").toUpperCase();

    const groupParams = (params[paramGroup] || []).filter(param => param.group !== "hidden");
    if (groupParams.length === 0) {
        form.innerHTML = "<p>No parameters available for this group.</p>";
        return;
    }

    tempValues = { ...currentValues };
    groupParams.forEach((param) => {
        const container = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = param.name;
        label.title = param.tooltip;
        let input;

        const currentValue = currentValues[param.sysex_adress] !== undefined 
            ? currentValues[param.sysex_adress] 
            : (param.data_type === "float" ? param.default_value * controller.float_multiplier : param.default_value);

        if (param.ui_type === "button") {
            input = document.createElement("input");
            input.type = "checkbox";
            input.checked = currentValue === 1;
            input.dataset.address = param.sysex_adress;
            input.dataset.name = param.name;
            input.addEventListener("change", (e) => {
                const value = e.target.checked ? 1 : 0;
                tempValues[param.sysex_adress] = value;
                controller.sendParameter(parseInt(param.sysex_adress), value);
            });
        } else if (param.ui_type === "slider") {
            input = document.createElement("input");
            input.type = "range";
            input.min = param.min_value;
            input.max = param.max_value;
            input.value = currentValue / (param.data_type === "float" ? controller.float_multiplier : 1);
            input.step = param.data_type === "float" ? 0.01 : 1;
            input.dataset.address = param.sysex_adress;
            input.dataset.name = param.name;
            input.addEventListener("input", (e) => {
                const value = param.data_type === "float" ? parseFloat(e.target.value) * controller.float_multiplier : parseInt(e.target.value);
                tempValues[param.sysex_adress] = value;
                controller.sendParameter(parseInt(param.sysex_adress), value);
            });
        } else if (param.ui_type === "select") {
            input = document.createElement("select");
            for (let i = param.min_value; i <= param.max_value; i++) {
                const option = document.createElement("option");
                option.value = i;
                option.textContent = param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
                input.appendChild(option);
            }
            input.value = currentValue;
            input.dataset.address = param.sysex_adress;
            input.dataset.name = param.name;
            input.addEventListener("change", (e) => {
                const value = parseInt(e.target.value);
                tempValues[param.sysex_adress] = value;
                controller.sendParameter(parseInt(param.sysex_adress), value);
            });
        }

        container.appendChild(label);
        container.appendChild(input);
        form.appendChild(container);
    });
}

function saveSettings() {
    controller.saveCurrentSettings(currentPreset);
    bankSettings[currentPreset] = { ...currentValues };
}

function triggerChordNote(chordIndex, chordType) {
    var notes = [
        [0, 4, 7], // Major
        [0, 3, 7], // Minor
        [0, 4, 7, 10] // Seventh
    ][chordType].map(note => note + 60 + chordIndex);
    activeChordNotes.forEach(note => controller.sendParameter(8, 0));
    activeChordNotes = notes;
    notes.forEach(note => controller.sendParameter(8, note));
}

function triggerHarpNote(noteIndex) {
    var note = 60 + noteIndex;
    if (!activeHarpNotes.includes(note)) {
        activeHarpNotes.push(note);
        controller.sendParameter(9, note);
    }
}
