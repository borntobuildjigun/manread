import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../utils/theme';

interface BookCoverProps {
  coverUrl?: string;
  title: string;
  style?: any;
}

export const BookCover = ({ coverUrl, title, style }: BookCoverProps) => {
  if (coverUrl) {
    return <Image source={{ uri: coverUrl }} style={[styles.bookCoverImage, style]} />;
  }
  
  return (
    <View style={[styles.dynamicCover, style]}>
      <Text style={styles.dynamicCoverTitle} numberOfLines={3}>{title || 'Untitled'}</Text>
      <View style={styles.dynamicCoverDeco} />
    </View>
  );
};

const styles = StyleSheet.create({
  bookCoverImage: {
    resizeMode: 'cover',
  },
  dynamicCover: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 194, 182, 0.3)', // subtle tertiary border
  },
  dynamicCoverTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 12,
    color: theme.colors.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  dynamicCoverDeco: {
    width: 20,
    height: 2,
    backgroundColor: theme.colors.tertiary,
    marginBottom: 8,
  },
});
