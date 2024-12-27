/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Slider from '@react-native-community/slider';
import AudioDeviceSelector from './AudioDeviceSelector';

const MicrophoneComponent = () => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [openMicDropdown, setOpenMicDropdown] = useState(false);
  const [deviceItems, setDeviceItems] = useState<
    {label: string; value: string}[]
  >([]);
  const [volume, setVolume] = useState(0.5);
  const [inputLevel, setInputLevel] = useState(0);
  const monitoringInterval = useRef<NodeJS.Timeout>();
  const [isRecording, setIsRecording] = useState(false);
  const levelAnimation = useRef(new Animated.Value(0)).current;

  const handleTouchOutside = () => {
    setOpenMicDropdown(false);
  };

  // Fetch available microphone devices
  const fetchMicDevices = async () => {
    try {
      const availableDevices = await AudioDeviceSelector.getMicrophoneDevices();
      console.log('Available microphone devices:', availableDevices);

      const devices = availableDevices.map(device => ({
        label: device,
        value: device,
      }));

      setDeviceItems(devices);

      // Set default device
      if (devices.length > 0 && !selectedDevice) {
        const defaultDevice = devices[0].value;
        setSelectedDevice(defaultDevice);
        await selectMicDevice(defaultDevice);
      }
    } catch (error) {
      console.error('Error fetching microphone devices:', error);
    }
  };

  // Select microphone device
  const selectMicDevice = async (deviceName: string) => {
    try {
      console.log('Selecting microphone device:', deviceName);
      const result = await AudioDeviceSelector.selectMicrophoneDevice(
        deviceName,
      );
      console.log('Microphone selection result:', result);
      setSelectedDevice(deviceName);
    } catch (error) {
      console.error('Error selecting microphone device:', error);
    }
  };

  // Handle volume change
  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    try {
      await AudioDeviceSelector.setMicrophoneVolume(value);
      console.log(`Microphone volume set to: ${value * 100}%`);
    } catch (error) {
      console.error('Error setting microphone volume:', error);
    }
  };

  // Calculate scaled input level based on volume setting
  const getScaledInputLevel = (rawLevel: number) => {
    // Scale the input level based on volume setting
    return Math.min(rawLevel, volume);
  };

  // Animate input level changes
  useEffect(() => {
    const scaledLevel = getScaledInputLevel(inputLevel);
    Animated.spring(levelAnimation, {
      toValue: scaledLevel,
      useNativeDriver: false,
      friction: 7,
      tension: 20,
    }).start();
  }, [inputLevel, volume, levelAnimation]);

  // Normalize and scale the input level
  const normalizeInputLevel = (rawLevel: number) => {
    // Amplify the raw input level
    const amplifiedLevel = rawLevel * 1000; // Adjusted multiplier

    // Clamp the value between 0 and 1
    return Math.min(Math.max(amplifiedLevel, 0), 1);
  };

  const startInputLevelMonitoring = async () => {
    try {
      console.log('Starting microphone test...');
      await AudioDeviceSelector.startMicrophoneTest();
      setIsRecording(true);

      // Set up interval for continuous monitoring
      monitoringInterval.current = setInterval(async () => {
        try {
          const level = await AudioDeviceSelector.getMicrophoneInputLevel();
          console.log('Raw input level:', level);
          const normalizedLevel = normalizeInputLevel(level);
          console.log('Normalized input level:', normalizedLevel);
          setInputLevel(normalizedLevel);
        } catch (error) {
          console.error('Error getting input level:', error);
        }
      }, 100); // Update every 100ms
    } catch (error) {
      console.error('Error starting microphone test:', error);
    }
  };

  // Stop monitoring input levels
  // Stop monitoring input levels
  const stopInputLevelMonitoring = async () => {
    console.log('Stopping microphone test...');
    setIsRecording(false);

    // Clear the monitoring interval
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = undefined;
    }

    // Reset input level
    setInputLevel(0);

    try {
      await AudioDeviceSelector.stopMicrophoneTest();
    } catch (error) {
      console.error('Error stopping microphone test:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    fetchMicDevices();
    return () => {
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
      stopInputLevelMonitoring();
    };
  }, []);

  // Animate input level changes
  useEffect(() => {
    const scaledLevel = Math.min(inputLevel, volume);
    Animated.spring(levelAnimation, {
      toValue: scaledLevel,
      useNativeDriver: false,
      friction: 7,
      tension: 20,
    }).start();
  }, [inputLevel, volume, levelAnimation]);

  // Calculate the percentage for display
  const getDisplayPercentage = () => {
    const scaledLevel = getScaledInputLevel(inputLevel);
    return Math.round(scaledLevel * 100);
  };

  return (
    <TouchableWithoutFeedback onPress={handleTouchOutside}>
      <View style={styles.container}>
        <Text style={styles.title}>Microphone</Text>

        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={openMicDropdown}
            value={selectedDevice}
            items={deviceItems}
            setOpen={setOpenMicDropdown}
            setValue={setSelectedDevice}
            setItems={setDeviceItems}
            placeholder="Select Microphone"
            onChangeValue={value => value && selectMicDevice(value)}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropDownStyle}
            listItemContainerStyle={styles.itemStyle}
            zIndex={1000}
          />
          <TouchableOpacity
            onPress={fetchMicDevices}
            style={styles.refreshButton}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.levelContainer}>
          <View style={styles.levelHeader}>
            <Text style={styles.label}>Input Level:</Text>
            <Text style={styles.levelText}>{getDisplayPercentage()}%</Text>
          </View>
          <View style={styles.levelBar}>
            <Animated.View
              style={[
                styles.levelFill,
                {
                  width: levelAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor:
                    getScaledInputLevel(inputLevel) > volume * 0.8
                      ? '#FF4444'
                      : '#1FB28A',
                },
              ]}
            />
            {/* Volume limit indicator */}
            <View
              style={[
                styles.volumeLimit,
                {
                  left: `${volume * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <Text style={styles.label}>Volume: {Math.round(volume * 100)}%</Text>
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

        <TouchableOpacity
          style={[
            styles.button,
            isRecording ? styles.buttonActive : styles.buttonInactive,
          ]}
          activeOpacity={0.7}
          onPress={() => {
            console.log('Button pressed, current state:', isRecording);
            if (isRecording) {
              stopInputLevelMonitoring();
            } else {
              startInputLevelMonitoring();
            }
          }}>
          <Text style={styles.buttonText}>
            {isRecording ? 'Stop Testing' : 'Test Microphone'}
          </Text>
        </TouchableOpacity>
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
  levelContainer: {
    width: '100%',
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 14,
    color: '#666',
  },
  levelBar: {
    width: '100%',
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  levelFill: {
    height: '100%',
  },
  volumeLimit: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#666',
    zIndex: 1,
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
  buttonActive: {
    backgroundColor: '#FF4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonInactive: {
    backgroundColor: '#1FB28A',
  },
});

export default MicrophoneComponent;
