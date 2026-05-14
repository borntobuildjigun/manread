import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeedPost {
  id: string;
  user: {
    username: string;
    avatarUrl: string;
  };
  book: {
    title: string;
    author: string;
    coverUrl?: string;
  };
  reflection: {
    question: string;
    answer: string;
  };
  likes: number;
  isLikedByMe: boolean;
  createdAt: string;
}

const MOCK_POSTS: FeedPost[] = [
  {
    id: 'post_1',
    user: {
      username: '@demian_1919',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
    },
    book: {
      title: '데미안',
      author: '헤르만 헤세'
    },
    reflection: {
      question: '싱클레어가 경험한 두 세계의 충돌은 당신의 삶에서 어떻게 나타나고 있나요?',
      answer: '밝은 세계의 안온함에 머물고 싶지만, 끊임없이 어두운 세계의 유혹과 진실에 대한 갈망이 나를 흔든다. 알을 깨고 나오는 고통 없이 온전한 나 자신이 될 수 없음을 매일 밤 깨닫고 있다.'
    },
    likes: 124,
    isLikedByMe: false,
    createdAt: '2시간 전'
  },
  {
    id: 'post_2',
    user: {
      username: '@camus_absurd',
      avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=150&auto=format&fit=crop'
    },
    book: {
      title: '이방인',
      author: '알베르 카뮈',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200&auto=format&fit=crop'
    },
    reflection: {
      question: '뫼르소가 세상의 관습에 순응하지 않은 것은 자유일까요, 아니면 결핍일까요?',
      answer: '그는 거짓말을 거부했을 뿐이다. 세상은 보편적 도덕을 강요하지만, 뫼르소는 자신의 감정에만 충실했다. 그것은 지독하게 투명한 자유이자, 사회적 관점에서는 치명적인 결핍이다.'
    },
    likes: 89,
    isLikedByMe: true,
    createdAt: '5시간 전'
  },
  {
    id: 'post_3',
    user: {
      username: '@sapiens_reader',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop'
    },
    book: {
      title: '사피엔스',
      author: '유발 하라리'
    },
    reflection: {
      question: '인지 혁명 이후 허구를 믿는 능력이 인류를 지배자로 만든 이유는 무엇이라 생각하나요?',
      answer: '신용, 화폐, 국가... 우리가 목숨을 거는 모든 것들이 결국 보이지 않는 허구라는 사실이 섬뜩하면서도 아름답다. 허구가 모르는 사람 수백만 명을 협력하게 만든 강력한 접착제였다.'
    },
    likes: 215,
    isLikedByMe: false,
    createdAt: '1일 전'
  }
];

interface SocialStore {
  posts: FeedPost[];
  toggleLike: (postId: string) => void;
}

export const useSocialStore = create<SocialStore>()(
  persist(
    (set) => ({
      posts: MOCK_POSTS,
      toggleLike: (postId) => set((state) => {
        const newPosts = state.posts.map(post => {
          if (post.id === postId) {
            const isLiking = !post.isLikedByMe;
            return {
              ...post,
              isLikedByMe: isLiking,
              likes: isLiking ? post.likes + 1 : post.likes - 1
            };
          }
          return post;
        });
        return { posts: newPosts };
      }),
    }),
    {
      name: 'manread-social-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
