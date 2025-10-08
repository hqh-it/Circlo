import { Animated, Keyboard, Platform } from 'react-native';

class KeyboardService {
  constructor() {
    this.translateY = new Animated.Value(0);
  }

  initKeyboardListeners() {
    // Listener khi keyboard hiện
    this.keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        this.animateInputUp(e);
      }
    );

    // Listener khi keyboard ẩn
    this.keyboardHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        this.animateInputDown();
      }
    );
  }

  animateInputUp(e) {
    Animated.timing(this.translateY, {
      toValue: Platform.OS === 'ios' ? -e.endCoordinates.height + 90 : -e.endCoordinates.height + 50,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  animateInputDown() {
    Animated.timing(this.translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  getTranslateY() {
    return this.translateY;
  }

  dismissKeyboard() {
    Keyboard.dismiss();
  }

  cleanup() {
    this.keyboardShowListener?.remove();
    this.keyboardHideListener?.remove();
  }
}

export const keyboardService = new KeyboardService();