import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../services/Auth/AuthContext';
import {
  addComment,
  deleteComment,
  getCommentsByProductId,
  updateComment
} from '../../services/Comment/commentService';
import { keyboardService } from '../../services/Keyboard/keyboardService';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
}

interface CommentSectionProps {
  productId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ productId }) => {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadComments();
    keyboardService.initKeyboardListeners();

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        textInputRef.current?.focus();
      }
    );

    return () => {
      keyboardService.cleanup();
      keyboardDidShowListener.remove();
    };
  }, [productId]);

  const loadComments = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const result = await getCommentsByProductId(productId);
      
      if (result.success) {
        setComments(result.comments);
      } else {
        Alert.alert('Error', result.error || 'Failed to load comments');
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please login to comment');
      return;
    }

    if (!newComment.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      
      const result = await addComment(
        productId,
        user,
        newComment.trim()
      );

      if (result.success) {
        setNewComment('');
        await loadComments();
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', result.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComments();
    setRefreshing(false);
  };

  const handleCommentFocus = () => {
  };

  const handleAvatarPress = (userId: string) => {
    router.push({
      pathname: '../../screens/Profile/PublicProfile',
      params: {
        userId: userId
      }
    });
  };

  const handleCommentLongPress = (comment: Comment) => {
    if (user && (comment.userId === user.uid || isAdmin)) {
      setSelectedComment(comment);
      setShowActionMenu(true);
    }
  };

  const handleDeleteComment = async () => {
    if (!selectedComment || !user) {
      setShowActionMenu(false);
      setSelectedComment(null);
      return;
    }

    const isOwner = selectedComment.userId === user.uid;
    const canDelete = isOwner || isAdmin;
    
    if (!canDelete) {
      Alert.alert('Error', 'You do not have permission to delete this comment');
      setShowActionMenu(false);
      setSelectedComment(null);
      return;
    }

    try {
      setShowActionMenu(false);
      const result = await deleteComment(selectedComment.id, user.uid);
      
      if (result.success) {
        await loadComments();
      } else {
        Alert.alert('Error', result.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment');
    } finally {
      setSelectedComment(null);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditText(comment.text);
    setShowEditModal(true);
    setShowActionMenu(false);
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !user || !editText.trim()) return;

    try {
      const result = await updateComment(editingComment.id, user.uid, editText.trim());
      
      if (result.success) {
        await loadComments();
        setShowEditModal(false);
        setEditingComment(null);
        setEditText('');
        Alert.alert('Success', 'Comment updated successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment');
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading && comments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Comments ({comments.length})
        </Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Text style={styles.refreshButton}>
            {refreshing ? '🔄' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.commentsWrapper}>
        {comments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No comments yet. Be the first to comment!
            </Text>
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.commentsList}
            contentContainerStyle={styles.commentsContent}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            bounces={true}
            alwaysBounceVertical={true}
            nestedScrollEnabled={true}
          >
            {comments.map((comment, index) => (
              <TouchableOpacity
                key={comment.id || `comment-${index}`}
                style={[
                  styles.commentItem,
                  user && comment.userId === user.uid && styles.ownComment
                ]}
                onLongPress={() => handleCommentLongPress(comment)}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={() => handleAvatarPress(comment.userId)}
                >
                  {comment.userAvatar ? (
                    <Image 
                      source={{ uri: comment.userAvatar }} 
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {comment.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.userName}>
                      {comment.userName || 'Unknown User'}
                      {user && comment.userId === user.uid && (
                        <Text style={styles.youBadge}> (you)</Text>
                      )}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatTime(comment.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>
                    {comment.text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </View>

      <Animated.View 
        style={[
          styles.inputContainer,
          {
            transform: [{ translateY: keyboardService.getTranslateY() }]
          }
        ]}
      >
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          placeholder="Write a comment..."
          value={newComment}
          onChangeText={setNewComment}
          onFocus={handleCommentFocus}
          multiline
          maxLength={500}
          editable={!submitting}
          placeholderTextColor="#999"
          blurOnSubmit={false}
          returnKeyType="default"
        />
        
        <View style={styles.inputFooter}>
          <Text style={styles.charCount}>
            {newComment.length}/500
          </Text>
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!newComment.trim() || submitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Modal
        visible={showActionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEditComment(selectedComment!)}
            >
              <Text style={styles.editButtonText}>✏️ Edit Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleDeleteComment}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowActionMenu(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.editModalTitle}>Edit Comment</Text>
            
            <TextInput
              style={styles.editTextInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              maxLength={500}
              placeholder="Edit your comment..."
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
            
            <Text style={styles.editCharCount}>
              {editText.length}/500
            </Text>
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity 
                style={[styles.editModalButton, styles.cancelEditButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingComment(null);
                  setEditText('');
                }}
              >
                <Text style={styles.cancelEditButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.editModalButton, 
                  styles.updateButton,
                  !editText.trim() && styles.updateButtonDisabled
                ]}
                onPress={handleUpdateComment}
                disabled={!editText.trim()}
              >
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    height: 500,
    minHeight: 400,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 10,
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  refreshButton: {
    fontSize: 18,
    color: '#00A86B',
  },
  commentsWrapper: {
    flex: 1,
    minHeight: 200,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ownComment: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A86B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  youBadge: {
    fontSize: 12,
    color: '#00A86B',
    fontWeight: 'normal',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 16,
    backgroundColor: '#fff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 50,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
    color: '#000',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  editButtonText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  cancelButton: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
    color: '#000',
  },
  editCharCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelEditButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  cancelEditButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#00A86B',
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default CommentSection;