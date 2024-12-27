/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Slider from '@react-native-community/slider';
import DropDownPicker from 'react-native-dropdown-picker';
import Sound from 'react-native-sound';
import AudioDeviceSelector from './src/AudioDeviceSelector';
import MicrophoneComponent from './src/MicrophoneComponent';

const App = () => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [sound, setSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [openSpeakerDropdown, setOpenSpeakerDropdown] = useState(false);
  const [deviceItems, setDeviceItems] = useState<
    {label: string; value: string}[]
  >([]);
  const [lastSelectedDevice, setLastSelectedDevice] = useState<string | null>(
    null,
  );

  // Initialize sound with specific audio routing
  const initializeSound = (deviceType: string) => {
    if (sound) {
      sound.release();
    }

    // Configure sound based on device type
    Sound.setCategory('Playback', true); // Enable mixing
    const soundInstance = new Sound('doremon.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.error('Failed to load the sound', error);
        return;
      }
      console.log('Sound loaded successfully for device:', deviceType);
    });

    setSound(soundInstance);
  };

  useEffect(() => {
    initializeSound('Speaker'); // Default initialization
    return () => {
      if (sound) {
        sound.release();
      }
    };
  }, []);

  const fetchDevices = async () => {
    try {
      const availableDevices = await AudioDeviceSelector.getAudioDevices();
      console.log('Available devices:', availableDevices);

      // Map devices and ensure proper labeling
      const devices = availableDevices.map(device => ({
        label: device,
        value: device,
      }));

      setDeviceItems(devices);

      // Set default device based on priority
      if (devices.length > 0 && !selectedDevice) {
        const defaultDevice = devices[0].value;
        console.log('Setting default device:', defaultDevice);
        setSelectedDevice(defaultDevice);
        await selectDevice(defaultDevice);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchVolume = async () => {
    try {
      const currentVolume = await AudioDeviceSelector.getSystemVolume();
      setVolume(currentVolume);
    } catch (error) {
      console.error('Error fetching system volume:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchVolume();
  }, []);

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    try {
      await AudioDeviceSelector.setSystemVolume(value);
      console.log(`Volume set to: ${value * 100}%`);
    } catch (error) {
      console.error('Error setting system volume:', error);
    }
  };

  const selectDevice = async (deviceName: string) => {
    try {
      console.log('Selecting device:', deviceName);

      // Stop current playback if any
      if (sound && isPlaying) {
        sound.stop();
        setIsPlaying(false);
      }

      // Prevent selecting the same device again
      if (lastSelectedDevice === deviceName) {
        console.log('Device already selected:', deviceName);
        return;
      }

      // Select the device through the native module
      const result = await AudioDeviceSelector.selectAudioDevice(deviceName);
      console.log('Device selection result:', result);

      // Update state
      setSelectedDevice(deviceName);
      setLastSelectedDevice(deviceName);

      // Reinitialize sound for the new device
      initializeSound(deviceName);
    } catch (error) {
      console.error('Error selecting device:', error);
      // Revert to previous device if selection fails
      if (lastSelectedDevice) {
        setSelectedDevice(lastSelectedDevice);
      }
    }
  };

  const togglePlayback = () => {
    if (sound) {
      if (isPlaying) {
        sound.stop(() => {
          console.log('Playback stopped');
          setIsPlaying(false);
        });
      } else {
        // Ensure device is selected before playing
        if (selectedDevice) {
          sound.play(success => {
            if (success) {
              console.log(
                'Sound played successfully on device:',
                selectedDevice,
              );
            } else {
              console.error('Sound playback failed');
            }
            setIsPlaying(false);
          });
          setIsPlaying(true);
        }
      }
    }
  };

  const handleTouchOutside = () => {
    setOpenSpeakerDropdown(false);
  };

  return (
    <TouchableWithoutFeedback onPress={handleTouchOutside}>
      <View style={styles.container}>
        <Text style={styles.title}>Speaker</Text>

        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={openSpeakerDropdown}
            value={selectedDevice}
            items={deviceItems}
            closeOnBackPressed={true}
            setOpen={setOpenSpeakerDropdown}
            setValue={setSelectedDevice}
            setItems={setDeviceItems}
            placeholder="Select Audio Device"
            onChangeValue={value => value && selectDevice(value)}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropDownStyle}
            listItemContainerStyle={styles.itemStyle}
            zIndex={1000}
          />
          <TouchableOpacity onPress={fetchDevices} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Volume:</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={handleVolumeChange}
          minimumTrackTintColor="#1FB28A"
          maximumTrackTintColor="#d3d3d3"
          thumbTintColor="#1FB28A"
        />

        <TouchableOpacity style={styles.button} onPress={togglePlayback}>
          <Text style={styles.buttonText}>
            {isPlaying ? 'Stop Speaker' : 'Test Speaker'}
          </Text>
        </TouchableOpacity>

        <MicrophoneComponent />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
    gap: 8,
    marginBottom: 20,
    zIndex: 1000,
  },
  dropdown: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  dropDownStyle: {
    borderColor: '#ccc',
    borderWidth: 1,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  itemStyle: {
    borderWidth: 0,
    backgroundColor: '#fff',
  },
  refreshButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1FB28A',
    width: 'auto',
  },
  refreshText: {
    color: '#fff',
    fontSize: 14,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1FB28A',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
