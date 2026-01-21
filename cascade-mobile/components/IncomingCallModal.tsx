import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { CallInvite } from '../services/voice';

interface Props {
  visible: boolean;
  callInvite: CallInvite | null;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ visible, callInvite, onAccept, onReject }: Props) {
  if (!callInvite) return null;

  const callerInfo = callInvite.getFrom() || 'Unknown Caller';
  const customParameters = callInvite.getCustomParameters();
  const callerName = customParameters?.callerName || callerInfo;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onReject}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Badge */}
          <View style={styles.header}>
            <Text style={styles.badge}>Incoming Verified Call</Text>
          </View>

          {/* Caller Info */}
          <View style={styles.callerInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>📞</Text>
            </View>
            <Text style={styles.callerName} numberOfLines={1}>
              {callerName}
            </Text>
            <Text style={styles.callerNumber} numberOfLines={1}>
              {callerInfo}
            </Text>
            <Text style={styles.subtitle}>via AI Gatekeeper</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={onReject}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>✕ Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>✓ Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: '#6750A4',
    color: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#6750A4',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  callerName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  callerNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rejectButton: {
    backgroundColor: '#EF5350',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});
