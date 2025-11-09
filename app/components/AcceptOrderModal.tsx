import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { formatPrice } from '../../services/Product/productService';

interface BankAccount {
  id: string;
  bankName: string;
  bankShortName?: string;
  bankCode?: string;
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
}

interface Order {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  productSnapshot: {
    title: string;
    price: number;
    images: string[];
  };
  totalAmount: number;
  shippingFee: number;
}

interface AcceptOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: (sellerNote: string, selectedBankAccount: BankAccount) => void;
  order: Order | null;
  bankAccounts: BankAccount[];
  loading?: boolean;
}

const AcceptOrderModal: React.FC<AcceptOrderModalProps> = ({
  visible,
  onClose,
  onAccept,
  order,
  bankAccounts,
  loading = false
}) => {
  const [sellerNote, setSellerNote] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [showBankList, setShowBankList] = useState(false);

  useEffect(() => {
    if (bankAccounts.length > 0) {
      const defaultAccount = bankAccounts.find(acc => acc.isDefault) || bankAccounts[0];
      setSelectedBankAccount(defaultAccount);
    } else {
      setSelectedBankAccount(null);
    }
  }, [bankAccounts]);

  const handleAccept = () => {
    if (!selectedBankAccount) {
      Alert.alert('Error', 'Please add a bank account first to receive payments');
      return;
    }

    if (!sellerNote.trim()) {
      Alert.alert('Error', 'Please add a message for the buyer');
      return;
    }

    onAccept(sellerNote, selectedBankAccount);
  };

  const formatAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
  };

  const resetForm = () => {
    setSellerNote('');
    setSelectedBankAccount(bankAccounts.find(acc => acc.isDefault) || bankAccounts[0] || null);
    setShowBankList(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderBankAccountItem = (account: BankAccount, showDefaultBadge: boolean = true) => (
    <View style={styles.bankAccountItem}>
      <View style={styles.bankAccountInfo}>
        <Text style={styles.bankName}>{account.bankName}</Text>
        <Text style={styles.accountNumber}>
          {formatAccountNumber(account.accountNumber)}
        </Text>
        <Text style={styles.accountHolder}>
          {account.accountHolder}
        </Text>
      </View>
      {showDefaultBadge && account.isDefault && (
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultBadgeText}>Default</Text>
        </View>
      )}
    </View>
  );

  const handleBankAccountPress = () => {
    if (bankAccounts.length > 1) {
      setShowBankList(!showBankList);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Accept Order</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {order && (
            <View style={styles.orderInfo}>
              <Text style={styles.sectionTitle}>Order Information</Text>
              
              <View style={styles.productSection}>
                {order.productSnapshot.images?.[0] && (
                  <Image 
                    source={{ uri: order.productSnapshot.images[0] }} 
                    style={styles.productImage}
                  />
                )}
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {order.productSnapshot.title}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatPrice(order.productSnapshot.price)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Product Price:</Text>
                  <Text style={styles.detailValue}>
                    {formatPrice(order.productSnapshot.price)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Shipping Fee:</Text>
                  <Text style={styles.detailValue}>
                    {formatPrice(order.shippingFee)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>
                    {formatPrice(order.totalAmount)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Bank Account</Text>
            
            {bankAccounts.length === 0 ? (
              <View style={styles.noBankSection}>
                <Text style={styles.noBankText}>No Bank Account</Text>
                <Text style={styles.noBankSubtext}>
                  You need to add a bank account in your profile to receive payments
                </Text>
                <Text style={styles.noBankInstruction}>
                  Please go to Profile → Personal Info → Bank Accounts to add your bank account
                </Text>
              </View>
            ) : (
              <View style={styles.bankSection}>
                <Text style={styles.bankSectionTitle}>
                  {bankAccounts.length === 1 
                    ? 'Your bank account:' 
                    : 'Select bank account for payment:'
                  }
                </Text>
                
                <TouchableOpacity
                  style={[
                    styles.bankSelector,
                    bankAccounts.length > 1 && styles.bankSelectorClickable
                  ]}
                  onPress={handleBankAccountPress}
                  disabled={bankAccounts.length === 1}
                >
                  {selectedBankAccount ? (
                    <View style={styles.selectedBank}>
                      {renderBankAccountItem(selectedBankAccount)}
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>Select a bank account</Text>
                  )}
                  
                  {bankAccounts.length > 1 && (
                    <Text style={styles.dropdownArrow}>
                      {showBankList ? '▲' : '▼'}
                    </Text>
                  )}
                </TouchableOpacity>

                {showBankList && bankAccounts.length > 1 && (
                  <View style={styles.bankList}>
                    {bankAccounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.bankOption,
                          selectedBankAccount?.id === account.id && styles.selectedBankOption
                        ]}
                        onPress={() => {
                          setSelectedBankAccount(account);
                          setShowBankList(false);
                        }}
                      >
                        {renderBankAccountItem(account, false)}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {bankAccounts.length > 1 && (
                  <Text style={styles.bankSelectionNote}>
                    💡 Tap on the bank account to select a different one
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message to Buyer</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Enter your message to the buyer (payment instructions, shipping details, etc.)"
              value={sellerNote}
              onChangeText={setSellerNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.noteTitle}>Note:</Text>
            <Text style={styles.noteText}>
              • The buyer will receive your bank account information for payment{'\n'}
              • Make sure your bank account details are correct{'\n'}
              • You can add specific payment instructions in the message{'\n'}
              • Order will move to "Waiting Payment" status
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.acceptButton, 
              (!selectedBankAccount || !sellerNote.trim() || bankAccounts.length === 0) && styles.disabledButton
            ]}
            onPress={handleAccept}
            disabled={loading || !selectedBankAccount || !sellerNote.trim() || bankAccounts.length === 0}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.acceptButtonText}>
                {bankAccounts.length === 0 ? 'Add Bank First' : 'Accept Order'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  orderInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  section: {
    marginBottom: 20,
  },
  noBankSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fffaf0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noBankText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e67e22',
    marginBottom: 8,
  },
  noBankSubtext: {
    fontSize: 14,
    color: '#e67e22',
    textAlign: 'center',
    marginBottom: 8,
  },
  noBankInstruction: {
    fontSize: 12,
    color: '#e67e22',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bankSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bankSectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  bankSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bankSelectorClickable: {
    backgroundColor: '#f8f9fa',
  },
  selectedBank: {
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  bankList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: 'white',
    maxHeight: 200,
  },
  bankOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedBankOption: {
    backgroundColor: '#f0f8ff',
  },
  bankAccountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  accountHolder: {
    fontSize: 13,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  bankSelectionNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
  },
  noteSection: {
    backgroundColor: '#fffaf0',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffa500',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#cc8500',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#cc8500',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  acceptButton: {
    backgroundColor: '#00A86B',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default AcceptOrderModal;