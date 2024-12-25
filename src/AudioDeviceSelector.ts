import {NativeModules} from 'react-native';

const {AudioDeviceSelector} = NativeModules;

interface AudioDeviceSelectorInterface {
  getAudioDevices(): Promise<string[]>;
  selectAudioDevice(deviceName: string): Promise<string>;
}

export default AudioDeviceSelector as AudioDeviceSelectorInterface;
