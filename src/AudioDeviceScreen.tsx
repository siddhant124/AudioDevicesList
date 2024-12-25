/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {View, Text, Button, FlatList, TouchableOpacity} from 'react-native';
import AudioDeviceSelector from './AudioDeviceSelector';

const AudioDeviceScreen = () => {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      const audioDevices = await AudioDeviceSelector.getAudioDevices();
      setDevices(audioDevices);
    } catch (error) {
      console.error('Error fetching audio devices:', error);
    }
  };

  const switchDevice = async (deviceName: string) => {
    try {
      const result = await AudioDeviceSelector.selectAudioDevice(deviceName);
      setSelectedDevice(deviceName);
      console.log(result);
    } catch (error) {
      console.error('Error switching device:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <View>
      <Text>Available Audio Devices:</Text>
      <FlatList
        data={devices}
        keyExtractor={item => item}
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => switchDevice(item)}>
            <Text
              style={{
                padding: 10,
                backgroundColor:
                  selectedDevice === item ? 'lightblue' : 'white',
              }}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Refresh Devices" onPress={fetchDevices} />
    </View>
  );
};

export default AudioDeviceScreen;
