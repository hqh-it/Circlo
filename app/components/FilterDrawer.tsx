import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getProductsByFilter } from '../../services/Product/productService';
import { fetchProvinces } from '../../services/User/address';
import AddressPicker from '../components/AddressPicker';

const { width, height } = Dimensions.get('window');

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filterResult: any) => void;
}

interface Category {
  label: string;
  value: string;
}

interface Condition {
  label: string;
  value: string;
}

interface PriceRange {
  label: string;
  value: [number, number | null];
}

interface AddressItem {
  code: string;
  name: string;
  parent_code?: string;
}

const categories: Category[] = [
  { label: '👕 Fashion - Accessories', value: 'fashion' },
  { label: '🏠 Home - Furniture', value: 'home' },
  { label: '📚 Books - Stationery', value: 'books' },
  { label: '🎮 Toys - Entertainment', value: 'toys' },
  { label: '🎁 Others', value: 'other' }
];

const conditions: Condition[] = [
  { label: 'Like New (99%)', value: 'like_new' },
  { label: 'Used Good (70%-80%)', value: 'used_good' },
  { label: 'Used Fair (50%)', value: 'used_fair' }
];

const priceRanges: PriceRange[] = [
  { label: 'Under 100K', value: [0, 100000] },
  { label: '100K - 500K', value: [100000, 500000] },
  { label: '500K - 1M', value: [500000, 1000000] },
  { label: '1M - 5M', value: [1000000, 5000000] },
  { label: 'Over 5M', value: [5000000, null] }
];

const FilterDrawer: React.FC<FilterDrawerProps> = ({ visible, onClose, onApplyFilters }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000000]);
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: false,
    condition: false,
    sort: false,
    location: false,
  });
  const [provinces, setProvinces] = useState<AddressItem[]>([]);
  const [slideAnim] = useState(new Animated.Value(-width));

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const provincesData = fetchProvinces();
        setProvinces(provincesData);
      } catch (error) {
        console.error('Error loading provinces:', error);
        setProvinces([]);
      }
    };

    loadProvinces();
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCategoryToggle = (categoryValue: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryValue) 
        ? prev.filter(item => item !== categoryValue)
        : [...prev, categoryValue]
    );
  };

  const handleConditionToggle = (conditionValue: string) => {
    setSelectedConditions(prev =>
      prev.includes(conditionValue)
        ? prev.filter(item => item !== conditionValue)
        : [...prev, conditionValue]
    );
  };

  const handlePriceRangeSelect = (range: [number, number | null]) => {
    if (range[1] === null) {
      setPriceRange([range[0], 20000000]);
    } else {
      setPriceRange([range[0], range[1]]);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  const getPriceDisplayText = (): string => {
    if (priceRange[0] === 0 && priceRange[1] === 20000000) {
      return 'Select price range';
    }
    return `${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`;
  };

  const handleApplyFilters = async () => {
    try {
      const filters: any = {
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        conditions: selectedConditions.length > 0 ? selectedConditions : undefined,
        sort: selectedSort || undefined,
        location: selectedLocation || undefined, 
        minPrice: priceRange[0] !== 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] !== 20000000 ? priceRange[1] : undefined,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      console.log('Sending filters to backend:', filters);

      const result = await getProductsByFilter(filters);
      
      if (result.success) {
        onApplyFilters({
          filters: filters,
          products: result.products,
          total: result.total
        });
      } else {
        onApplyFilters({
          filters: filters,
          products: [],
          total: 0,
          error: result.error
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error applying filters:', error);
      onClose();
    }
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedSort('');
    setSelectedLocation('');
    setPriceRange([0, 20000000]);
  };

  const DropdownSection: React.FC<{
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    hasSelection?: boolean;
  }> = ({ title, isExpanded, onToggle, children, hasSelection = false }) => (
    <View style={styles.dropdownSection}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={onToggle}>
        <Text style={styles.dropdownTitle}>{title}</Text>
        <View style={styles.dropdownHeaderRight}>
          {hasSelection && <View style={styles.selectionDot} />}
          <Text style={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.dropdownContent}>
          {children}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View 
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <DropdownSection
              title="📦 Category"
              isExpanded={expandedSections.category}
              onToggle={() => toggleSection('category')}
              hasSelection={selectedCategories.length > 0}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.filterItem,
                    selectedCategories.includes(category.value) && styles.selectedItem,
                  ]}
                  onPress={() => handleCategoryToggle(category.value)}
                >
                  <View style={styles.checkbox}>
                    {selectedCategories.includes(category.value) && (
                      <View style={styles.checkboxSelected} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.filterText,
                      selectedCategories.includes(category.value) && styles.selectedText,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </DropdownSection>

            <DropdownSection
              title="💰 Price Range"
              isExpanded={expandedSections.price}
              onToggle={() => toggleSection('price')}
              hasSelection={priceRange[0] !== 0 || priceRange[1] !== 20000000}
            >
              <View style={styles.priceDisplay}>
                <Text style={styles.priceText}>
                  {getPriceDisplayText()}
                </Text>
              </View>

              <View style={styles.sliderContainer}>
                <Slider
                  minimumValue={0}
                  maximumValue={20000000}
                  step={10000}
                  value={priceRange[1]}
                  onValueChange={(value) => setPriceRange([priceRange[0], value])}
                  minimumTrackTintColor="#01332fff"
                  maximumTrackTintColor="#e0e0e0"
                  thumbTintColor="#01332fff"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>0₫</Text>
                  <Text style={styles.sliderLabel}>20,000,000₫</Text>
                </View>
              </View>

              <View style={styles.quickSelectContainer}>
                {priceRanges.map((range, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.quickSelectButton,
                      priceRange[0] === range.value[0] && priceRange[1] === (range.value[1] || 20000000) && styles.quickSelectButtonActive
                    ]}
                    onPress={() => handlePriceRangeSelect(range.value)}
                  >
                    <Text style={[
                      styles.quickSelectText,
                      priceRange[0] === range.value[0] && priceRange[1] === (range.value[1] || 20000000) && styles.quickSelectTextActive
                    ]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </DropdownSection>

            <DropdownSection
              title="⭐ Condition"
              isExpanded={expandedSections.condition}
              onToggle={() => toggleSection('condition')}
              hasSelection={selectedConditions.length > 0}
            >
              {conditions.map((condition) => (
                <TouchableOpacity
                  key={condition.value}
                  style={[
                    styles.filterItem,
                    selectedConditions.includes(condition.value) && styles.selectedItem,
                  ]}
                  onPress={() => handleConditionToggle(condition.value)}
                >
                  <View style={styles.checkbox}>
                    {selectedConditions.includes(condition.value) && (
                      <View style={styles.checkboxSelected} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.filterText,
                      selectedConditions.includes(condition.value) && styles.selectedText,
                    ]}
                  >
                    {condition.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </DropdownSection>

            <DropdownSection
              title="🔀 Sort By"
              isExpanded={expandedSections.sort}
              onToggle={() => toggleSection('sort')}
              hasSelection={!!selectedSort}
            >
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedSort}
                  onValueChange={(itemValue: string) => setSelectedSort(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Price: Low to High" value="price_low_high" />
                  <Picker.Item label="Price: High to Low" value="price_high_low" />
                </Picker>
              </View>
            </DropdownSection>

            <DropdownSection
              title="📍 Location"
              isExpanded={expandedSections.location}
              onToggle={() => toggleSection('location')}
              hasSelection={!!selectedLocation}
            >
              <View style={styles.addressPicker}>
                <AddressPicker
                  items={provinces}
                  selectedValue={selectedLocation}
                  onValueChange={setSelectedLocation}
                  placeholder="Select Province/City"
                />
              </View>
              
              {selectedLocation && (
                <View style={styles.selectedLocation}>
                  <Text style={styles.selectedLocationText}>
                    📍 {provinces.find(p => p.code === selectedLocation)?.name}
                  </Text>
                </View>
              )}
            </DropdownSection>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={handleResetFilters}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#01332fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingBottom:30,
    paddingHorizontal:16
  },
  dropdownSection: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
  },
  dropdownHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666666',
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#15ff00ff',
  },
  dropdownContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  selectedItem: {
    backgroundColor: '#01332fff',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#01332fff',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#01332fff',
  },
  filterText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  priceDisplay: {
    backgroundColor: '#f0f9f4',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00A86B',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00A86B',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quickSelectButtonActive: {
    backgroundColor: '#01332fff',
    borderColor: '#01332fff',
  },
  quickSelectText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  quickSelectTextActive: {
    color: '#FFFFFF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 55,
    color: '#333',
  },
  addressPicker: {
    marginBottom: 14,
  },
  selectedLocation: {
    backgroundColor: '#f0f9f4',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00A86B',
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#00A86B',
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 10,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#01332fff',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#01332fff',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#01332fff',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default FilterDrawer;