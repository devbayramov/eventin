import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createPortal } from 'react-native-portalize';

/**
 * Portal bileşeni, içeriği uygulama hiyerarşisinin en üst seviyesinde render eder.
 * Bu, içeriğin z-index sıralamasında en üstte olmasını sağlar.
 */
const Portal = ({ children, visible = true }) => {
  const [portalNode, setPortalNode] = useState(null);

  useEffect(() => {
    if (visible) {
      const node = createPortal(
        <View style={[StyleSheet.absoluteFill, styles.container]}>
          {children}
        </View>
      );
      setPortalNode(node);

      return () => {
        node.destroy();
      };
    }
  }, [children, visible]);

  return null;
};

const styles = StyleSheet.create({
  container: {
    elevation: 9999,
    zIndex: 9999,
  },
});

export default Portal; 