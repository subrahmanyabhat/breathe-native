import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, TextInput,
  Image, StyleSheet, ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getInstalledApps, InstalledApp } from '../../modules/android-blocker';
import { Theme, DARK } from '../theme';

interface Props {
  visible: boolean;
  selectedPackages: string[];
  onDone: (packages: string[]) => void;
  onCancel: () => void;
  th?: Theme;
}

export default function AndroidAppPickerModal({
  visible, selectedPackages, onDone, onCancel, th = DARK,
}: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, StatusBar.currentHeight || 0);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedPackages));

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set(selectedPackages));
    setSearch('');
    setLoading(true);
    getInstalledApps()
      .then(list => { setApps(list.sort((a, b) => a.appName.localeCompare(b.appName))); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search) return apps;
    const q = search.toLowerCase();
    return apps.filter(a =>
      a.appName.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q)
    );
  }, [apps, search]);

  const toggle = (pkg: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(pkg) ? next.delete(pkg) : next.add(pkg);
      return next;
    });

  const renderItem = ({ item }: { item: InstalledApp }) => {
    const checked = selected.has(item.packageName);
    return (
      <TouchableOpacity
        style={[s.row, { borderBottomColor: th.border }]}
        onPress={() => toggle(item.packageName)}
        activeOpacity={0.7}
      >
        {item.icon ? (
          <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={s.icon} />
        ) : (
          <View style={[s.icon, { backgroundColor: th.surf, borderRadius: 10 }]} />
        )}
        <Text style={[s.name, { color: th.text }]} numberOfLines={1}>{item.appName}</Text>
        <View style={[
          s.checkbox,
          { borderColor: checked ? th.teal : th.border, backgroundColor: checked ? th.teal : 'transparent' },
        ]}>
          {checked && <Ionicons name="checkmark" size={14} color="#07111e" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={[s.container, { backgroundColor: th.bg }]}>
        <View style={[s.header, { borderBottomColor: th.border, paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={onCancel} style={s.hBtn}>
            <Text style={{ color: th.text2, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[s.title, { color: th.text }]}>Select Apps</Text>
          <TouchableOpacity onPress={() => onDone(Array.from(selected))} style={[s.hBtn, { alignItems: 'flex-end' }]}>
            <Text style={{ color: th.teal, fontSize: 16, fontWeight: '700' }}>
              Done ({selected.size})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[s.searchRow, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Ionicons name="search" size={16} color={th.label} style={{ marginRight: 8 }} />
          <TextInput
            style={[s.searchInput, { color: th.text }]}
            placeholder="Search apps…"
            placeholderTextColor={th.label}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={th.label} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={th.teal} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.packageName}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600' },
  hBtn: { minWidth: 80 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
  name: { flex: 1, fontSize: 15, marginRight: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
