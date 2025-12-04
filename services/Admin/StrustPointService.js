import { doc, getDoc, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export const TRUST_POINT_CONFIG = {
  MAX_POINTS: 100,
  CANNOT_SELL: 60,  
  CANNOT_BUY: 40,   
  MONTHLY_RECOVERY: 10, 
};

export const DEDUCTION_POINTS = {
  WARNING: 5,
  LOW: 10,
  MEDIUM: 20,
  HIGH: 30,
  SEVERE: 50
};


export async function canUserBuy(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return { canBuy: false, error: "User not found" };
    
    const userData = userDoc.data();
    const points = userData.strustPoint || 100;
    const isBanned = userData.isBanned || false;
    
    const canBuy = points > TRUST_POINT_CONFIG.CANNOT_BUY && !isBanned;
    
    return {
      canBuy,
      points,
      isBanned,
      message: canBuy ? "Can buy products" : `Cannot buy (need >${TRUST_POINT_CONFIG.CANNOT_BUY} points)`
    };
  } catch (error) {
    console.error("Check buy error:", error);
    return { canBuy: false, error: error.message };
  }
}

export async function canUserSell(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return { canSell: false, error: "User not found" };
    
    const userData = userDoc.data();
    const points = userData.strustPoint || 100;
    const isBanned = userData.isBanned || false;
    
    const canSell = points > TRUST_POINT_CONFIG.CANNOT_SELL && !isBanned;
    
    return {
      canSell,
      points,
      isBanned,
      message: canSell ? "Can sell products" : `Cannot sell (need >${TRUST_POINT_CONFIG.CANNOT_SELL} points)`
    };
  } catch (error) {
    console.error("Check sell error:", error);
    return { canSell: false, error: error.message };
  }
}

export async function deductPoints(userId, level = 'LOW', reason = "Violation") {
  try {
    const pointsToDeduct = DEDUCTION_POINTS[level] || 10;
    
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User not found");
      
      const userData = userDoc.data();
      const currentPoints = userData.strustPoint || 100;
      const newPoints = Math.max(0, currentPoints - pointsToDeduct);
      
      transaction.update(userRef, {
        strustPoint: newPoints,
        updatedAt: new Date()
      });
      
      return {
        success: true,
        deducted: pointsToDeduct,
        oldPoints: currentPoints,
        newPoints,
        reason
      };
    });
    
    return result;
  } catch (error) {
    console.error("Deduct points error:", error);
    return { success: false, error: error.message };
  }
}


export async function checkMonthlyRecovery(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return { success: false, error: "User not found" };
    
    const userData = userDoc.data();
    const currentPoints = userData.strustPoint || 100;
    const lastRecovery = userData.lastRecoveryDate || null;
    const now = new Date();
    
    if (currentPoints >= TRUST_POINT_CONFIG.MAX_POINTS) {
      return { success: true, recovered: false, reason: "Already at max points" };
    }
    
    if (lastRecovery) {
      const lastDate = new Date(lastRecovery);
      const sameMonth = lastDate.getMonth() === now.getMonth() && 
                       lastDate.getFullYear() === now.getFullYear();
      if (sameMonth) {
        return { success: true, recovered: false, reason: "Already recovered this month" };
      }
    }
    
    const pointsToAdd = TRUST_POINT_CONFIG.MONTHLY_RECOVERY;
    const newPoints = Math.min(TRUST_POINT_CONFIG.MAX_POINTS, currentPoints + pointsToAdd);
    
    await updateDoc(userRef, {
      strustPoint: newPoints,
      lastRecoveryDate: now.toISOString(),
      updatedAt: now
    });
    
    return {
      success: true,
      recovered: true,
      pointsAdded: pointsToAdd,
      oldPoints: currentPoints,
      newPoints
    };
    
  } catch (error) {
    console.error("Recovery error:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserTrustInfo(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return { error: "User not found" };
    
    const userData = userDoc.data();
    const points = userData.strustPoint || 100;
    const isBanned = userData.isBanned || false;
    
    return {
      points,
      isBanned,
      canBuy: points > TRUST_POINT_CONFIG.CANNOT_BUY && !isBanned,
      canSell: points > TRUST_POINT_CONFIG.CANNOT_SELL && !isBanned,
      lastRecovery: userData.lastRecoveryDate || null,
      level: getPointLevel(points)
    };
  } catch (error) {
    console.error("Get trust info error:", error);
    return { error: error.message };
  }
}
