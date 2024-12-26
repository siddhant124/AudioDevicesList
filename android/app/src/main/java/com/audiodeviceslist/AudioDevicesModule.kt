package com.audiodeviceslist

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray

class AudioDevicesModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val DEVICE_OUT_WIRED_HEADSET = 4
    private const val DEVICE_STATE_UNAVAILABLE = 0
    private const val DEVICE_STATE_AVAILABLE = 1
  }

  override fun getName(): String {
    return "AudioDeviceSelector"
  }

  @ReactMethod
  fun getAudioDevices(promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val deviceList = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      val writableArray = WritableNativeArray()
      val seenDevices = mutableSetOf<String>()

      var hasWiredHeadset = false
      var hasBluetooth = false
      var hasSpeaker = false

      // First pass to detect primary devices
      for (device in deviceList) {
        when (device.type) {
          AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> hasSpeaker = true
          AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET -> hasWiredHeadset =
            true

          AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> hasBluetooth =
            true
        }
      }

      // Add devices in priority order
      if (hasSpeaker && !seenDevices.contains("Speaker")) {
        writableArray.pushString("Speaker")
        seenDevices.add("Speaker")
      }

      if (hasWiredHeadset && !seenDevices.contains("Wired Headset")) {
        writableArray.pushString("Wired Headset")
        seenDevices.add("Wired Headset")
      }

      if (hasBluetooth && !seenDevices.contains("Bluetooth")) {
        writableArray.pushString("Bluetooth")
        seenDevices.add("Bluetooth")
      }

      // Handle unknown devices
      for (device in deviceList) {
        if (device.type !in listOf(
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
            AudioDeviceInfo.TYPE_WIRED_HEADSET,
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO
          )
        ) {
          when {
            hasWiredHeadset -> null
            hasBluetooth -> null
            hasSpeaker -> null
            else -> "Speaker"
          }?.let { if (!seenDevices.contains(it)) writableArray.pushString(it) }
        }
      }

      promise.resolve(writableArray)
    } catch (e: Exception) {
      promise.reject("ERROR_FETCHING_DEVICES", e.message)
    }
  }

  @ReactMethod
  fun selectAudioDevice(deviceName: String, promise: Promise) {
    Log.d("DEVICE: ", deviceName)
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

      audioManager.mode = AudioManager.MODE_NORMAL
      audioManager.stopBluetoothSco()
      audioManager.isBluetoothScoOn = false
      audioManager.isBluetoothA2dpOn = false
      audioManager.isSpeakerphoneOn = false

      when (deviceName) {
        "Speaker" -> {
          Log.d("inside", "Speaker")
          audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
          audioManager.isSpeakerphoneOn = true

          try {
            val m = AudioManager::class.java.getMethod(
              "setWiredDeviceConnectionState", Int::class.java, Int::class.java, String::class.java
            )
            m.invoke(audioManager, DEVICE_OUT_WIRED_HEADSET, DEVICE_STATE_UNAVAILABLE, "")
          } catch (e: Exception) {
            Log.e("AudioDevice", "Failed to force disable headset: ${e.message}")
          }
        }

        "Wired Headset" -> {
          Log.d("inside", "Headset")
          audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
          try {
            val m = AudioManager::class.java.getMethod(
              "setWiredDeviceConnectionState", Int::class.java, Int::class.java, String::class.java
            )
            m.invoke(audioManager, DEVICE_OUT_WIRED_HEADSET, DEVICE_STATE_AVAILABLE, "")
          } catch (e: Exception) {
            Log.e("AudioDevice", "Failed to force enable headset: ${e.message}")
          }
        }

        "Bluetooth" -> {
          Log.d("inside", "Bluetooth")
          audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
          audioManager.startBluetoothSco()
          audioManager.isBluetoothScoOn = true
        }

        else -> {
          audioManager.mode = AudioManager.MODE_NORMAL
          Log.d("inside", "else")
        }
      }

      Thread.sleep(100)

      promise.resolve("Audio device set to $deviceName")
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to select audio device: ${e.message}")
    }
  }

  @ReactMethod
  fun getSystemVolume(promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
      val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      val normalizedVolume = currentVolume.toFloat() / maxVolume.toFloat()
      promise.resolve(normalizedVolume) // Return normalized volume (0.0 to 1.0)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get system volume: ${e.message}")
    }
  }

  @ReactMethod
  fun setSystemVolume(volume: Float, promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      val newVolume = (volume * maxVolume).toInt()
      audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, newVolume, 0)
      promise.resolve("Volume set to $volume")
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to set system volume: ${e.message}")
    }
  }
}