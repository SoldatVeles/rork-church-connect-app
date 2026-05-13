import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, ArrowRight } from "lucide-react-native";

type Verse = { text: string; reference: string };

const VERSES: Verse[] = [
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { text: "For God so loved the world, that he gave his only Son.", reference: "John 3:16" },
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", reference: "Proverbs 3:5" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { text: "The Lord is my light and my salvation; whom shall I fear?", reference: "Psalm 27:1" },
  { text: "And we know that in all things God works for the good of those who love him.", reference: "Romans 8:28" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "Your word is a lamp for my feet, a light on my path.", reference: "Psalm 119:105" },
  { text: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { text: "The steadfast love of the Lord never ceases; his mercies never come to an end.", reference: "Lamentations 3:22" },
  { text: "Weeping may stay for the night, but rejoicing comes in the morning.", reference: "Psalm 30:5" },
  { text: "Rejoice in the Lord always. I will say it again: Rejoice!", reference: "Philippians 4:4" },
  { text: "Let everything that has breath praise the Lord.", reference: "Psalm 150:6" },
  { text: "Remember the Sabbath day, to keep it holy.", reference: "Exodus 20:8" },
  { text: "Love is patient, love is kind. It does not envy, it does not boast.", reference: "1 Corinthians 13:4" },
  { text: "But those who hope in the Lord will renew their strength.", reference: "Isaiah 40:31" },
  { text: "Greater love has no one than this: to lay down one's life for one's friends.", reference: "John 15:13" },
  { text: "The fear of the Lord is the beginning of wisdom.", reference: "Proverbs 9:10" },
];

interface Props {
  onDismiss: () => void;
}

const DURATION_MS = 10000;

export default function BibleVerseSplash({ onDismiss }: Props) {
  const verse = useMemo<Verse>(() => {
    return VERSES[Math.floor(Math.random() * VERSES.length)];
  }, []);

  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start();

    const t = setTimeout(() => {
      handleDismiss();
    }, DURATION_MS);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    if (dismissed) return;
    setDismissed(true);
    Animated.timing(fade, {
      toValue: 0,
      duration: 350,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
      testID="bible-verse-splash"
    >
      <LinearGradient
        colors={["#0b1d4d", "#1e3a8a", "#3b82f6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Animated.View
        style={[
          styles.content,
          { transform: [{ translateY: translate }] },
        ]}
      >
        <View style={styles.iconWrap}>
          <BookOpen color="#fde68a" size={36} />
        </View>

        <Text style={styles.label}>Verse of the moment</Text>

        <Text style={styles.verse}>&ldquo;{verse.text}&rdquo;</Text>

        <Text style={styles.reference}>{verse.reference}</Text>
      </Animated.View>

      <View style={styles.bottom}>
        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          testID="bible-verse-continue"
        >
          <Text style={styles.buttonText}>Continue</Text>
          <ArrowRight color="#1e3a8a" size={18} />
        </Pressable>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 9999,
    justifyContent: "space-between",
    paddingTop: 120,
    paddingBottom: 64,
    paddingHorizontal: 28,
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(253, 230, 138, 0.18)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(253, 230, 138, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  label: {
    color: "#fde68a",
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 16,
  },
  verse: {
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 36,
    fontWeight: "600",
    marginBottom: 20,
  },
  reference: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "500",
    fontStyle: "italic",
  },
  bottom: {
    gap: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "#1e3a8a",
    fontSize: 16,
    fontWeight: "700",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fde68a",
  },
});
