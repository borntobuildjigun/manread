import { Tabs } from 'expo-router';
import { Book, MessageCircle, Share2 } from 'lucide-react-native';
import { theme } from '../../utils/theme';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: theme.colors.tertiary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceContainer,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.label,
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontFamily: theme.fonts.headline,
          color: theme.colors.onSurface,
          fontSize: 24,
        },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <Book size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Reflect',
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Share2 size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
