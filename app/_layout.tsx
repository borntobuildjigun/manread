import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { 
  Literata_400Regular, 
  Literata_600SemiBold, 
  Literata_700Bold 
} from '@expo-google-fonts/literata';
import { 
  WorkSans_400Regular, 
  WorkSans_500Medium 
} from '@expo-google-fonts/work-sans';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../utils/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Literata_400Regular,
    Literata_600SemiBold,
    Literata_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background }
      }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
