/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Button,
} from 'react-native';
import Sound from 'react-native-sound';
import AudioDeviceSelector from './src/AudioDeviceSelector';
import Slider from '@react-native-community/slider';

const App = () => {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [sound, setSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Track playback state
  const [volume, setVolume] = useState(0.5); // Default to 50%

  useEffect(() => {
    // Initialize the sound when the component mounts
    const soundInstance = new Sound('doremon.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.error('Failed to load the sound', error);
        return;
      }
      console.log('Sound loaded successfully');
    });

    setSound(soundInstance);

    return () => {
      // Cleanup the sound instance
      if (soundInstance) {
        soundInstance.release();
      }
    };
  }, []);

  // Fetch available audio devices on mount
  const fetchDevices = async () => {
    try {
      const availableDevices = await AudioDeviceSelector.getAudioDevices();
      setDevices(availableDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  // Fetch current system volume on mount
  const fetchVolume = async () => {
    try {
      const currentVolume = await AudioDeviceSelector.getSystemVolume();
      setVolume(currentVolume); // Update state with the current volume
    } catch (error) {
      console.error('Error fetching system volume:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchVolume();
  }, []);

  const handleVolumeChange = async (value: number) => {
    setVolume(value); // Update local state
    try {
      await AudioDeviceSelector.setSystemVolume(value); // Set system volume
      console.log(`Volume set to: ${value * 100}%`);
    } catch (error) {
      console.error('Error setting system volume:', error);
    }
  };

  const selectDevice = async (deviceName: string) => {
    console.log('selected device tsx: ', deviceName);
    try {
      // Stop any current playback
      if (sound && isPlaying) {
        sound.stop();
        setIsPlaying(false);
      }

      // Select the device
      const result = await AudioDeviceSelector.selectAudioDevice(deviceName);
      console.log('selected device sound in tsx: ', deviceName);
      setSelectedDevice(deviceName);
      console.log(result);

      // If sound exists, reset and reload it
      if (sound) {
        sound.release();
        const newSound = new Sound('doremon.mp3', Sound.MAIN_BUNDLE, error => {
          if (error) {
            console.error('Failed to reload the sound', error);
            return;
          }
          console.log('Sound reloaded successfully');
          setSound(newSound);
        });
      }
    } catch (error) {
      console.error('Error selecting device:', error);
    }
  };
  const togglePlayback = () => {
    if (sound) {
      if (isPlaying) {
        // Stop the sound
        sound.stop(() => {
          console.log('Playback stopped');
          setIsPlaying(false);
        });
      } else {
        // Play the sound
        sound.play(success => {
          if (success) {
            console.log('Sound played successfully');
          } else {
            console.error('Sound playback failed');
          }
          setIsPlaying(false); // Reset state when playback stops
        });
        setIsPlaying(true); // Update state to reflect playback
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Audio Devices:</Text>
      <FlatList
        data={devices}
        keyExtractor={item => item}
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() => selectDevice(item)}
            style={[
              styles.deviceButton,
              selectedDevice === item && styles.selectedDevice,
            ]}>
            <Text style={styles.deviceText}>{item}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No devices found.</Text>
        }
      />

      <Text
        style={{
          fontSize: 18,
          fontWeight: '500',
          marginTop: 20,
          marginBottom: 8,
        }}>
        Volume:
      </Text>
      <Slider
        style={{width: '100%', height: 40}}
        minimumValue={0}
        maximumValue={1}
        value={volume}
        onValueChange={handleVolumeChange}
        minimumTrackTintColor="#1FB28A"
        maximumTrackTintColor="#d3d3d3"
        thumbTintColor="#1FB28A"
      />

      <View
        style={{
          gap: 36,
        }}>
        <Button title="Refresh Devices" onPress={fetchDevices} />
        <Button
          title={isPlaying ? 'Stop Playing' : 'Play Sound'}
          onPress={togglePlayback}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  deviceButton: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  selectedDevice: {
    backgroundColor: '#add8e6',
  },
  deviceText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 20,
  },
});

export default App;
