import {NativeModules} from 'react-native';

const {AudioDeviceSelector} = NativeModules;

interface AudioDeviceSelectorInterface {
  // Speaker/Audio Output methods
  getAudioDevices(): Promise<string[]>;
  selectAudioDevice(deviceName: string): Promise<string>;
  getSystemVolume(): Promise<number>;
  setSystemVolume(volume: number): Promise<string>;

  // Microphone/Audio Input methods
  getMicrophoneDevices(): Promise<string[]>;
  selectMicrophoneDevice(deviceName: string): Promise<string>;
  getMicrophoneInputLevel(): Promise<number>;
  setMicrophoneVolume(volume: number): Promise<string>;

  // Microphone Testing methods
  startMicrophoneTest(): Promise<void>;
  stopMicrophoneTest(): Promise<void>;
}

// Type assertion to ensure the native module implements the interface
const typedAudioDeviceSelector =
  AudioDeviceSelector as AudioDeviceSelectorInterface;

// Verify that all required methods are present in development
if (__DEV__) {
  const requiredMethods = [
    'getAudioDevices',
    'selectAudioDevice',
    'getSystemVolume',
    'setSystemVolume',
    'getMicrophoneDevices',
    'selectMicrophoneDevice',
    'getMicrophoneInputLevel',
    'setMicrophoneVolume',
    'startMicrophoneTest',
    'stopMicrophoneTest',
  ];

  requiredMethods.forEach(method => {
    if (!(method in AudioDeviceSelector)) {
      console.warn(
        `AudioDeviceSelector is missing required method: ${method}. Make sure it's properly implemented in the native module.`,
      );
    }
  });
}

export default typedAudioDeviceSelector;
