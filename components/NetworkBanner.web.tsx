// components/NetworkBanner.web.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Icons
import CloseIcon from '@/assets/icons/close.svg';
import DisconnectedIcon from '@/assets/icons/disconnected.svg';
import ErrorIcon from '@/assets/icons/error.svg';

export interface NetworkBannerProps {
  forceVisible?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
}

type BannerStatus = 'hidden' | 'offline' | 'unstable' | 'error';

const NetworkBanner: React.FC<NetworkBannerProps> = ({
  forceVisible = false,
  onRetry,
  onDismiss,
}) => {
  const [netInfo, setNetInfo] = useState<NetInfoState | null>(null);
  // Tracks which "reason" the user has dismissed so we can auto-reset
  // when the reason changes (e.g. offline → unstable, or new API error).
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetInfo(state);
    });
    NetInfo.fetch().then(setNetInfo);
    return () => unsubscribe();
  }, []);

  const isOffline = netInfo?.isConnected === false;
  const isUnstable =
    netInfo?.isConnected === true &&
    (netInfo?.isInternetReachable === false ||
      netInfo?.isInternetReachable === null);

  const rawStatus: BannerStatus = isOffline
    ? 'offline'
    : isUnstable
    ? 'unstable'
    : forceVisible
    ? 'error'
    : 'hidden';

  const reasonKey = rawStatus === 'hidden' ? null : rawStatus;

  // If the reason changes, clear any previous manual dismissal
  useEffect(() => {
    if (reasonKey === null) {
      if (dismissedKey !== null) setDismissedKey(null);
    } else if (dismissedKey !== null && dismissedKey !== reasonKey) {
      setDismissedKey(null);
    }
  }, [reasonKey, dismissedKey]);

  const manuallyDismissed = dismissedKey !== null && dismissedKey === reasonKey;
  const visible = rawStatus !== 'hidden' && !manuallyDismissed;

  const status: BannerStatus = visible ? rawStatus : 'hidden';

  const message =
    status === 'offline'
      ? "You're offline. Please check your internet connection."
      : status === 'unstable'
      ? 'Connection unstable. Some features may not work.'
      : status === 'error'
      ? 'Network error. Please check your connection.'
      : '';

  const bgColor =
    status === 'offline' || status === 'error' ? '#EF4444' : '#F59E0B';

  // Animated.Value refs (RN Animated)
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: visible ? 0 : -150,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
        mass: 0.8,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, opacity]);

  // Pick icon based on status
  // - offline  → DisconnectedIcon (no signal)
  // - unstable → ErrorIcon (warning)
  // - error    → ErrorIcon (API failure)
  const renderIcon = () => {
    if (status === 'offline') {
      return (
        <DisconnectedIcon
          width={22}
          height={22}
          fill="#FFFFFF"
          style={styles.icon}
        />
      );
    }
    return (
      <ErrorIcon width={22} height={22} fill="#FFFFFF" style={styles.icon} />
    );
  };

  const handleDismiss = () => {
    if (reasonKey !== null) setDismissedKey(reasonKey);
    // Notify the parent so it can clear its own `forceVisible` state
    onDismiss?.();
  };

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        {renderIcon()}
        <Text style={styles.message} ellipsizeMode="tail" numberOfLines={2}>
          {message}
        </Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          {onRetry && (
            <TouchableOpacity onPress={onRetry} style={styles.actionButton}>
              <Text style={styles.actionText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
            accessibilityLabel="Dismiss network banner"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CloseIcon width={14} height={14} fill="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NetworkBanner;