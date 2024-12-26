import {NativeModules} from 'react-native';

const {AudioDeviceSelector} = NativeModules;

interface AudioDeviceSelectorInterface {
  getAudioDevices(): Promise<string[]>; // Fetch available audio devices
  selectAudioDevice(deviceName: string): Promise<string>; // Select a specific audio device
  getSystemVolume(): Promise<number>; // Get the current system volume (0.0 - 1.0)
  setSystemVolume(volume: number): Promise<string>; // Set the system volume (0.0 - 1.0)
}

export default AudioDeviceSelector as AudioDeviceSelectorInterface;
