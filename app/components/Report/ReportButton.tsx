import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../../services/Auth/AuthContext';
import { levelConfig, reportReasons, submitReport } from '../../../services/Report/ReportService';

interface ReportButtonProps {
  reportedUserId: string;
  reportedUserName: string;
  size?: number;
}

const ReportButton: React.FC<ReportButtonProps> = ({ 
  reportedUserId, 
  reportedUserName,
  size = 40 
}) => {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PERMANENT'>('WARNING');
  const [selectedReason, setSelectedReason] = useState<any>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredReasons = reportReasons.filter(reason => reason.level === selectedLevel);
  const levels: ('WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PERMANENT')[] = ['WARNING', 'LOW', 'MEDIUM', 'HIGH', 'PERMANENT'];

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5 - images.length
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      videoMaxDuration: 60
    });

    if (!result.canceled && result.assets[0]) {
      setVideo(result.assets[0].uri);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const removeVideo = () => {
    setVideo(null);
  };

  const handleSubmit = async () => {
    if (!selectedReason && !customDescription.trim()) {
      Alert.alert('Error', 'Please select a reason or provide a description');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a report');
      return;
    }

    setLoading(true);

    const reportData = {
      reporterId: user.uid,
      reportedUserId,
      reason: selectedReason?.label || 'Other',
      description: customDescription,
      level: selectedReason?.level || 'WARNING',
      images,
      video,
      customReason: !selectedReason ? customDescription : '',
      userName: user.displayName || user.email || 'Anonymous',
      reportedUserName
    };

    const result = await submitReport(reportData);

    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Your report has been submitted successfully');
      resetForm();
      setModalVisible(false);
    } else {
      Alert.alert('Error', result.error || 'Failed to submit report');
    }
  };

  const resetForm = () => {
    setSelectedLevel('WARNING');
    setSelectedReason(null);
    setCustomDescription('');
    setImages([]);
    setVideo(null);
  };

  const handleClose = () => {
    resetForm();
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.reportButton, { width: size, height: size }]}
        onPress={() => setModalVisible(true)}
      >
        <Image 
          source={require('../../assets/icons/report.png')}
          style={[styles.reportIcon, { width: size * 0.5, height: size * 0.5 }]}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report {reportedUserName}</Text>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.tabsContainer}
            >
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
                {levelConfig[selectedLevel].label} Level Violations
              </Text>
            </View>

            <View style={styles.scrollContainer}>
              <ScrollView 
                style={styles.mainScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.reasonsContainer}>
                  {filteredReasons.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.reasonItem,
                        selectedReason?.id === item.id && { borderColor: levelConfig[selectedLevel].color }
                      ]}
                      onPress={() => setSelectedReason(item)}
                    >
                      <Text style={styles.reasonText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.customDescriptionContainer}>
                  <Text style={styles.sectionTitle}>Or describe the issue in your own words</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Please provide detailed description of the violation..."
                    value={customDescription}
                    onChangeText={setCustomDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.evidenceSection}>
                  <Text style={styles.sectionTitle}>Evidence (Optional)</Text>
                  
                  <View style={styles.uploadButtonsContainer}>
                    <View style={styles.uploadButtonWrapper}>
                      <Text style={styles.uploadLabel}>Images</Text>
                      <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
                        <Text style={styles.uploadButtonText}>
                          Add Images ({images.length}/5)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.uploadButtonWrapper}>
                      <Text style={styles.uploadLabel}>Video</Text>
                      <TouchableOpacity 
                        style={[styles.uploadButton, video && styles.uploadButtonSuccess]} 
                        onPress={pickVideo}
                      >
                        <Text style={styles.uploadButtonText}>
                          {video ? 'Video Selected' : 'Add Video'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {images.length > 0 && (
                    <View style={styles.imagesSection}>
                      <Text style={styles.mediaSectionTitle}>Selected Images</Text>
                      <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
                        {images.map((image, index) => (
                          <View key={index} style={styles.imageWrapper}>
                            <Image source={{ uri: image }} style={styles.image} />
                            <TouchableOpacity 
                              style={styles.removeImageButton}
                              onPress={() => removeImage(index)}
                            >
                              <Text style={styles.removeImageText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {video && (
                    <View style={styles.videoSection}>
                      <Text style={styles.mediaSectionTitle}>Selected Video</Text>
                      <View style={styles.videoPreviewContainer}>
                        <Video
                          source={{ uri: video }}
                          style={styles.videoPlayer}
                          useNativeControls
                          resizeMode={ResizeMode.CONTAIN}
                          isLooping={false}
                        />
                        <TouchableOpacity style={styles.removeVideoButton} onPress={removeVideo}>
                          <Text style={styles.removeVideoText}>Remove Video</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!selectedReason && !customDescription.trim()) && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={(!selectedReason && !customDescription.trim()) || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  reportButton: {
    backgroundColor: '#B22222',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  reportIcon: {
    tintColor: '#ffffff',
  },
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
    maxHeight: screenHeight * 0.8,
    height: screenHeight * 0.8,
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
    maxHeight: 40,
  },
  tab: {
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
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
    marginBottom: 15,
    paddingHorizontal: 8,
    
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
    minHeight: 200,
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  reasonsContainer: {
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
  customDescriptionContainer: {
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  evidenceSection: {
    marginBottom: 15,
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  uploadButtonWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    marginLeft: 4,
  },
  uploadButton: {
    backgroundColor: '#f0f9f4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00A86B',
    borderStyle: 'dashed',
  },
  uploadButtonSuccess: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  uploadButtonText: {
    fontSize: 12,
    color: '#00A86B',
    fontWeight: '600',
  },
  imagesSection: {
    marginBottom: 15,
  },
  videoSection: {
    marginBottom: 15,
  },
  mediaSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
  },
  imagesContainer: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
    paddingTop: 5,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00A86B',
  },
  removeImageButton: {
    position: 'absolute',
    right:-5,
    top:0,
    backgroundColor: '#ff4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  videoPreviewContainer: {
    marginTop: 5,
  },
  videoPlayer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  removeVideoButton: {
    backgroundColor: '#ff6b6b',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeVideoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  submitButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#B22222',
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default ReportButton;