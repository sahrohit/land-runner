import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Link } from 'expo-router';
import { Icon } from '@/components/ui/icon';

export default function Screen() {
  return (
    <View className="flex-1 items-center justify-center gap-8 p-4">
      <Link href="/auth" asChild>
        <Button>
          <Text>Sign in with Google</Text>
        </Button>
      </Link>
    </View>
  );
}
