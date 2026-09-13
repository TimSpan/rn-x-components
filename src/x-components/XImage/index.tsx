import React, {useState} from 'react';
import {ActivityIndicator, Image, ImageStyle, StyleSheet, TouchableOpacity, View, ViewStyle} from 'react-native';
import {ImageResizeMode} from 'react-native';
import AntDesign from '@react-native-vector-icons/ant-design';

export interface ImageWithLoaderProps {
  uri: string;
  style?: ImageStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  resizeMode?: ImageResizeMode | undefined;
  onDelete?: () => void;
}

export const XImage: React.FC<ImageWithLoaderProps> = ({resizeMode, uri, style, onPress, onLongPress, delayLongPress, onDelete}) => {
  const [loading, setLoading] = useState(true);

  return (
    <View>
      <TouchableOpacity delayLongPress={delayLongPress} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
        {loading && (
          <View style={[style as ViewStyle, styles.loadingContainer]}>
            <ActivityIndicator size='small' color='#2080F0' />
          </View>
        )}
        <Image
          resizeMode={resizeMode}
          source={{uri}}
          style={[style, loading && {opacity: 0}]}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </TouchableOpacity>
      {onDelete && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7} hitSlop={{top: 4, right: 4, bottom: 4, left: 4}}>
          <AntDesign name={'close'} size={14} color={'#fff'} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  deleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4d4f',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
