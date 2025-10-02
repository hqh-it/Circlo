import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AddressItem {
  code: string;
  name: string;
}

interface AddressPickerProps {
  items: AddressItem[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  enabled?: boolean;
}

export const AddressPicker: React.FC<AddressPickerProps> = ({
  items,
  selectedValue,
  onValueChange,
  placeholder,
  enabled = true
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLabel = selectedValue 
    ? items.find(item => item.code === selectedValue)?.name 
    : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerTrigger, !enabled && styles.disabled]}
        onPress={() => enabled && setModalVisible(true)}
        disabled={!enabled}
      >
        <Text style={[
          styles.pickerText,
          !selectedValue && styles.placeholderText
        ]}>
          {selectedLabel}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={items}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  selectedValue === item.code && styles.selectedItem
                ]}
                onPress={() => {
                  onValueChange(item.code);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.itemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pickerTrigger: {
    borderWidth: 1.5,
    borderColor: '#00A86B',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    minHeight: 45,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  pickerText: {
    fontSize: 14,
    color: '#000',
  },
  placeholderText: {
    color: '#888',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#00A86B',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#e6f7f0',
    borderLeftWidth: 4,
    borderLeftColor: '#00A86B',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default AddressPicker;