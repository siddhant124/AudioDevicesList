package com.audiodeviceslist

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import kotlin.math.abs
import kotlin.math.sqrt

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

  private var audioRecord: AudioRecord? = null
  private var isRecording = false
  private val bufferSize = AudioRecord.getMinBufferSize(
    44100, android.media.AudioFormat.CHANNEL_IN_MONO, android.media.AudioFormat.ENCODING_PCM_16BIT
  )

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

      // Add devices in priority order with "Default -" prefix
      if (hasBluetooth && !seenDevices.contains("Bluetooth")) {
        writableArray.pushString("Bluetooth")
        seenDevices.add("Bluetooth")
      }

      if (hasWiredHeadset && !seenDevices.contains("Headset")) {
        writableArray.pushString("Headset")
        seenDevices.add("Headset")
      }

      if (hasSpeaker && !seenDevices.contains("Speaker")) {
        writableArray.pushString("Speaker")
        seenDevices.add("Speaker")
      }

      // Return the list of available devices
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

        "Headset" -> {
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

  // For Microphone
  @ReactMethod
  fun getMicrophoneDevices(promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val deviceList = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
      val writableArray = WritableNativeArray()
      val seenDevices = mutableSetOf<String>()

      var hasBuiltInMic = false
      var hasHeadsetMic = false
      var hasBluetoothMic = false

      // First pass to detect microphone devices
      for (device in deviceList) {
        when (device.type) {
          AudioDeviceInfo.TYPE_BUILTIN_MIC -> hasBuiltInMic = true
          AudioDeviceInfo.TYPE_WIRED_HEADSET -> hasHeadsetMic = true
          AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> hasBluetoothMic = true
        }
      }

      // Add devices in priority order
      if (hasBluetoothMic && !seenDevices.contains("Bluetooth Microphone")) {
        writableArray.pushString("Bluetooth Microphone")
        seenDevices.add("Bluetooth Microphone")
      }

      if (hasHeadsetMic && !seenDevices.contains("Headset Microphone")) {
        writableArray.pushString("Headset Microphone")
        seenDevices.add("Headset Microphone")
      }

      if (hasBuiltInMic && !seenDevices.contains("Built-in Microphone")) {
        writableArray.pushString("Built-in Microphone")
        seenDevices.add("Built-in Microphone")
      }

      promise.resolve(writableArray)
    } catch (e: Exception) {
      promise.reject("ERROR_FETCHING_MIC_DEVICES", e.message)
    }
  }

  @ReactMethod
  fun selectMicrophoneDevice(deviceName: String, promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

      when (deviceName) {
        "Bluetooth Microphone" -> {
          audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
          audioManager.startBluetoothSco()
          audioManager.isBluetoothScoOn = true
        }

        "Headset Microphone" -> {
          audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
          audioManager.stopBluetoothSco()
          audioManager.isBluetoothScoOn = false
        }

        "Built-in Microphone" -> {
          audioManager.mode = AudioManager.MODE_NORMAL
          audioManager.stopBluetoothSco()
          audioManager.isBluetoothScoOn = false
        }
      }

      promise.resolve("Microphone set to $deviceName")
    } catch (e: Exception) {
      promise.reject("ERROR_SELECTING_MIC", e.message)
    }
  }

//  @ReactMethod
//  fun getMicrophoneInputLevel(promise: Promise) {
//    try {
//      val audioManager =
//        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
//      // Note: This is a simplified implementation. For accurate input levels,
//      // you'll need to implement audio recording and analyze the buffer
//      val maxAmplitude = 32767.0 // Maximum amplitude for 16-bit audio
//      val currentAmplitude = Random().nextDouble() * maxAmplitude // Simulated input level
//      val normalizedLevel = (currentAmplitude / maxAmplitude).coerceIn(0.0, 1.0)
//      promise.resolve(normalizedLevel)
//    } catch (e: Exception) {
//      promise.reject("ERROR_GETTING_INPUT_LEVEL", e.message)
//    }
//  }

  @ReactMethod
  fun setMicrophoneVolume(volume: Float, promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
      val newVolume = (volume * maxVolume).toInt()
      audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, newVolume, 0)
      promise.resolve("Microphone volume set to $volume")
    } catch (e: Exception) {
      promise.reject("ERROR_SETTING_MIC_VOLUME", e.message)
    }
  }

  @ReactMethod
  fun startMicrophoneTest(promise: Promise) {
    try {
      if (isRecording) {
        promise.resolve(null) // Already recording
        return
      }

      // Check for permission
      if (ActivityCompat.checkSelfPermission(
          reactApplicationContext, Manifest.permission.RECORD_AUDIO
        ) != PackageManager.PERMISSION_GRANTED
      ) {
        // Request permission if not granted
        ActivityCompat.requestPermissions(
          currentActivity ?: throw Exception("Activity is null"),
          arrayOf(Manifest.permission.RECORD_AUDIO),
          1001
        )
        promise.reject("PERMISSION_DENIED", "Microphone permission is required")
        return
      }

      // Initialize AudioRecord
      audioRecord = AudioRecord(
        MediaRecorder.AudioSource.MIC,
        44100,
        android.media.AudioFormat.CHANNEL_IN_MONO,
        android.media.AudioFormat.ENCODING_PCM_16BIT,
        bufferSize
      )

      if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
        throw Exception("Failed to initialize AudioRecord")
      }

      isRecording = true
      audioRecord?.startRecording()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR_STARTING_MIC_TEST", e.message)
    }
  }


  @ReactMethod
  fun stopMicrophoneTest(promise: Promise) {
    try {
      isRecording = false
      audioRecord?.stop()
      audioRecord?.release()
      audioRecord = null
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR_STOPPING_MIC_TEST", e.message)
    }
  }

  @ReactMethod
  fun getMicrophoneInputLevel(promise: Promise) {
    try {
      if (!isRecording || audioRecord == null) {
        promise.resolve(0.0)
        return
      }

      val buffer = ShortArray(bufferSize)
      val readSize = audioRecord?.read(buffer, 0, bufferSize) ?: 0
      if (readSize > 0) {
        var sum = 0.0
        for (i in 0 until readSize) {
          sum += abs(buffer[i].toDouble())
        }
        val rms = sqrt(sum / readSize)
        // Normalize to 0-1 range (assuming 16-bit audio)
        val normalizedLevel = (rms / 32768.0).coerceIn(0.0, 1.0)
        promise.resolve(normalizedLevel)
      } else {
        promise.resolve(0.0)
      }
    } catch (e: Exception) {
      promise.reject("ERROR_GETTING_INPUT_LEVEL", e.message)
    }
  }
}