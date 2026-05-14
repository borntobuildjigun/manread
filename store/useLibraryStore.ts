import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BookStatus = 'reading' | 'queue' | 'finished';

export interface BookMemo {
  id: string;
  page?: string;
  content: string;
  createdAt: number;
}

export interface DailyLog {
  pagesRead: number;
  readingSeconds: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  createdAt: number;
  memos?: BookMemo[];
  totalReadingTime?: number;
}

interface LibraryState {
  books: Book[];
  dailyLogs: Record<string, DailyLog>;
  addBook: (book: Omit<Book, 'id' | 'createdAt' | 'currentPage'>) => void;
  updateProgress: (id: string, currentPage: number) => void;
  updateStatus: (id: string, status: BookStatus) => void;
  deleteBook: (id: string) => void;
  addMemo: (bookId: string, memo: Omit<BookMemo, 'id' | 'createdAt'>) => void;
  updateMemo: (bookId: string, memoId: string, content: string, page?: string) => void;
  deleteMemo: (bookId: string, memoId: string) => void;
  logReadingTime: (bookId: string, seconds: number) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      books: [],
      dailyLogs: {},
      addBook: (newBook) => set((state) => ({
        books: [
          {
            ...newBook,
            id: Date.now().toString(),
            createdAt: Date.now(),
            currentPage: 0,
            totalReadingTime: 0,
          },
          ...state.books
        ]
      })),
      updateProgress: (id, currentPage) => set((state) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let deltaPages = 0;
        
        const newBooks = state.books.map((book) => {
          if (book.id === id) {
            deltaPages = Math.max(0, currentPage - book.currentPage);
            return { ...book, currentPage };
          }
          return book;
        });

        const currentLog = state.dailyLogs[todayStr] || { pagesRead: 0, readingSeconds: 0 };
        
        return {
          books: newBooks,
          dailyLogs: {
            ...state.dailyLogs,
            [todayStr]: {
              ...currentLog,
              pagesRead: currentLog.pagesRead + deltaPages
            }
          }
        };
      }),
      updateStatus: (id, status) => set((state) => ({
        books: state.books.map((book) => 
          book.id === id ? { ...book, status } : book
        )
      })),
      deleteBook: (id) => set((state) => ({
        books: state.books.filter((book) => book.id !== id)
      })),
      addMemo: (bookId, memo) => set((state) => ({
        books: state.books.map((book) => 
          book.id === bookId 
            ? { 
                ...book, 
                memos: [
                  { ...memo, id: Date.now().toString(), createdAt: Date.now() },
                  ...(book.memos || [])
                ] 
              } 
            : book
        )
      })),
      updateMemo: (bookId, memoId, content, page) => set((state) => ({
        books: state.books.map((book) => 
          book.id === bookId 
            ? { 
                ...book, 
                memos: (book.memos || []).map(m => m.id === memoId ? { ...m, content, page } : m)
              } 
            : book
        )
      })),
      deleteMemo: (bookId, memoId) => set((state) => ({
        books: state.books.map((book) => 
          book.id === bookId 
            ? { 
                ...book, 
                memos: (book.memos || []).filter(m => m.id !== memoId)
              } 
            : book
        )
      })),
      logReadingTime: (bookId, seconds) => set((state) => {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const newBooks = state.books.map((book) => {
          if (book.id === bookId) {
            return { ...book, totalReadingTime: (book.totalReadingTime || 0) + seconds };
          }
          return book;
        });

        const currentLog = state.dailyLogs[todayStr] || { pagesRead: 0, readingSeconds: 0 };
        
        return {
          books: newBooks,
          dailyLogs: {
            ...state.dailyLogs,
            [todayStr]: {
              ...currentLog,
              readingSeconds: currentLog.readingSeconds + seconds
            }
          }
        };
      }),
    }),
    {
      name: 'maniker-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
