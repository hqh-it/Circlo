import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import { banksData } from '../../services/User/bankData';
import { addBankAccount, updateBankAccount } from '../../services/User/userService';
import BankPicker from './BankPicker'; // Import BankPicker component

const { width } = Dimensions.get('window');

interface BankAccount {
  id: string;
  bankName: string;
  bankShortName?: string;
  bankCode?: string;
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
}

interface AddBankProps {
  visible: boolean;
  onClose: () => void;
  onBankAdded: () => void;
  editingBank?: BankAccount | null;
}

interface Bank {
  code: string;
  name: string;
  shortName: string;
  logo: string;
}

const AddBank: React.FC<AddBankProps> = ({ visible, onClose, onBankAdded, editingBank }) => {
  const { user } = useAuth();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingBank) {
        const bank = banksData.find(b => b.code === editingBank.bankCode);
        setSelectedBank(bank || null);
        setAccountNumber(editingBank.accountNumber);
        setAccountHolder(editingBank.accountHolder);
      } else {
        setSelectedBank(null);
        setAccountNumber('');
        setAccountHolder('');
      }
    }
  }, [visible, editingBank]);

  const handleSaveBank = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!selectedBank) {
      Alert.alert('Error', 'Please select a bank');
      return;
    }

    if (!accountNumber.trim()) {
      Alert.alert('Error', 'Please enter account number');
      return;
    }

    if (!accountHolder.trim()) {
      Alert.alert('Error', 'Please enter account holder name');
      return;
    }

    setLoading(true);

    try {
      const bankData = {
        bankName: selectedBank.name,
        bankShortName: selectedBank.shortName,
        bankCode: selectedBank.code,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      };

      let result;
      if (editingBank) {
        result = await updateBankAccount(user.uid, editingBank.id, bankData);
      } else {
        result = await addBankAccount(user.uid, bankData);
      }

      if (result.success) {
        Alert.alert('Success', result.message);
        onBankAdded();
        onClose();
      } else {
        Alert.alert('Error', result.error || `Failed to ${editingBank ? 'update' : 'add'} bank account`);
      }
    } catch (error) {
      console.error(`Error ${editingBank ? 'updating' : 'adding'} bank account:`, error);
      Alert.alert('Error', `Failed to ${editingBank ? 'update' : 'add'} bank account`);
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
          </Text>

          {/* Sử dụng BankPicker component */}
          <BankPicker
            selectedBank={selectedBank}
            onBankSelect={handleBankSelect}
            placeholder="Select a bank"
          />

          <TextInput
            style={styles.input}
            placeholder="Account Number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Account Holder Name"
            value={accountHolder}
            onChangeText={setAccountHolder}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.addButton, (!selectedBank || !accountNumber || !accountHolder) && styles.disabledButton]}
              onPress={handleSaveBank}
              disabled={loading || !selectedBank || !accountNumber || !accountHolder}
            >
              <Text style={styles.buttonText}>
                {loading ? (editingBank ? 'Updating...' : 'Adding...') : (editingBank ? 'Update Bank' : 'Add Bank')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#00A86B',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    marginTop: 15, // Thêm khoảng cách phía trên
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  addButton: {
    backgroundColor: '#00A86B',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddBank;