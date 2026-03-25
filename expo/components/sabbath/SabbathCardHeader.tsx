import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Church, ChevronRight } from 'lucide-react-native';
import type { SabbathStatus } from '@/types/sabbath';
import { SabbathStatusBadge } from './SabbathStatusBadge';

interface SabbathCardHeaderProps {
  groupName: string;
  status: SabbathStatus;
  onViewDetail?: () => void;
}

export function SabbathCardHeader({ groupName, status, onViewDetail }: SabbathCardHeaderProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onViewDetail}
      disabled={!onViewDetail}
      activeOpacity={onViewDetail ? 0.7 : 1}
    >
      <View style={styles.left}>
        <Church size={18} color="#1e3a8a" />
        <Text style={styles.churchName}>{groupName}</Text>
      </View>
      <View style={styles.right}>
        <SabbathStatusBadge status={status} />
        {onViewDetail && <ChevronRight size={18} color="#94a3b8" />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  churchName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    flex: 1,
  },
});
