import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Camera, CameraType } from 'expo-camera';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Listen to messages from WebView
  const handleWebViewMessage = (event: any) => {
    const message = event.nativeEvent.data;
    console.log('Message from WebView:', message);

    try {
      const data = JSON.parse(message);
      
      // Handle different commands from website
      if (data.action === 'SHOW_CAMERA') {
        console.log('Show camera requested');
        setShowCamera(true);
      } else if (data.action === 'HIDE_CAMERA') {
        console.log('Hide camera requested');
        setShowCamera(false);
      } else if (data.action === 'BUTTON_CLICKED') {
        console.log('Button clicked:', data.button);
      }
    } catch (e) {
      console.log('Non-JSON message:', message);
    }
  };

  // Inject JavaScript to make buttons work and communicate with React Native
  const injectedJavaScript = `
    (function() {
      // Override console.log to see logs in React Native
      const originalLog = console.log;
      console.log = function(...args) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CONSOLE_LOG',
          message: args.join(' ')
        }));
        originalLog.apply(console, args);
      };

      // Fix touch events - make them more reliable
      document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, fixing touch events');
        
        // Add touch feedback to all buttons
        const buttons = document.querySelectorAll('.btn, .app-card, .goal-card');
        buttons.forEach(btn => {
          btn.style.webkitTouchCallout = 'none';
          btn.style.webkitUserSelect = 'none';
          btn.style.userSelect = 'none';
          
          // Add visual feedback on touch
          btn.addEventListener('touchstart', function(e) {
            this.style.opacity = '0.7';
            console.log('Touch start on button');
          }, { passive: true });
          
          btn.addEventListener('touchend', function(e) {
            this.style.opacity = '1';
            console.log('Touch end on button');
          }, { passive: true });
        });

        // Notify React Native when camera screen is reached
        const originalGoToScreen = window.goToScreen;
        window.goToScreen = function(n) {
          console.log('Going to screen:', n);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            action: 'BUTTON_CLICKED',
            button: 'screen_' + n
          }));
          
          if (n === 5) {
            // Camera screen - notify React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              action: 'SHOW_CAMERA'
            }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              action: 'HIDE_CAMERA'
            }));
          }
          
          if (typeof originalGoToScreen === 'function') {
            originalGoToScreen(n);
          }
        };
      });

      // Make sure touch events work
      document.addEventListener('touchstart', function(e) {
        console.log('Document touch detected');
      }, { passive: true });
    })();
    true;
  `;

  if (hasPermission === null) {
    return (
      <SafeAreaProvider style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <View style={styles.loader} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaProvider style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <View style={styles.errorBox}>
              <View style={styles.errorIcon}>
                <View style={styles.errorIconInner} />
              </View>
              <View style={styles.errorText}>Camera permission denied</View>
              <View style={styles.errorSubtext}>Please enable it in settings</View>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://pushupchallange.netlify.app/' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          startInLoadingState={true}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleWebViewMessage}
          // Touch handling
          scrollEnabled={true}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          // Camera permissions
          allowsProtectedMedia={true}
          mediaPlaybackRequiresUserAction={false}
          // Error handling
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('HTTP error:', nativeEvent.statusCode);
          }}
          // Loading
          onLoadStart={() => console.log('WebView load start')}
          onLoadEnd={() => console.log('WebView load end')}
          // Navigation
          onShouldStartLoadWithRequest={(request) => {
            console.log('Navigation to:', request.url);
            return true;
          }}
        />

        {/* Native Camera Overlay */}
        {showCamera && (
          <View style={styles.cameraOverlay}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={CameraType.front}
            />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loader: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
  },
  errorBox: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    maxWidth: 300,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,59,48,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff3b30',
  },
  errorText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
});