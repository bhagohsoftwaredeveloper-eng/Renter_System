import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, TouchableWithoutFeedback, Animated } from 'react-native';
import { colors } from '../theme/colors';

const BREAKPOINT = 1024;

export const ResponsiveLayout = ({
  sidebar,
  header,
  children,
  isSidebarOpen,
  onCloseSidebar,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT;

  const slideAnim = useRef(new Animated.Value(-256)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const desktopWidthAnim = useRef(new Animated.Value(isDesktop ? (isSidebarOpen ? 256 : 72) : 256)).current;
  const [shouldRenderMobile, setShouldRenderMobile] = useState(!isDesktop && isSidebarOpen);

  useEffect(() => {
    if (isDesktop) {
      Animated.timing(desktopWidthAnim, {
        toValue: isSidebarOpen ? 256 : 72,
        duration: 250,
        useNativeDriver: false, // Cannot use native driver for width/layout properties
      }).start();
    } else {
      if (isSidebarOpen) {
        setShouldRenderMobile(true);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 0,
            speed: 12,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: -256,
            useNativeDriver: false,
            bounciness: 0,
            speed: 12,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start(() => setShouldRenderMobile(false));
      }
    }
  }, [isSidebarOpen, isDesktop, slideAnim, fadeAnim, desktopWidthAnim]);

  return (
    <View style={styles.container}>
      {header}
      <View style={styles.contentWrapper}>
        {isDesktop ? (
          <Animated.View style={[styles.sidebarWrapper, { width: desktopWidthAnim }]}>
            {sidebar}
          </Animated.View>
        ) : (
          shouldRenderMobile && (
            <>
              <TouchableWithoutFeedback onPress={onCloseSidebar}>
                <Animated.View style={[styles.mobileBackdrop, { opacity: fadeAnim }]} />
              </TouchableWithoutFeedback>
              <Animated.View 
                style={[
                  styles.sidebarWrapper, 
                  styles.sidebarMobile, 
                  { transform: [{ translateX: slideAnim }] }
                ]}
              >
                {sidebar}
              </Animated.View>
            </>
          )
        )}
        <View style={styles.mainContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarWrapper: {
    width: 256,
    height: '100%',
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: colors.slate100,
    backgroundColor: 'white',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  sidebarMobile: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mobileBackdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 90,
  },
});
