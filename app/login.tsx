import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react-native';

// ── Theme ─────────────────────────────────────────────────────────────────────

const T = {
  bg: '#F5F5F5',
  card: '#ECECEC',
  cardInner: '#E0E0E0',
  border: '#D5D5D5',
  textPrimary: '#0A0A0A',
  textMid: '#555555',
  textMuted: '#888888',
  iconMuted: '#C8C8C8',
  accentGreen: '#A3E635',
  accentBlue: '#60A5FA',
  errorBg: 'rgba(239,68,68,0.10)',
  errorText: '#EF4444',
} as const;

// ── Focusable input field ─────────────────────────────────────────────────────

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.inputRow,
        {
          backgroundColor: T.card,
          borderColor: focused ? T.accentGreen : T.border,
          borderWidth: focused ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={T.iconMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { color: T.textPrimary }]}
      />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!loading && user) return <Redirect href="/" />;

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please fill in all fields');
      return;
    }
    setErrorMsg(null);
    try {
      setSubmitting(true);
      await login(email, password);
    } catch (error: any) {
      setErrorMsg(error?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>

        {/* Logo mark */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: T.accentGreen }]}>
            <LogIn size={26} color="#0A0A0A" />
          </View>
        </View>

        {/* Heading */}
        <View style={styles.headingWrap}>
          <Text style={[styles.title, { color: T.textPrimary }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: T.textMid }]}>
            Sign in to continue tracking your activities
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: T.card }]}>
          <View style={[styles.accentBar, { backgroundColor: T.accentGreen }]} />
          <View style={styles.cardBody}>

            {/* Error banner */}
            {errorMsg && (
              <View style={[styles.errorBanner, { backgroundColor: T.errorBg }]}>
                <Text style={[styles.errorText, { color: T.errorText }]}>{errorMsg}</Text>
              </View>
            )}

            <InputField
              icon={<Mail size={16} color={focused => focused ? T.accentGreen : T.textMuted} />}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <InputField
              icon={<Lock size={16} color={T.textMuted} />}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* Login button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
              style={[
                styles.loginButton,
                { backgroundColor: submitting ? T.cardInner : T.accentGreen },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={T.textPrimary} />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <ArrowRight size={16} color="#0A0A0A" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign up link */}
        <Link href="/signup" asChild>
          <TouchableOpacity style={styles.signupRow} activeOpacity={0.7}>
            <Text style={[styles.signupText, { color: T.textMid }]}>
              Don't have an account?{' '}
            </Text>
            <Text style={[styles.signupLink, { color: T.accentGreen }]}>Sign up</Text>
          </TouchableOpacity>
        </Link>

      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },

  // Logo
  logoWrap: { alignItems: 'center' },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Heading
  headingWrap: { alignItems: 'center', gap: 4 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, textAlign: 'center' },

  // Card
  card: { borderRadius: 20, overflow: 'hidden' },
  accentBar: { height: 3 },
  cardBody: { padding: 16, gap: 12 },

  // Error banner
  errorBanner: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13 },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  inputIcon: { width: 20, alignItems: 'center' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },

  // Login button
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A0A0A',
  },

  // Sign up link
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: { fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: '700' },
});