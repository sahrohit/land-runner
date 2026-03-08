import { Text } from '@/components/ui/text';
import { View, Image, Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { Link } from 'expo-router';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';

const SOCIAL_CONNECTION_STRATEGIES = [
  //   {
  //     type: 'oauth_apple',
  //     source: { uri: 'https://img.clerk.com/static/apple.png?width=160' },
  //     useTint: true,
  //   },
  {
    type: 'oauth_google',
    source: { uri: 'https://img.clerk.com/static/google.png?width=160' },
    useTint: false,
  },
  //   {
  //     type: 'oauth_github',
  //     source: { uri: 'https://img.clerk.com/static/github.png?width=160' },
  //     useTint: true,
  //   },
];

export default function AuthScreen() {
  const { colorScheme } = useColorScheme();

  return (
    <View className="gap-2 sm:flex-row sm:gap-3">
      {SOCIAL_CONNECTION_STRATEGIES.map((strategy) => {
        return (
          <Button
            key={strategy.type}
            variant="outline"
            size="sm"
            className="sm:flex-1"
            onPress={() => {
              console.log('Pressed strategy: ', strategy.type);
            }}>
            <Image
              className={cn('size-4', strategy.useTint && Platform.select({ web: 'dark:invert' }))}
              tintColor={Platform.select({
                native: strategy.useTint ? (colorScheme === 'dark' ? 'white' : 'black') : undefined,
              })}
              source={strategy.source}
            />
            <Text>Login with Google</Text>
          </Button>
        );
      })}
    </View>
  );
}
