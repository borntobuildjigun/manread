import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { BookOpen, Clock, ArrowRight, Plus, X, Trash2, CheckCircle2, Play, RefreshCw, PenLine, FileText, Square, Timer, Camera } from 'lucide-react-native';
import { theme } from '../../utils/theme';
import { useState, useEffect } from 'react';
import { useLibraryStore, BookStatus, Book } from '../../store/useLibraryStore';
import { BookCover } from '../../components/BookCover';

export default function LibraryScreen() {
  const { books, dailyLogs, addBook, updateProgress, updateStatus, deleteBook, addMemo, updateMemo, deleteMemo, logReadingTime } = useLibraryStore();
  
  // Calendar Dates
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const getDayInitial = (d: Date) => ['S','M','T','W','T','F','S'][d.getDay()];
  const getDateNumber = (d: Date) => d.getDate().toString();
  const getDateStr = (d: Date) => d.toISOString().split('T')[0];

  const selectedLog = dailyLogs[selectedDateStr] || { pagesRead: 0, readingSeconds: 0 };
  const formattedHours = (selectedLog.readingSeconds / 3600).toFixed(1);
  
  // Add Book Modal State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addModalTarget, setAddModalTarget] = useState<BookStatus>('reading');
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTotalPages, setNewTotalPages] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');

  // Action Modal State
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [updatePageInput, setUpdatePageInput] = useState('');

  // Memo Modal State
  const [isMemoModalVisible, setIsMemoModalVisible] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoPageInput, setMemoPageInput] = useState('');
  const [memoContentInput, setMemoContentInput] = useState('');

  // Timer State
  const [activeTimerBookId, setActiveTimerBookId] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimerBookId) {
      interval = setInterval(() => setSessionSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerBookId]);

  const handleStartTimer = () => {
    if (!selectedBook) return;
    if (activeTimerBookId !== selectedBook.id) {
      // If a different timer was running, we stop and log it first
      if (activeTimerBookId && sessionSeconds > 0) {
        logReadingTime(activeTimerBookId, sessionSeconds);
      }
      setActiveTimerBookId(selectedBook.id);
      setSessionSeconds(0);
    }
  };

  const handleStopTimer = () => {
    if (sessionSeconds > 0 && activeTimerBookId) {
      logReadingTime(activeTimerBookId, sessionSeconds);
      setSessionSeconds(0);
      Alert.alert('기록 완료', '오늘의 독서 시간이 기록되었습니다.');
    }
    setActiveTimerBookId(null);
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleWebSearchCover = async (title: string) => {
    if (!title) {
      Alert.alert('알림', '책 제목을 먼저 입력해주세요.');
      return;
    }
    try {
      let res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}`);
      let data = await res.json();
      let items = data.items || [];

      if (items.length === 0) {
        res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}`);
        data = await res.json();
        items = data.items || [];
      }

      const bookWithCover = items.find((item: any) => item.volumeInfo?.imageLinks?.thumbnail);
      
      if (bookWithCover) {
        const url = bookWithCover.volumeInfo.imageLinks.thumbnail;
        setNewCoverUrl(url.replace('http:', 'https:'));
        return;
      }
      
      Alert.alert('알림', '표지를 찾지 못했습니다.');
    } catch (e) {
      console.log(e);
      Alert.alert('오류', '검색 중 오류가 발생했습니다.');
    }
  };

  const handleCoverSelect = () => {
    Alert.alert(
      "표지 추가",
      "어떤 방식으로 추가할까요?",
      [
        {
          text: "웹에서 자동 검색",
          onPress: () => handleWebSearchCover(newTitle)
        },
        {
          text: "사진 촬영 / 앨범",
          onPress: () => Alert.alert('알림', '아직 지원되지 않습니다. npx expo install expo-image-picker 설치가 필요합니다.')
        },
        { text: "취소", style: "cancel" }
      ]
    );
  };

  const readingBooks = books.filter(b => b.status === 'reading');
  const queueBooks = books.filter(b => b.status === 'queue');
  const finishedBooks = books.filter(b => b.status === 'finished');

  const handleAddBook = () => {
    if (!newTitle.trim() || !newAuthor.trim() || !newTotalPages.trim()) return;
    
    addBook({
      title: newTitle,
      author: newAuthor,
      totalPages: parseInt(newTotalPages, 10),
      status: addModalTarget,
      coverUrl: newCoverUrl || undefined
    });

    setNewTitle('');
    setNewAuthor('');
    setNewTotalPages('');
    setNewCoverUrl('');
    setIsAddModalVisible(false);
  };

  const openAddModal = (target: BookStatus) => {
    setAddModalTarget(target);
    setIsAddModalVisible(true);
  };

  const openActionModal = (book: Book) => {
    setSelectedBook(book);
    // 0페이지일 경우 빈 문자열로 초기화하여 바로 입력할 수 있도록 수정
    setUpdatePageInput(book.currentPage === 0 ? '' : book.currentPage.toString());
  };

  const handleUpdateProgress = () => {
    if (!selectedBook || !updatePageInput.trim()) return;
    const newPage = parseInt(updatePageInput, 10);
    if (newPage >= 0 && newPage <= selectedBook.totalPages) {
      updateProgress(selectedBook.id, newPage);
      setSelectedBook(null);
    } else {
      Alert.alert('오류', '올바른 페이지 수를 입력해주세요.');
    }
  };

  const handleStatusChange = (status: BookStatus) => {
    if (!selectedBook) return;
    updateStatus(selectedBook.id, status);
    setSelectedBook(null);
  };

  const handleDelete = () => {
    if (!selectedBook) return;
    Alert.alert('책 삭제', `'${selectedBook.title}'을(를) 서재에서 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => {
        deleteBook(selectedBook.id);
        setSelectedBook(null);
      }}
    ]);
  };

  const openMemoModal = (memoId?: string) => {
    // Keep selectedBook but close action modal visually if we want, 
    // actually having both might stack them or we can just render MemoModal on top.
    if (memoId && selectedBook?.memos) {
      const existing = selectedBook.memos.find(m => m.id === memoId);
      if (existing) {
        setEditingMemoId(memoId);
        setMemoPageInput(existing.page || '');
        setMemoContentInput(existing.content);
      }
    } else {
      setEditingMemoId(null);
      setMemoPageInput('');
      setMemoContentInput('');
    }
    setIsMemoModalVisible(true);
  };

  const handleSaveMemo = () => {
    if (!selectedBook || !memoContentInput.trim()) return;
    if (editingMemoId) {
      updateMemo(selectedBook.id, editingMemoId, memoContentInput.trim(), memoPageInput.trim());
    } else {
      addMemo(selectedBook.id, {
        content: memoContentInput.trim(),
        page: memoPageInput.trim()
      });
    }
    setIsMemoModalVisible(false);
  };

  const handleDeleteMemo = (memoId: string) => {
    if (!selectedBook) return;
    Alert.alert('메모 삭제', '이 메모를 정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteMemo(selectedBook.id, memoId) }
    ]);
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Calendar & Stats Grid */}
      <View style={styles.gridSection}>
        {/* Calendar Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Tracker</Text>
            <Text style={styles.streakText}>LAST 7 DAYS</Text>
          </View>
          <View style={styles.calendarGrid}>
            {last7Days.map((d, i) => {
              const dStr = getDateStr(d);
              const isActive = dailyLogs[dStr] && (dailyLogs[dStr].pagesRead > 0 || dailyLogs[dStr].readingSeconds > 0);
              const isSelected = selectedDateStr === dStr;
              
              return (
                <TouchableOpacity 
                  key={i} 
                  style={{ alignItems: 'center' }}
                  onPress={() => setSelectedDateStr(dStr)}
                >
                  <Text style={styles.calDayHeader}>{getDayInitial(d)}</Text>
                  <View style={[
                    styles.calDayItem,
                    isActive && styles.calDayActive,
                    isSelected && styles.calDaySelected
                  ]}>
                    <Text style={[
                      styles.calDayText, 
                      isActive && styles.calDayActiveText,
                      isSelected && styles.calDaySelectedText
                    ]}>{getDateNumber(d)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 16 }]}>
            {selectedDateStr === new Date().toISOString().split('T')[0] ? 'Today' : selectedDateStr}
          </Text>
          
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>PAGES READ</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{selectedLog.pagesRead}</Text>
            </View>
            <BookOpen color={theme.colors.primary} size={24} />
          </View>

          <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.statLabel}>HOURS FOCUSED</Text>
              <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{formattedHours}</Text>
            </View>
            <Clock color={theme.colors.secondary} size={24} />
          </View>
        </View>
      </View>

      {/* Reading Now */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Reading Now</Text>
          <TouchableOpacity onPress={() => openAddModal('reading')}>
            <Plus color={theme.colors.primary} size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.bookList}>
          {readingBooks.length === 0 ? (
            <Text style={styles.emptyText}>새로운 책을 추가해 보세요.</Text>
          ) : (
            readingBooks.map((book) => (
              <TouchableOpacity key={book.id} style={styles.bookCard} activeOpacity={0.8} onPress={() => openActionModal(book)}>
                <BookCover coverUrl={book.coverUrl} title={book.title} style={styles.bookCover} />
                <View style={styles.bookInfo}>
                  <View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <Text style={[styles.bookTitle, {flex: 1}]} numberOfLines={2}>{book.title}</Text>
                      {activeTimerBookId === book.id && (
                        <View style={styles.runningTimerBadge}>
                          <Timer color={theme.colors.tertiary} size={12} />
                          <Text style={styles.runningTimerText}>{formatTimer(sessionSeconds)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bookAuthor}>{book.author}</Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressText}>{Math.round((book.currentPage / book.totalPages) * 100)}%</Text>
                      <Text style={styles.progressText}>Page {book.currentPage} of {book.totalPages}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(100, (book.currentPage / book.totalPages) * 100)}%` }]} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Queues Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Want to Read</Text>
          <ArrowRight color={theme.colors.onSurfaceVariant} size={20} />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queueGrid}>
          {queueBooks.map((book) => (
            <TouchableOpacity key={book.id} onPress={() => openActionModal(book)}>
              <BookCover coverUrl={book.coverUrl} title={book.title} style={styles.queueImage} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.queueAddBtn} onPress={() => openAddModal('queue')}>
            <Plus color={theme.colors.onSurfaceVariant} size={28} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Finished</Text>
          <ArrowRight color={theme.colors.onSurfaceVariant} size={20} />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queueGrid}>
          {finishedBooks.map((book) => (
            <TouchableOpacity key={book.id} onPress={() => openActionModal(book)}>
              <BookCover coverUrl={book.coverUrl} title={book.title} style={[styles.queueImage, { opacity: 0.6 }]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Book Modal */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a Book</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <X color={theme.colors.onSurface} size={24} />
              </TouchableOpacity>
            </View>

            {/* Cover Select Area */}
            <TouchableOpacity style={styles.coverSelectArea} onPress={handleCoverSelect}>
              {newCoverUrl ? (
                <Image source={{ uri: newCoverUrl }} style={styles.coverSelectImage} />
              ) : (
                <View style={styles.coverSelectPlaceholder}>
                  <Camera color={theme.colors.onSurfaceVariant} size={32} />
                  <Text style={styles.coverSelectText}>표지 찾기</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Book Title"
              placeholderTextColor={theme.colors.outline}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Author"
              placeholderTextColor={theme.colors.outline}
              value={newAuthor}
              onChangeText={setNewAuthor}
            />
            <TextInput
              style={styles.input}
              placeholder="Total Pages"
              placeholderTextColor={theme.colors.outline}
              keyboardType="numeric"
              value={newTotalPages}
              onChangeText={setNewTotalPages}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddBook}>
              <Text style={styles.submitBtnText}>Add to Library</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action Modal */}
      {selectedBook && (
        <Modal visible={!!selectedBook && !isMemoModalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'flex-end'}} keyboardShouldPersistTaps="handled">
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail" style={{flex: 1, marginRight: 16}}>
                    {selectedBook.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedBook(null)}>
                    <X color={theme.colors.onSurface} size={24} />
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.bookAuthor, { marginBottom: 16 }]}>{selectedBook.author}</Text>

                {selectedBook.status === 'reading' && (
                  <View style={styles.actionSection}>
                    
                    {/* Minimal Timer UI */}
                    <View style={styles.timerContainer}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <Timer color={activeTimerBookId === selectedBook.id ? theme.colors.tertiary : theme.colors.onSurfaceVariant} size={20} />
                        <Text style={[styles.timerText, activeTimerBookId === selectedBook.id && { color: theme.colors.tertiary }]}>
                          {activeTimerBookId === selectedBook.id ? formatTimer(sessionSeconds) : '00:00'}
                        </Text>
                      </View>
                      {activeTimerBookId === selectedBook.id ? (
                        <TouchableOpacity style={[styles.timerBtn, { backgroundColor: theme.colors.error }]} onPress={handleStopTimer}>
                          <Square color={theme.colors.onPrimary} size={14} />
                          <Text style={styles.timerBtnText}>Stop</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={[styles.timerBtn, { backgroundColor: theme.colors.primary }]} onPress={handleStartTimer}>
                          <Play color={theme.colors.onPrimary} size={14} />
                          <Text style={styles.timerBtnText}>Start</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={[styles.actionLabel, { marginTop: 8 }]}>Update Progress (Total: {selectedBook.totalPages})</Text>
                    <View style={styles.updateRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        keyboardType="numeric"
                        placeholder="현재 읽은 페이지 수"
                        placeholderTextColor={theme.colors.outline}
                        value={updatePageInput}
                        onChangeText={setUpdatePageInput}
                      />
                      <TouchableOpacity style={styles.updateBtn} onPress={handleUpdateProgress}>
                        <Text style={styles.updateBtnText}>Update</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.actionItem} onPress={() => handleStatusChange('finished')}>
                      <CheckCircle2 color={theme.colors.onSurface} size={20} />
                      <Text style={styles.actionItemText}>Mark as Finished</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedBook.status === 'queue' && (
                  <View style={styles.actionSection}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => handleStatusChange('reading')}>
                      <Play color={theme.colors.onSurface} size={20} />
                      <Text style={styles.actionItemText}>Start Reading</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedBook.status === 'finished' && (
                  <View style={styles.actionSection}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => handleStatusChange('reading')}>
                      <RefreshCw color={theme.colors.onSurface} size={20} />
                      <Text style={styles.actionItemText}>Read Again</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.divider} />
                
                {/* Memos Section */}
                <View style={styles.actionSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.actionLabel, { fontSize: 14 }]}>Memos</Text>
                  </View>
                  
                  {/* We get fresh memos from the store directly to reflect updates */}
                  {books.find(b => b.id === selectedBook.id)?.memos?.map(memo => (
                    <TouchableOpacity key={memo.id} style={styles.memoCard} onPress={() => openMemoModal(memo.id)}>
                      {memo.page ? <Text style={styles.memoPage}>Page {memo.page}</Text> : null}
                      <Text style={styles.memoContent}>{memo.content}</Text>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity style={styles.actionItem} onPress={() => openMemoModal()}>
                    <PenLine color={theme.colors.primary} size={20} />
                    <Text style={[styles.actionItemText, { color: theme.colors.primary }]}>📝 인상 깊은 문장/메모 남기기</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />
                
                <TouchableOpacity style={[styles.actionItem, { marginTop: 8 }]} onPress={handleDelete}>
                  <Trash2 color={theme.colors.error} size={20} />
                  <Text style={[styles.actionItemText, { color: theme.colors.error }]}>Delete Book</Text>
                </TouchableOpacity>
                
                <View style={{ height: 20 }} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Memo Modal */}
      <Modal visible={isMemoModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <FileText color={theme.colors.primary} size={24} />
                <Text style={styles.modalTitle}>{editingMemoId ? '메모 수정하기' : '새 메모 남기기'}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMemoModalVisible(false)}>
                <X color={theme.colors.onSurface} size={24} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="페이지 수 (선택 사항)"
              placeholderTextColor={theme.colors.outline}
              keyboardType="numeric"
              value={memoPageInput}
              onChangeText={setMemoPageInput}
            />
            
            <TextInput
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              placeholder="어떤 점이 좋았나요? 깊이 생각한 점을 자유롭게 적어보세요..."
              placeholderTextColor={theme.colors.outline}
              multiline
              value={memoContentInput}
              onChangeText={setMemoContentInput}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 20 }}>
              {editingMemoId && (
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.error, flex: 1 }]} onPress={() => {
                  setIsMemoModalVisible(false);
                  handleDeleteMemo(editingMemoId);
                }}>
                  <Text style={[styles.submitBtnText, { color: theme.colors.error }]}>삭제</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.submitBtn, { flex: 2, marginTop: editingMemoId ? 8 : 8 }]} onPress={handleSaveMemo}>
                <Text style={styles.submitBtnText}>저장하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 32,
  },
  gridSection: {
    gap: 16,
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 65, 0.2)', // outlineVariant with opacity
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: theme.fonts.body,
    fontSize: 18,
    color: theme.colors.onSurface,
  },
  streakText: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  calDayHeader: {
    width: 28,
    textAlign: 'center',
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  calDayItem: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  calDayActive: {
    backgroundColor: 'rgba(217, 194, 182, 0.2)', // tertiary with opacity
  },
  calDaySelected: {
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
  },
  calDayText: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  calDayActiveText: {
    color: theme.colors.tertiary,
    fontFamily: theme.fonts.label,
  },
  calDaySelectedText: {
    color: theme.colors.tertiary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerHighest,
    paddingBottom: 12,
    marginBottom: 12,
  },
  statLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: theme.fonts.display,
    fontSize: 40,
    lineHeight: 48,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerHighest,
    paddingBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerHighest,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: theme.fonts.body,
    fontSize: 18,
    color: theme.colors.onSurface,
  },
  emptyText: {
    fontFamily: theme.fonts.caption,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    padding: 20,
  },
  bookList: {
    gap: 16,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 65, 0.1)',
    gap: 16,
  },
  bookCover: {
    width: 64,
    height: 96,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceContainer,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 24,
  },
  bookAuthor: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontFamily: theme.fonts.caption,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.tertiary,
    borderRadius: 2,
  },
  queueGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  queueImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainer,
  },
  queueAddBtn: {
    width: 80,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 65, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceContainer,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    color: theme.colors.onSurface,
  },
  input: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: 8,
    padding: 16,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.body,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitBtnText: {
    fontFamily: theme.fonts.label,
    color: theme.colors.onPrimary,
    fontSize: 16,
  },
  actionSection: {
    gap: 16,
    marginBottom: 16,
  },
  actionLabel: {
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  updateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  updateBtn: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  updateBtnText: {
    fontFamily: theme.fonts.label,
    color: theme.colors.onPrimary,
    fontSize: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 65, 0.1)',
    gap: 12,
  },
  actionItemText: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceContainerHighest,
    marginVertical: 8,
  },
  memoCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.tertiary,
    marginBottom: 8,
  },
  memoPage: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.tertiary,
    marginBottom: 4,
  },
  memoContent: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  timerText: {
    fontFamily: theme.fonts.label,
    fontSize: 18,
    color: theme.colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  timerBtnText: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onPrimary,
  },
  runningTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 194, 182, 0.1)', // tertiary with opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  runningTimerText: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.tertiary,
    fontVariant: ['tabular-nums'],
  },
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
  coverSelectArea: {
    width: 120,
    height: 180,
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  coverSelectPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverSelectText: {
    fontFamily: theme.fonts.caption,
    color: theme.colors.onSurfaceVariant,
  },
  coverSelectImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
