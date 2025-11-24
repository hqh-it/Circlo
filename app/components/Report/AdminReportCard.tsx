// components/Admin/Report/AdminReportCard.tsx
import { ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deactivateUser } from '../../../services/Admin/AdminUserService';
import { resolveReport, updateReportStatus } from '../../../services/Report/ReportService';
import SuspensionModal from '../Admin/User/SuspensionModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description: string;
  level: string;
  images: string[];
  video?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  createdAt: any;
  customReason?: string;
  userName: string;
  reportedUserName: string;
}

interface AdminReportCardProps {
  report: Report;
  onReportUpdate: () => void;
}

const AdminReportCard: React.FC<AdminReportCardProps> = ({ report, onReportUpdate }) => {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [videoRef, setVideoRef] = useState<any>(null);

  const handleRejectReport = () => {
    Alert.alert(
      'Reject Report',
      'Reject this report? This will mark it as invalid.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => handleUpdateStatus('rejected')
        }
      ]
    );
  };

  const handleResolveReport = () => {
    setShowActionModal(true);
  };

  const handleConfirmAction = async (reason: string, duration: number, customReason?: string) => {
    setUpdating(true);
    try {
      const finalReason = customReason || reason;
      
      const suspendResult = await deactivateUser(
        report.reportedUserId, 
        finalReason, 
        duration
      );
      
      if (!suspendResult.success) {
        Alert.alert('Error', suspendResult.error);
        return;
      }
      
      const resolveResult = await resolveReport(
        report.id, 
        finalReason, 
        duration
      );
      
      if (resolveResult.success) {
        Alert.alert('Success', 'User has been suspended and report resolved');
        onReportUpdate();
      } else {
        Alert.alert('Error', resolveResult.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve report');
    } finally {
      setUpdating(false);
      setShowActionModal(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'rejected') => {
    setUpdating(true);
    try {
      const result = await updateReportStatus(report.id, newStatus);
      if (result.success) {
        Alert.alert('Success', result.message);
        onReportUpdate();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update report status');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewDetails = () => {
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setMediaIndex(0);
    if (videoRef) {
      videoRef.unloadAsync();
    }
  };

  const getStatusColor = () => {
    switch (report.status) {
      case 'pending': return '#FFA500';
      case 'reviewed': return '#2196F3';
      case 'resolved': return '#00A86B';
      case 'rejected': return '#dc3545';
      default: return '#666';
    }
  };

  const getLevelColor = () => {
    switch (report.level) {
      case 'WARNING': return '#ffa500';
      case 'LOW': return '#ff6b00';
      case 'MEDIUM': return '#dc3545';
      case 'HIGH': return '#8b0000';
      case 'PERMANENT': return '#000000';
      default: return '#666';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const hasEvidence = report.images.length > 0 || report.video;

  const renderMediaContent = () => {
    if (report.video && mediaIndex === 0) {
      return (
        <View style={styles.videoContainer}>
          <Video
            ref={setVideoRef}
            source={{ uri: report.video }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            isLooping={false}
          />
        </View>
      );
    }

    const imageIndex = report.video ? mediaIndex - 1 : mediaIndex;
    const currentImage = report.images[imageIndex];
    
    if (!currentImage) {
      return (
        <View style={styles.mediaPlaceholder}>
          <Text style={styles.placeholderText}>No media available</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: currentImage }}
        style={styles.mainImage}
        resizeMode="contain"
      />
    );
  };

  const allMediaItems = report.video ? [report.video, ...report.images] : report.images;

  return (
    <>
      <View style={[
        styles.card,
        report.status === 'pending' && styles.pendingCard,
        report.status === 'reviewed' && styles.reviewedCard,
        report.status === 'resolved' && styles.resolvedCard,
        report.status === 'rejected' && styles.rejectedCard
      ]}>
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{report.status.toUpperCase()}</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor() }]}>
            <Text style={styles.levelText}>{report.level}</Text>
          </View>
        </View>

        <View style={styles.reportInfo}>
          <View style={styles.userRow}>
            <Text style={styles.label}>Reporter:</Text>
            <Text style={styles.value}>{report.userName}</Text>
          </View>
          
          <View style={styles.userRow}>
            <Text style={styles.label}>Reported User:</Text>
            <Text style={styles.value}>{report.reportedUserName}</Text>
          </View>

          <View style={styles.reasonRow}>
            <Text style={styles.label}>Reason:</Text>
            <Text style={styles.reasonValue}>{report.reason}</Text>
          </View>

          {report.description && (
            <View style={styles.descriptionRow}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.descriptionValue}>{report.description}</Text>
            </View>
          )}

          {report.customReason && (
            <View style={styles.customReasonRow}>
              <Text style={styles.label}>Custom Reason:</Text>
              <Text style={styles.customReasonValue}>{report.customReason}</Text>
            </View>
          )}

          {hasEvidence && (
            <View style={styles.evidenceSection}>
              <Text style={styles.label}>Evidence Preview:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.evidencePreview}
              >
                {report.video && (
                  <TouchableOpacity 
                    style={styles.evidenceThumbnail}
                    onPress={handleViewDetails}
                  >
                    <View style={styles.videoThumbnail}>
                      <Text style={styles.videoThumbnailIcon}>🎥</Text>
                      <Text style={styles.videoThumbnailText}>Video</Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                {report.images.map((image, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.evidenceThumbnail}
                    onPress={handleViewDetails}
                  >
                    <Image 
                      source={{ uri: image }}
                      style={styles.evidenceThumbnailImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={handleViewDetails}
              >
                <Text style={styles.viewDetailsText}>
                  👁 View All Evidence ({allMediaItems.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.date}>
            Reported on: {formatDate(report.createdAt)}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.viewButton, updating && styles.disabledButton]}
            onPress={handleViewDetails}
            disabled={updating}
          >
            <Text style={styles.viewButtonText}>👁️ View</Text>
          </TouchableOpacity>

          {report.status === 'pending' && (
            <>
              <TouchableOpacity 
                style={[styles.resolveButton, updating && styles.disabledButton]}
                onPress={handleResolveReport}
                disabled={updating}
              >
                <Text style={styles.resolveButtonText}>✅ Resolve</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.rejectButton, updating && styles.disabledButton]}
                onPress={handleRejectReport}
                disabled={updating}
              >
                <Text style={styles.rejectButtonText}>❌ Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <SuspensionModal
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
        onConfirm={handleConfirmAction}
        userName={report.reportedUserName}
        preSelectedReason={report.reason}
        preSelectedLevel={report.level}
      />

      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Evidence</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCloseDetail}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.mediaSection}>
                <View style={styles.mediaContainer}>
                  {renderMediaContent()}
                  
                  {allMediaItems.length > 0 && (
                    <View style={styles.mediaCounter}>
                      <Text style={styles.mediaCounterText}>
                        {mediaIndex + 1} / {allMediaItems.length}
                      </Text>
                    </View>
                  )}
                </View>
                
                {allMediaItems.length > 1 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.thumbnailContainer}
                  >
                    {allMediaItems.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setMediaIndex(index)}
                        style={[
                          styles.thumbnail,
                          index === mediaIndex && styles.thumbnailActive
                        ]}
                      >
                        {typeof item === 'string' && item.includes('video') ? (
                          <View style={styles.videoThumbnailSmall}>
                            <Text style={styles.videoThumbnailIcon}>🎥</Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: item }}
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Report Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reporter:</Text>
                  <Text style={styles.detailValue}>{report.userName}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reported User:</Text>
                  <Text style={styles.detailValue}>{report.reportedUserName}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reason:</Text>
                  <Text style={styles.detailValue}>{report.reason}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Level:</Text>
                  <Text style={[styles.detailValue, { color: getLevelColor() }]}>
                    {report.level}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                    {report.status.toUpperCase()}
                  </Text>
                </View>

                {report.description && (
                  <View style={styles.detailDescription}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{report.description}</Text>
                  </View>
                )}

                {report.customReason && (
                  <View style={styles.detailDescription}>
                    <Text style={styles.detailLabel}>Custom Reason:</Text>
                    <Text style={styles.detailValue}>{report.customReason}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    backgroundColor: '#fffaf0',
  },
  reviewedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  resolvedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#00A86B',
    backgroundColor: '#f0fff4',
  },
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  reportInfo: {
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  value: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  reasonRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  reasonValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  descriptionRow: {
    marginBottom: 4,
  },
  descriptionValue: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
    lineHeight: 16,
  },
  customReasonRow: {
    marginBottom: 4,
  },
  customReasonValue: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 16,
  },
  evidenceSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  evidencePreview: {
    marginTop: 8,
  },
  evidenceThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  evidenceThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoThumbnailIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  videoThumbnailText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  viewDetailsButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#2196F3',
    borderRadius: 6,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  viewButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  resolveButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
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
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  modalTitle: {
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
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  mediaSection: {
    backgroundColor: '#fff',
  },
  mediaContainer: {
    position: 'relative',
  },
  mainImage: {
    width: SCREEN_WIDTH * 0.9,
    height: 300,
    backgroundColor: '#f8f8f8',
  },
  videoContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: 300,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: SCREEN_WIDTH * 0.9,
    height: 300,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
  mediaCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mediaCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnailContainer: {
    padding: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#00A86B',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailSmall: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSection: {
    padding: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  detailDescription: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});

export default AdminReportCard;