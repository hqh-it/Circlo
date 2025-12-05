import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export interface SuspensionReason {
  id: string;
  label: string;
  category: string;
  level: 'WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PERMANENT';
  duration: number;
}

interface SuspensionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, duration: number, customReason?: string, level?: string) => void;
  userName: string;
  preSelectedReason?: string;
  preSelectedLevel?: string;
}

const suspensionReasons: SuspensionReason[] = [
  {
    id: 'warning_spam',
    label: 'Minor spam',
    category: 'behavior',
    level: 'WARNING',
    duration: 0
  },
  {
    id: 'warning_late_response',
    label: 'Late response',
    category: 'behavior',
    level: 'WARNING',
    duration: 0
  },
  {
    id: 'low_fake_bidding',
    label: 'Fake bidding',
    category: 'behavior',
    level: 'LOW',
    duration: 1
  },
  {
    id: 'low_minor_spam',
    label: 'Post spam',
    category: 'behavior',
    level: 'LOW',
    duration: 1
  },
  {
    id: 'medium_false_images',
    label: 'Misleading images',
    category: 'product',
    level: 'MEDIUM',
    duration: 3
  },
  {
    id: 'medium_product_misrepresentation',
    label: 'Product not as described',
    category: 'product',
    level: 'MEDIUM',
    duration: 3
  },
  {
    id: 'high_harassment',
    label: 'User harassment',
    category: 'behavior',
    level: 'HIGH',
    duration: 7
  },
  {
    id: 'high_fake_contact',
    label: 'Fake contact info',
    category: 'behavior',
    level: 'HIGH',
    duration: 7
  },
  {
    id: 'high_no_delivery',
    label: 'No delivery after payment',
    category: 'security',
    level: 'HIGH',
    duration: 7
  },
  {
    id: 'permanent_fraud',
    label: 'Organized fraud',
    category: 'security',
    level: 'PERMANENT',
    duration: -1
  },
  {
    id: 'permanent_prohibited_item',
    label: 'Selling prohibited items',
    category: 'product',
    level: 'PERMANENT',
    duration: -1
  },
  {
    id: 'permanent_repeat_offender',
    label: 'Repeat offender',
    category: 'other',
    level: 'PERMANENT',
    duration: -1
  }
];

const levelConfig = {
  WARNING: { label: 'Warning', color: '#ffa500', durationText: 'Send warning' },
  LOW: { label: 'Low', color: '#ff6b00', durationText: '1 day' },
  MEDIUM: { label: 'Medium', color: '#dc3545', durationText: '3 days' },
  HIGH: { label: 'High', color: '#8b0000', durationText: '7 days' },
  PERMANENT: { label: 'Permanent', color: '#000000', durationText: 'Permanent' }
};

const SuspensionModal: React.FC<SuspensionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  userName,
  preSelectedReason,
  preSelectedLevel
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PERMANENT'>('WARNING');
  const [selectedReason, setSelectedReason] = useState<SuspensionReason | null>(null);
  const [customDuration, setCustomDuration] = useState<string>('');

  useEffect(() => {
    if (preSelectedLevel) {
      const level = preSelectedLevel as 'WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PERMANENT';
      setSelectedLevel(level);
      
      if (preSelectedReason) {
        const reason = suspensionReasons.find(r => 
          r.label === preSelectedReason && r.level === level
        );
        if (reason) {
          setSelectedReason(reason);
        }
      }
    }
  }, [preSelectedReason, preSelectedLevel]);

  const filteredReasons = suspensionReasons.filter(reason => reason.level === selectedLevel);

  const handleConfirm = () => {
    if (!selectedReason) return;
    
    let duration = selectedReason.duration;
    if (customDuration && selectedReason.level !== 'PERMANENT' && selectedReason.level !== 'WARNING') {
      const customDays = parseInt(customDuration);
      if (!isNaN(customDays) && customDays > 0) {
        duration = customDays;
      }
    }
    
    onConfirm(selectedReason.label, duration, customDuration || '', selectedReason.level);
    resetForm();
  };

  const resetForm = () => {
    setSelectedReason(null);
    setSelectedLevel('WARNING');
    setCustomDuration('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getConfirmButtonText = () => {
    if (!selectedReason) return 'Select Action';
    
    if (selectedReason.level === 'WARNING') {
      return 'Send Warning';
    } else if (selectedReason.level === 'PERMANENT') {
      return 'Deactivate Permanently';
    } else {
      const days = customDuration && parseInt(customDuration) > 0 ? parseInt(customDuration) : selectedReason.duration;
      return `Deactivate for ${days} day${days !== 1 ? 's' : ''}`;
    }
  };

  const levels: ('WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PERMANENT')[] = ['WARNING', 'LOW', 'MEDIUM', 'HIGH', 'PERMANENT'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Deactivate {userName}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
            {levels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.tab,
                  selectedLevel === level && { backgroundColor: levelConfig[level].color }
                ]}
                onPress={() => setSelectedLevel(level)}
              >
                <Text style={[
                  styles.tabText,
                  selectedLevel === level && styles.selectedTabText
                ]}>
                  {levelConfig[level].label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.levelInfo}>
            <Text style={[styles.levelLabel, { color: levelConfig[selectedLevel].color }]}>
              {levelConfig[selectedLevel].label} Level
            </Text>
            <Text style={styles.durationText}>
              {levelConfig[selectedLevel].durationText}
            </Text>
          </View>

          <FlatList
            data={filteredReasons}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.reasonItem,
                  selectedReason?.id === item.id && { borderColor: levelConfig[selectedLevel].color }
                ]}
                onPress={() => setSelectedReason(item)}
              >
                <Text style={styles.reasonText}>{item.label}</Text>
              </TouchableOpacity>
            )}
            style={styles.reasonList}
            showsVerticalScrollIndicator={false}
          />

          {(selectedReason && selectedReason.level !== 'WARNING' && selectedReason.level !== 'PERMANENT') && (
            <View style={styles.customDurationContainer}>
              <Text style={styles.sectionTitle}>Custom Duration (days)</Text>
              <TextInput
                style={styles.textInput}
                placeholder={`Default: ${selectedReason.duration} days`}
                value={customDuration}
                onChangeText={setCustomDuration}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                !selectedReason && styles.disabledButton
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason}
            >
              <Text style={styles.confirmButtonText}>{getConfirmButtonText()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  tabsContainer: {
    marginBottom: 15,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  selectedTabText: {
    color: 'white',
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 8,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  reasonList: {
    maxHeight: 200,
    marginBottom: 15,
  },
  reasonItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  customDurationContainer: {
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#00A86B',
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default SuspensionModal;