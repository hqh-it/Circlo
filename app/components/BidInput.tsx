import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface BidInputProps {
  bidAmount: string;
  setBidAmount: (amount: string) => void;
  minBid: number;
  sending: boolean;
  onPlaceBid: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}

const BidInput: React.FC<BidInputProps> = ({
  bidAmount,
  setBidAmount,
  minBid,
  sending,
  onPlaceBid,
  disabled = false,
  disabledMessage
}) => {
  const [displayAmount, setDisplayAmount] = useState('');

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN');
  };

  const formatInputAmount = (text: string) => {
    const numericValue = text.replace(/\D/g, '');

    if (numericValue === '') {
      setDisplayAmount('');
      setBidAmount('');
    } else {
      const numberValue = parseInt(numericValue, 10);
      if (!isNaN(numberValue)) {
        const formatted = formatCurrency(numberValue);
        setDisplayAmount(formatted);
        setBidAmount(numericValue);
      }
    }
  };

  useEffect(() => {
    if (bidAmount) {
      const numericValue = parseInt(bidAmount, 10);
      if (!isNaN(numericValue)) {
        setDisplayAmount(formatCurrency(numericValue));
      }
    } else {
      setDisplayAmount('');
    }
  }, [bidAmount]);

  if (disabled) {
    return (
      <View style={styles.disabledInputContainer}>
        <Text style={styles.disabledText}>
          {disabledMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.bidInputContainer}>
      <View style={styles.bidInputWrapper}>
        <View style={styles.bidInputBox}>
          <View style={styles.bidInputWithCurrency}>
            <TextInput
              style={styles.bidInput}
              value={displayAmount}
              onChangeText={formatInputAmount}
              placeholder={formatCurrency(minBid)}
              placeholderTextColor="#8F9BB3"
              keyboardType="numeric"
              editable={!sending}
            />
            <Text style={styles.inputCurrency}>VND</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[
            styles.placeBidButton,
            (!bidAmount || sending) && styles.placeBidButtonDisabled
          ]}
          onPress={onPlaceBid}
          disabled={!bidAmount || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.placeBidButtonContent}>
              <Text style={styles.placeBidButtonText}>Place Bid</Text>
              <Text style={styles.placeBidButtonSubtext}>
                Min: {formatCurrency(minBid)} VND
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bidInputContainer: {
    padding: 16,
    backgroundColor: "#01332fff",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  bidInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bidInputBox: {
    flex: 1,
  },
  bidInputLabel: {
    fontSize: 12,
    color: '#01332fff',
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  bidInputWithCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: "#01332fff",
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  bidInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#01332fff',
    fontWeight: '600',
  },
  inputCurrency: {
    fontSize: 14,
    color: '#323301ff',
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E8E8E8',
  },
  placeBidButton: {
    backgroundColor: "#028c80bb",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  placeBidButtonDisabled: {
    backgroundColor: "#C0C0C0",
    shadowOpacity: 0,
    elevation: 0,
  },
  placeBidButtonContent: {
    alignItems: 'center',
  },
  placeBidButtonText: {
    color: "#ffe893ff",
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  placeBidButtonSubtext: {
    color: "#000000ff",
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  disabledInputContainer: {
    padding: 16,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  disabledText: {
    fontSize: 16,
    color: "#666666",
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default BidInput;