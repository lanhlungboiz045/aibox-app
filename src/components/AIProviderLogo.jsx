import React from 'react';
import { Image, StyleSheet } from 'react-native';

const LOGOS = {
  openai: require('../assets/ai-providers/openai.png'),
  google: require('../assets/ai-providers/gemini.png'),
  anthropic: require('../assets/ai-providers/claude.png'),
  meta: require('../assets/ai-providers/llama.png'),
  deepseek: require('../assets/ai-providers/deepseek.png'),
};

export function AIProviderLogo({ provider, size = 40, style }) {
  const source = LOGOS[provider];
  if (!source) return null;

  return (
    <Image
      accessible={false}
      accessibilityIgnoresInvertColors
      source={source}
      resizeMode="contain"
      style={[styles.logo, { width: size, height: size }, style]}
    />
  );
}

const styles = StyleSheet.create({
  logo: { borderRadius: 8 },
});
