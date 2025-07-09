class MiniChordController {
  constructor() {
    this.device = null;
    this.parameterSize = 256;
    this.floatMultiplier = 100;
    this.onConnectionChange = () => {};
    this.onDataReceived = () => {};
  }

  async initialize() {
    console.log('[MIDI] Attempting to initialize WebMIDI...');
    if (!navigator.requestMIDIAccess) {
      console.error('[MIDI] WebMIDI is not supported in this browser.');
      this.onConnectionChange(false, 'WebMIDI not supported');
      return false;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: true });
      console.log('[MIDI] WebMIDI access granted.');
      access.onstatechange = (e) => {
        console.log('[MIDI] MIDI state change:', e.port.name, e.port.state);
        this.updateDevice(e);
      };
      this.findDevice(access);
      const connected = this.isConnected();
      console.log('[MIDI] Initialization complete, connected:', connected);
      return connected;
    } catch (err) {
      console.error('[MIDI] Initialization failed:', err.message);
      this.onConnectionChange(false, `MIDI initialization failed: ${err.message}`);
      return false;
    }
  }

  findDevice(access) {
    console.log('[MIDI] Searching for MiniChord device...');
    const inputs = Array.from(access.inputs.values());
    console.log('[MIDI] Available MIDI inputs:', inputs.map(input => input.name));
    for (const input of inputs) {
      if (input.name.toLowerCase().includes('minichord')) {
        console.log('[MIDI] Found MiniChord device:', input.name);
        this.device = input;
        this.device.onmidimessage = (e) => this.handleMidiMessage(e);
        this.onConnectionChange(true, 'MiniChord connected');
        return;
      }
    }
    console.warn('[MIDI] MiniChord device not found.');
    this.device = null;
    this.onConnectionChange(false, 'MiniChord disconnected');
  }

  updateDevice(event) {
    console.log('[MIDI] Device state update:', event.port.name, event.port.state);
    if (event.port.name.toLowerCase().includes('minichord') && event.port.type === 'input') {
      if (event.port.state === 'connected') {
        console.log('[MIDI] MiniChord connected:', event.port.name);
        this.device = event.port;
        this.device.onmidimessage = (e) => this.handleMidiMessage(e);
        this.onConnectionChange(true, 'MiniChord connected');
      } else {
        console.log('[MIDI] MiniChord disconnected:', event.port.name);
        this.device = null;
        this.onConnectionChange(false, 'MiniChord disconnected');
      }
    }
  }

  handleMidiMessage(event) {
    if (event.data[0] === 0xF0 && event.data[event.data.length - 1] === 0xF7) {
      console.log('[MIDI] Received SysEx:', event.data);
      const bankNumber = event.data[5]; // Adjust based on your SysEx format
      const parameters = event.data.slice(6, -1).map(val => isNaN(val) ? 0 : val);
      console.log('[PROCESS DATA] Firmware version: 0.05');
      parameters.forEach((val, i) => {
        if (val !== 0) console.log(`[PROCESS DATA] Sysex=${i}, value=${val}`);
      });
      this.onDataReceived({ bankNumber, parameters });
    }
  }

  sendSysEx(data) {
    if (this.device) {
      const msg = [0xF0, 0x7D, 0x00, 0x00, 0x00, ...data, 0xF7];
      console.log('[MIDI] Sending SysEx:', msg);
      this.device.send(msg);
    } else {
      console.warn('[MIDI] Cannot send SysEx: No device connected');
    }
  }

  async sendParameter(address, value, isFloat = false) {
    if (!this.device) {
      console.warn(`[MIDI] Send parameter failed: no device, address=${address}, value=${value}`);
      return false;
    }
    if (isNaN(value)) {
      console.warn(`[MIDI] Invalid value for address=${address}, defaulting to 0`);
      value = 0;
    }
    let finalValue = isFloat ? Math.round(value * this.floatMultiplier) : Math.round(value);
    if (address >= 220 && address <= 235) {
      finalValue = value;
    }
    finalValue = Math.max(0, Math.min(finalValue, 16383));
    const loVal = finalValue % 128;
    const hiVal = Math.floor(finalValue / 128);
    const loAddr = address % 128;
    const hiAddr = Math.floor(address / 128);
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      this.sendSysEx([loAddr, hiAddr, loVal, hiVal]);
      console.log(`[MIDI] Sent parameter: address=${address}, value=${finalValue}`);
      return true;
    } catch (err) {
      console.error(`[MIDI] Send parameter failed: address=${address}, value=${finalValue}`, err);
      return false;
    }
  }

  async saveBank(bankNumber) {
    if (!this.device) {
      console.warn('[MIDI] Save bank failed: No device connected');
      return false;
    }
    try {
      this.sendSysEx([0x01, bankNumber]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`[MIDI] Saved bank ${bankNumber}`);
      return true;
    } catch (err) {
      console.error(`[MIDI] Save bank failed: ${bankNumber}`, err);
      return false;
    }
  }

  async resetBank(bankNumber) {
    if (!this.device) {
      console.warn('[MIDI] Reset bank failed: No device connected');
      return false;
    }
    try {
      this.sendSysEx([0x02, bankNumber]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`[MIDI] Reset bank ${bankNumber}`);
      return true;
    } catch (err) {
      console.error(`[MIDI] Reset bank failed: ${bankNumber}`, err);
      return false;
    }
  }

  async resetAllBanks() {
    if (!this.device) {
      console.warn('[MIDI] Reset all banks failed: No device connected');
      return false;
    }
    try {
      this.sendSysEx([0x03]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[MIDI] Reset all banks');
      return true;
    } catch (err) {
      console.error('[MIDI] Reset all banks failed', err);
      return false;
    }
  }

  isConnected() {
    return !!this.device;
  }
}