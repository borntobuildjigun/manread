import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Sparkles, Send, KeyRound } from 'lucide-react-native';
import { theme } from '../../utils/theme';
import { useAiStore } from '../../store/useAiStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { generateBookQuestion } from '../../utils/openai';
import { BookCover } from '../../components/BookCover';
import { useState } from 'react';

export default function AiScreen() {
  const { apiKey, setApiKey, interactions, saveQuestion, saveAnswer } = useAiStore();
  const { books } = useLibraryStore();
  
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [generatedContext, setGeneratedContext] = useState<string>('');
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const readingBooks = books.filter(b => b.status === 'reading');

  // Check if there is an active interaction (unanswered question) for any reading book
  const activeInteraction = interactions.find(i => !i.answer && readingBooks.some(b => b.id === i.bookId));

  // If there's an active interaction, automatically select that book.
  // Otherwise, select based on user choice.
  const currentBook = activeInteraction 
    ? readingBooks.find(b => b.id === activeInteraction.bookId)
    : readingBooks.find(b => b.id === selectedBookId);

  const handleSetApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
    }
  };

  const handleGenerateQuestion = async () => {
    if (!currentBook || !apiKey) return;
    
    setIsGenerating(true);
    try {
      const pastAnswers = interactions
        .filter(i => i.bookId === currentBook.id && i.answer)
        .map(i => i.answer as string)
        .slice(0, 3); // last 3 answers

      const result = await generateBookQuestion(
        apiKey,
        {
          title: currentBook.title,
          author: currentBook.author,
          currentPage: currentBook.currentPage,
          totalPages: currentBook.totalPages,
        },
        pastAnswers
      );

      setGeneratedContext(result.context);
      setGeneratedQuestions(result.questions);
      setSelectedQuestion(null);
    } catch (error) {
      console.error(error);
      alert('질문 생성 중 오류가 발생했습니다. API 키가 정확한지 확인해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendAnswer = () => {
    if (!currentBook || !answerInput.trim()) return;
    
    let interactionId = activeInteraction?.id;
    
    // If we are answering a newly generated question that hasn't been saved yet
    if (!interactionId && selectedQuestion) {
      interactionId = saveQuestion(currentBook.id, currentBook.title, selectedQuestion);
    }
    
    if (interactionId) {
      saveAnswer(interactionId, answerInput.trim());
      setAnswerInput('');
      setGeneratedQuestions([]);
      setSelectedQuestion(null);
      setSelectedBookId(null);
    }
  };

  const answeredInteractions = interactions.filter(i => i.answer).reverse(); // Latest first

  if (!apiKey) {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: 20 }]}>
        <View style={styles.questionCard}>
          <View style={styles.aiHeader}>
            <KeyRound color={theme.colors.tertiary} size={20} />
            <Text style={styles.aiTitle}>OpenAI API Key 필요</Text>
          </View>
          <Text style={styles.bookContext}>AI와 대화하려면 OpenAI API 키가 필요합니다. 이 키는 앱 내부에만 안전하게 저장됩니다.</Text>
          <TextInput 
            style={[styles.input, { marginBottom: 16 }]} 
            placeholder="sk-..."
            placeholderTextColor={theme.colors.outline}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            secureTextEntry
          />
          <TouchableOpacity style={styles.actionBtn} onPress={handleSetApiKey}>
            <Text style={styles.actionBtnText}>저장하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Reflect</Text>
            <Text style={styles.headerSubtitle}>AI와 함께 독서의 깊이를 더해보세요.</Text>
          </View>
        </View>

        {readingBooks.length === 0 ? (
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>현재 읽고 있는 책이 없습니다. 서재에서 책을 먼저 추가해주세요.</Text>
          </View>
        ) : activeInteraction && currentBook ? (
          <View style={styles.questionCard}>
            <View style={styles.aiHeader}>
              <Sparkles color={theme.colors.tertiary} size={20} />
              <Text style={styles.aiTitle}>답변 대기 중인 질문</Text>
            </View>
            <Text style={styles.bookContext}>『{currentBook.title}』에 관한 질문입니다.</Text>
            <Text style={styles.questionText}>{activeInteraction.question}</Text>
            
            {/* Inline Input Section */}
            <View style={[styles.inputContainer, { marginTop: 24 }]}>
              <TextInput 
                style={styles.input} 
                placeholder="나의 생각을 자유롭게 적어보세요..."
                placeholderTextColor={theme.colors.outline}
                multiline
                value={answerInput}
                onChangeText={setAnswerInput}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendAnswer}>
                <Send color={theme.colors.onPrimary} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        ) : generatedQuestions.length > 0 && !selectedQuestion ? (
          <View>
            <Text style={[styles.bookContext, { marginBottom: 16, paddingHorizontal: 4, fontSize: 15 }]}>{generatedContext}</Text>
            <View style={{ gap: 16, marginBottom: 16 }}>
              {generatedQuestions.map((q, idx) => (
                <View key={idx} style={styles.questionCard}>
                  <View style={styles.aiHeader}>
                    <Sparkles color={theme.colors.tertiary} size={20} />
                    <Text style={styles.aiTitle}>AI의 시선 {idx + 1}</Text>
                  </View>
                  <Text style={styles.questionText}>{q}</Text>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { marginTop: 16 }]} 
                    onPress={() => setSelectedQuestion(q)}
                  >
                    <Text style={styles.actionBtnText}>이 질문에 답하기</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceContainerHighest, marginBottom: 16 }]} 
              onPress={() => {
                setGeneratedQuestions([]);
                setGeneratedContext('');
              }}
            >
              <Text style={[styles.actionBtnText, { color: theme.colors.onSurfaceVariant }]}>질문 취소</Text>
            </TouchableOpacity>
          </View>
        ) : selectedQuestion && currentBook ? (
          <View style={styles.questionCard}>
            <View style={styles.aiHeader}>
              <Sparkles color={theme.colors.tertiary} size={20} />
              <Text style={styles.aiTitle}>답변 작성 중</Text>
            </View>
            <Text style={styles.bookContext}>『{currentBook.title}』에 관한 질문입니다.</Text>
            <Text style={styles.questionText}>{selectedQuestion}</Text>
            
            {/* Inline Input Section */}
            <View style={[styles.inputContainer, { marginTop: 24 }]}>
              <TextInput 
                style={styles.input} 
                placeholder="나의 생각을 자유롭게 적어보세요..."
                placeholderTextColor={theme.colors.outline}
                multiline
                value={answerInput}
                onChangeText={setAnswerInput}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendAnswer}>
                <Send color={theme.colors.onPrimary} size={20} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={{ marginTop: 16, alignSelf: 'flex-end' }} 
              onPress={() => setSelectedQuestion(null)}
            >
              <Text style={{ color: theme.colors.tertiary, fontFamily: theme.fonts.label }}>← 다른 질문 고르기</Text>
            </TouchableOpacity>
          </View>
        ) : !selectedBookId ? (
          <View>
            <Text style={[styles.bookContext, { marginBottom: 16, paddingHorizontal: 4, fontSize: 15 }]}>
              어떤 책에 대해 사유해 볼까요?
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 16 }}>
              {readingBooks.map(book => (
                <TouchableOpacity 
                  key={book.id} 
                  onPress={() => setSelectedBookId(book.id)}
                  style={{ width: 100 }}
                >
                  <BookCover 
                    coverUrl={book.coverUrl} 
                    title={book.title} 
                    style={{ width: 100, height: 150, borderRadius: 8 }} 
                  />
                  <Text style={[styles.bookContext, { marginTop: 8, textAlign: 'center' }]} numberOfLines={2}>
                    {book.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : currentBook && (
          <View style={styles.questionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <BookCover coverUrl={currentBook.coverUrl} title={currentBook.title} style={{ width: 60, height: 90, borderRadius: 4, marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bookContext, { marginBottom: 4 }]}>『{currentBook.title}』</Text>
                <Text style={[styles.questionText, { fontSize: 15, lineHeight: 22 }]}>이 책에 대해 깊이 있게 생각해볼 질문을 받아볼까요?</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 1, backgroundColor: theme.colors.surfaceContainerHighest }]} 
                onPress={() => setSelectedBookId(null)}
              >
                <Text style={[styles.actionBtnText, { color: theme.colors.onSurfaceVariant }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 2 }]} 
                onPress={handleGenerateQuestion}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Text style={styles.actionBtnText}>✨ 질문 생성하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Inline History Area */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>나의 생각 기록장</Text>
          <Text style={styles.historySectionSubtitle}>과거의 사유들을 되돌아보세요.</Text>
          
          {answeredInteractions.length === 0 ? (
            <Text style={styles.emptyText}>아직 기록된 답변이 없습니다. 사유를 시작해보세요!</Text>
          ) : (
            answeredInteractions.map((item) => (
              <View key={item.id} style={styles.historyListItem}>
                <Text style={styles.historyListBook}>『{item.bookTitle}』</Text>
                <Text style={styles.historyListQ}>Q. {item.question}</Text>
                <View style={styles.historyListABox}>
                  <Text style={styles.historyListA}>{item.answer}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 28,
    color: theme.colors.onSurface,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
  questionCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 65, 0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: {
    color: theme.colors.tertiary,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  bookContext: {
    color: theme.colors.secondary,
    fontFamily: theme.fonts.caption,
    fontSize: 13,
    marginBottom: 12,
  },
  questionText: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.body,
    fontSize: 18,
    lineHeight: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 65, 0.2)',
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.label,
    fontSize: 15,
  },
  historySection: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceContainerHighest,
  },
  historySectionTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 24,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  historySectionSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
  },
  emptyText: {
    fontFamily: theme.fonts.caption,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
  },
  historyListItem: {
    marginBottom: 24,
  },
  historyListBook: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 6,
  },
  historyListQ: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 24,
  },
  historyListABox: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.tertiary,
  },
  historyListA: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 26,
  },
});
