import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Heart, MessageSquare, Bookmark } from 'lucide-react-native';
import { theme } from '../../utils/theme';
import { useSocialStore, FeedPost } from '../../store/useSocialStore';
import { BookCover } from '../../components/BookCover';

export default function FeedScreen() {
  const { posts, toggleLike } = useSocialStore();

  const renderCard = ({ item }: { item: FeedPost }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.user.username}</Text>
          <Text style={styles.timeText}>{item.createdAt}</Text>
        </View>
      </View>

      <View style={styles.bookInfoRow}>
        <BookCover coverUrl={item.book.coverUrl} title={item.book.title} style={styles.smallBookCover} />
        <View style={styles.bookMeta}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.book.title}</Text>
          <Text style={styles.bookAuthor}>{item.book.author}</Text>
        </View>
      </View>
      
      <View style={styles.questionBox}>
        <Text style={styles.questionText}>Q. {item.reflection.question}</Text>
      </View>
      
      <Text style={styles.answerText}>{item.reflection.answer}</Text>
      
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
          <Heart 
            color={item.isLikedByMe ? theme.colors.error : theme.colors.onSurfaceVariant} 
            fill={item.isLikedByMe ? theme.colors.error : 'transparent'}
            size={20} 
          />
          <Text style={[styles.actionText, item.isLikedByMe && { color: theme.colors.error }]}>
            {item.likes}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <MessageSquare color={theme.colors.onSurfaceVariant} size={20} />
          <Text style={styles.actionText}>0</Text>
        </TouchableOpacity>

        <View style={{flex: 1}} />

        <TouchableOpacity style={styles.actionBtn}>
          <Bookmark color={theme.colors.onSurfaceVariant} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agora</Text>
        <Text style={styles.headerSubtitle}>다른 학자들의 사유를 엿보세요.</Text>
      </View>
      
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 32,
    color: theme.colors.onSurface,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    gap: 24,
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 65, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceContainerHighest,
    marginRight: 12,
  },
  userName: {
    fontFamily: theme.fonts.headline,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  timeText: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.outline,
  },
  bookInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainer,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  smallBookCover: {
    width: 40,
    height: 60,
    borderRadius: 4,
  },
  bookMeta: {
    flex: 1,
  },
  bookTitle: {
    fontFamily: theme.fonts.label,
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  bookAuthor: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  questionBox: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.tertiary,
  },
  questionText: {
    color: theme.colors.tertiary,
    fontFamily: theme.fonts.headline,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 24,
  },
  answerText: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 28,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceContainerHighest,
    paddingTop: 16,
    gap: 20,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: theme.colors.onSurfaceVariant,
    fontFamily: theme.fonts.label,
    fontSize: 14,
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
});
