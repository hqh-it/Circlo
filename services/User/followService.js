import { arrayRemove, arrayUnion, doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

// Follow a user
export const followUser = async (currentUserId, targetUserId) => {
  try {
    if (currentUserId === targetUserId) {
      return { success: false, error: "You cannot follow yourself" };
    }

    const currentUserRef = doc(db, "users", currentUserId);
    const targetUserRef = doc(db, "users", targetUserId);

    // Update current user's following
    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId),
      followingCount: increment(1)
    });

    // Update target user's followers
    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId),
      followerCount: increment(1)
    });

    return { success: true, message: "Followed successfully" };
  } catch (error) {
    console.error("Error following user:", error);
    return { success: false, error: "Failed to follow user" };
  }
};

// Unfollow a user
export const unfollowUser = async (currentUserId, targetUserId) => {
  try {
    const currentUserRef = doc(db, "users", currentUserId);
    const targetUserRef = doc(db, "users", targetUserId);

    // Update current user's following
    await updateDoc(currentUserRef, {
      following: arrayRemove(targetUserId),
      followingCount: increment(-1)
    });

    // Update target user's followers
    await updateDoc(targetUserRef, {
      followers: arrayRemove(currentUserId),
      followerCount: increment(-1)
    });

    return { success: true, message: "Unfollowed successfully" };
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return { success: false, error: "Failed to unfollow user" };
  }
};

// Check if current user is following target user
export const checkFollowStatus = async (currentUserId, targetUserId) => {
  try {
    const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
    
    if (currentUserDoc.exists()) {
      const userData = currentUserDoc.data();
      const isFollowing = userData.following?.includes(targetUserId) || false;
      return { success: true, isFollowing };
    }
    
    return { success: false, isFollowing: false };
  } catch (error) {
    console.error("Error checking follow status:", error);
    return { success: false, isFollowing: false };
  }
};

// Get user's follow counts
export const getFollowCounts = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        success: true,
        followerCount: userData.followerCount || 0,
        followingCount: userData.followingCount || 0
      };
    }
    
    return { success: false, followerCount: 0, followingCount: 0 };
  } catch (error) {
    console.error("Error getting follow counts:", error);
    return { success: false, followerCount: 0, followingCount: 0 };
  }
};

  export const getFollowedUsers = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const followingIds = userData.following || [];
        
        // Get details for each followed user
        const userPromises = followingIds.map(async (followedUserId) => {
          const followedUserDoc = await getDoc(doc(db, "users", followedUserId));
          if (followedUserDoc.exists()) {
            const followedUserData = followedUserDoc.data();
            return {
              id: followedUserId,
              fullName: followedUserData.fullName || 'Unknown User',
              avatarURL: followedUserData.avatarURL,
            };
          }
          return null;
        });
        
        const users = (await Promise.all(userPromises)).filter(user => user !== null);
        return { success: true, users };
      }
      
      return { success: false, error: "User not found", users: [] };
    } catch (error) {
      console.error("Error getting followed users:", error);
      return { success: false, error: "Failed to load followed users", users: [] };
    }
  };