export class DeliveryService {
  static REGIONS = {
    NORTH: ['01', '02', '04', '06', '08', '10', '11', '12', '14', '15', '17', '19', '20', '22', '24', '25', '26', '27', '30', '31', '33', '34', '35', '36', '37', '38', '40', '42', '44', '45', '46', '48', '49', '51', '52', '54', '56', '58', '60', '62', '64', '66', '67', '68', '70', '72', '74', '75', '77', '79', '80', '82', '83', '84', '86', '87', '89', '91', '92', '93', '94', '95', '96'],
    CENTRAL: ['03', '05', '07', '09', '13', '16', '18', '21', '23', '28', '29', '32', '39', '41', '43', '47', '50', '53', '55', '57', '59', '61', '63', '65', '69', '71', '73', '76', '78', '81', '85', '88', '90']
  };

  static SHIPPING_RATES = {
    SAME_PROVINCE: 20000, 
    SAME_REGION: 35000,     
    DIFFERENT_REGION: 50000 
  };

  static getRegion(provinceCode) {
    if (this.REGIONS.NORTH.includes(provinceCode)) return 'NORTH';
    if (this.REGIONS.CENTRAL.includes(provinceCode)) return 'CENTRAL';
    return 'SOUTH';
  }

  static calculateDistance(sellerAddress, buyerAddress) {
    const sellerRegion = this.getRegion(sellerAddress.provinceCode);
    const buyerRegion = this.getRegion(buyerAddress.provinceCode);

    if (sellerAddress.provinceCode === buyerAddress.provinceCode) {
      return 'SAME_PROVINCE';
    }
    
    if (sellerRegion === buyerRegion) {
      return 'SAME_REGION';
    }
    
    return 'DIFFERENT_REGION';
  }

  static calculateShippingFee(sellerAddress, buyerAddress) {
    try {
      const distance = this.calculateDistance(sellerAddress, buyerAddress);
      const shippingFee = this.SHIPPING_RATES[distance];

      return {
        success: true,
        shippingFee,
        distanceType: distance,
        sellerRegion: this.getRegion(sellerAddress.provinceCode),
        buyerRegion: this.getRegion(buyerAddress.provinceCode)
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        shippingFee: 35000 
      };
    }
  }

  static calculateServiceFee(productPrice) {
    const buyerServiceFee = Math.round(productPrice * 0.02);
    const sellerServiceFee = Math.round(productPrice * 0.02);
    
    return {
      buyerServiceFee,
      sellerServiceFee,
      totalServiceFee: buyerServiceFee + sellerServiceFee
    };
  }

  static calculateTotalPayment(productPrice, sellerAddress, buyerAddress) {
    const shippingResult = this.calculateShippingFee(sellerAddress, buyerAddress);
    const serviceFee = this.calculateServiceFee(productPrice);

    return {
      productPrice,
      shippingFee: shippingResult.shippingFee,
      buyerServiceFee: serviceFee.buyerServiceFee,
      sellerServiceFee: serviceFee.sellerServiceFee,
      totalPayment: productPrice + shippingResult.shippingFee + serviceFee.buyerServiceFee,
      breakdown: {
        shipping: shippingResult,
        service: serviceFee
      }
    };
  }
}