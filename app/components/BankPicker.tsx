import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { banksData } from '../../services/User/bankData';

interface Bank {
  code: string;
  name: string;
  shortName: string;
  logo: string;
}

const { width, height } = Dimensions.get('window');

interface BankPickerProps {
  selectedBank: Bank | null;
  onBankSelect: (bank: Bank) => void;
  placeholder?: string;
}

const BankPicker: React.FC<BankPickerProps> = ({
  selectedBank,
  onBankSelect,
  placeholder = "Chọn ngân hàng"
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBanks = banksData.filter(bank =>
    bank.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBankSelect = (bank: Bank) => {
    onBankSelect(bank);
    setShowModal(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Bank Selector Button */}
      <TouchableOpacity 
        style={styles.selectorButton}
        onPress={() => setShowModal(true)}
      >
        {selectedBank ? (
          <View style={styles.selectedBank}>
            <Image 
              source={{ uri: selectedBank.logo }} 
              style={styles.bankLogo}
              resizeMode="contain"
              defaultSource={require('../assets/icons/defaultBank.png')}
            />
            <Text style={styles.selectedBankText}>{selectedBank.shortName}</Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>{placeholder}</Text>
        )}
      </TouchableOpacity>

      {/* Bank Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose bank's name</Text>
            
            {/* Search Bar */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search bank..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Bank List */}
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankItem}
                  onPress={() => handleBankSelect(item)}
                >
                  <Image 
                    source={{ uri: item.logo }} 
                    style={styles.bankItemLogo}
                    resizeMode="contain"
                    defaultSource={require('../assets/icons/defaultBank.png')}
                  />
                  <View style={styles.bankInfo}>
                    <Text style={styles.bankName}>{item.shortName}</Text>
                    <Text style={styles.bankFullName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              style={styles.bankList}
            />

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  selectedBank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankLogo: {
    width: 50,
    height: 50,
    borderRadius: 100,
    borderWidth:2,
    borderColor:"#e3e3e3ff"
  },
  selectedBankText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  bankList: {
    flex: 1,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  bankItemLogo: {
    width: 50,
    height: 50,
    borderRadius: 100,
    borderWidth:2,
    borderColor:"#e3e3e3ff"
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  bankFullName: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#00A86B',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default BankPicker;