import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  isActive: boolean;
  identity?: string;
}

export function GatekeeperStatus({ isActive, identity = 'kevin_pixel' }: Props) {
  return (
    <View style={[styles.container, isActive ? styles.active : styles.inactive]}>
      <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          AI Gatekeeper: {isActive ? 'ACTIVE' : 'DISCONNECTED'}
        </Text>
        <Text style={styles.subtitle}>
          {isActive 
            ? `Ready to receive calls as '${identity}'` 
            : 'Connecting to Twilio Voice...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  active: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  inactive: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  dotInactive: {
    backgroundColor: '#9E9E9E',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
