import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from './kv';

export const asyncStore: KeyValueStore = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};
