import { Play } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { getYouTubeVideoId } from '@/utils/youtube';

interface YouTubePlayerProps {
  videoUrl: string;
  style?: StyleProp<ViewStyle>;
  invalidUrlText?: string;
  externalFallbackText?: string;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoUrl,
  style,
  invalidUrlText = 'Invalid YouTube URL',
  externalFallbackText = 'Tap to watch on YouTube',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoId = getYouTubeVideoId(videoUrl);

  if (!videoId) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Text style={styles.errorText}>{invalidUrlText}</Text>
      </View>
    );
  }

  const embedUrl =
    `https://www.youtube-nocookie.com/embed/${videoId}`
    + '?rel=0&modestbranding=1&playsinline=1';

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          src={embedUrl}
          title="YouTube video player"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 12,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </View>
    );
  }

  const embedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body, .video-container { width: 100%; height: 100%; background: #000; }
          iframe { width: 100%; height: 100%; border: 0; }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe
            src="${embedUrl}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </body>
    </html>
  `;

  if (hasError) {
    return (
      <TouchableOpacity
        style={[styles.container, style, styles.errorContainer]}
        onPress={() => void Linking.openURL(videoUrl)}
      >
        <Play size={32} color="#fff" />
        <Text style={styles.errorText}>{externalFallbackText}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <WebView
        source={{ html: embedHtml, baseUrl: 'https://www.youtube-nocookie.com' }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: { backgroundColor: '#000' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
