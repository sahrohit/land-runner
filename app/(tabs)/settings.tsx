import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { router } from 'expo-router';
import {
  User,
  Mail,
  Palette,
  LogOut,
  Check,
  AlertCircle,
  ChevronRight,
  Shield,
  Edit3,
} from 'lucide-react-native';

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
  greenBadge: 'rgba(163,230,53,0.18)',
  errorBg: 'rgba(239,68,68,0.10)',
  errorText: '#EF4444',
  successBg: 'rgba(163,230,53,0.15)',
  successText: '#5A8A00',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string;
  colorHex: string;
};

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, colorHex }: { name: string; colorHex: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorHex);
  const bg = isValidHex ? colorHex : T.accentGreen;

  // Decide text color based on luminance
  const hex = bg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.55 ? '#0A0A0A' : '#FFFFFF';

  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { color: textColor }]}>{initials || '?'}</Text>
    </View>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  icon,
  label,
  value,
  placeholder,
  onChangeText,
  editable = true,
  autoCapitalize = 'none',
  keyboardType = 'default',
  maxLength,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  maxLength?: number;
}) {
  return (
    <View style={[styles.fieldRow, { backgroundColor: T.card }]}>
      <View style={styles.fieldIconWrap}>{icon}</View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: T.textMuted }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.iconMuted}
          editable={editable}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
          style={[
            styles.fieldInput,
            {
              color: editable ? T.textPrimary : T.textMuted,
            },
          ]}
        />
      </View>
      {!editable && <ChevronRight size={16} color={T.iconMuted} />}
    </View>
  );
}

// ── Color preview swatch ──────────────────────────────────────────────────────

function ColorSwatch({ colorHex }: { colorHex: string }) {
  const isValid = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorHex);
  return (
    <View
      style={[
        styles.swatch,
        {
          backgroundColor: isValid ? colorHex : T.cardInner,
          borderColor: isValid ? colorHex : T.border,
        },
      ]}
    />
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [user, userLoading] = useAuthState(auth);

  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [profileData, profileLoading, profileError] = useDocumentData(userDocRef);

  // Local editable state
  const [displayName, setDisplayName] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Seed local state from Firestore when loaded
  useEffect(() => {
    if (profileData) {
      setDisplayName(profileData.displayName ?? '');
      setColorHex(profileData.colorHex ?? '');
      setPhotoUrl(profileData.photoUrl ?? '');
      setIsDirty(false);
    }
  }, [profileData]);

  const markDirty = <T extends string>(setter: (v: T) => void) => (val: T) => {
    setter(val);
    setIsDirty(true);
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (!user || !userDocRef) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await setDoc(
        userDocRef,
        { displayName, colorHex, photoUrl },
        { merge: true }
      );
      setSaveMsg({ type: 'success', text: 'Profile updated successfully' });
      setIsDirty(false);
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.message ?? 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          router.replace('/login');
        },
      },
    ]);
  };

  const isLoading = userLoading || profileLoading;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.accentGreen} />
        <Text style={[styles.loadingText, { color: T.textMuted }]}>Loading profile…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: T.bg }]}>
        <Shield size={40} color={T.iconMuted} />
        <Text style={[styles.loadingText, { color: T.textMuted }]}>Not signed in</Text>
      </View>
    );
  }

  const profile = profileData as UserProfile | undefined;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ backgroundColor: T.bg }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: T.textPrimary }]}>Profile</Text>
          <Text style={[styles.pageSubtitle, { color: T.textMid }]}>
            Manage your account details
          </Text>
        </View>

        {/* Avatar + name banner */}
        <View style={[styles.banner, { backgroundColor: T.card }]}>
          <View style={styles.accentBar} />
          <View style={styles.bannerBody}>
            <Avatar name={displayName || profile?.displayName || '?'} colorHex={colorHex || profile?.colorHex || T.accentGreen} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerName, { color: T.textPrimary }]} numberOfLines={1}>
                {displayName || 'Your Name'}
              </Text>
              <Text style={[styles.bannerEmail, { color: T.textMid }]} numberOfLines={1}>
                {profile?.email ?? user.email ?? '—'}
              </Text>
              <View style={[styles.idBadge, { backgroundColor: T.cardInner }]}>
                <Text style={[styles.idText, { color: T.textMuted }]} numberOfLines={1}>
                  ID: {profile?.id ?? user.uid}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Error from Firestore */}
        {profileError && (
          <View style={[styles.banner2, { backgroundColor: T.errorBg }]}>
            <AlertCircle size={15} color={T.errorText} />
            <Text style={[styles.msgText, { color: T.errorText }]}>
              {profileError.message}
            </Text>
          </View>
        )}

        {/* Save feedback */}
        {saveMsg && (
          <View
            style={[
              styles.banner2,
              {
                backgroundColor:
                  saveMsg.type === 'success' ? T.successBg : T.errorBg,
              },
            ]}
          >
            {saveMsg.type === 'success'
              ? <Check size={15} color={T.successText} />
              : <AlertCircle size={15} color={T.errorText} />
            }
            <Text
              style={[
                styles.msgText,
                { color: saveMsg.type === 'success' ? T.successText : T.errorText },
              ]}
            >
              {saveMsg.text}
            </Text>
          </View>
        )}

        {/* Editable fields */}
        <Text style={[styles.sectionLabel, { color: T.textMuted }]}>ACCOUNT INFO</Text>

        <FieldRow
          icon={<User size={16} color={T.accentGreen} />}
          label="Display Name"
          value={displayName}
          placeholder="Enter your name"
          onChangeText={markDirty(setDisplayName)}
          autoCapitalize="words"
        />

        <FieldRow
          icon={<Mail size={16} color={T.textMuted} />}
          label="Email"
          value={profile?.email ?? user.email ?? ''}
          placeholder="—"
          onChangeText={() => { }}
          editable={false}
          keyboardType="email-address"
        />

        {/* Color hex */}
        <View style={[styles.fieldRow, { backgroundColor: T.card }]}>
          <View style={styles.fieldIconWrap}>
            <Palette size={16} color={T.accentBlue} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: T.textMuted }]}>Color (hex)</Text>
            <TextInput
              value={colorHex}
              onChangeText={markDirty(setColorHex)}
              placeholder="#A3E635"
              placeholderTextColor={T.iconMuted}
              maxLength={7}
              autoCapitalize="none"
              style={[styles.fieldInput, { color: T.textPrimary }]}
            />
          </View>
          <ColorSwatch colorHex={colorHex} />
        </View>

        <FieldRow
          icon={<Edit3 size={16} color={T.accentBlue} />}
          label="Photo URL"
          value={photoUrl}
          placeholder="https://…"
          onChangeText={markDirty(setPhotoUrl)}
        />

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !isDirty}
          activeOpacity={0.85}
          style={[
            styles.saveButton,
            {
              backgroundColor: isDirty && !saving ? T.accentGreen : T.card,
              borderWidth: isDirty && !saving ? 0 : 1,
              borderColor: T.border,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={T.textPrimary} />
          ) : (
            <Check size={16} color={isDirty ? '#0A0A0A' : T.textMuted} />
          )}
          <Text
            style={[
              styles.saveButtonText,
              { color: isDirty && !saving ? '#0A0A0A' : T.textMuted },
            ]}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <Text style={[styles.sectionLabel, { color: T.textMuted }]}>ACCOUNT</Text>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          style={[styles.logoutButton, { backgroundColor: T.card, borderColor: T.errorBg }]}
        >
          <LogOut size={16} color={T.errorText} />
          <Text style={[styles.logoutText, { color: T.errorText }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Header
  pageHeader: { marginBottom: 6 },
  pageTitle: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, marginTop: 2 },

  // Banner card
  banner: { borderRadius: 20, overflow: 'hidden', marginBottom: 4 },
  accentBar: { height: 3, backgroundColor: '#A3E635' },
  bannerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  bannerText: { flex: 1, gap: 3 },
  bannerName: { fontSize: 17, fontWeight: '800' },
  bannerEmail: { fontSize: 13 },
  idBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  idText: { fontSize: 10, fontFamily: 'monospace' },

  // Avatar
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900' },

  // Inline banner (feedback / error)
  banner2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 2,
  },
  msgText: { fontSize: 13, flex: 1 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },

  // Field row
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 2,
  },
  fieldIconWrap: { width: 24, alignItems: 'center' },
  fieldContent: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  fieldInput: { fontSize: 15, fontWeight: '600', padding: 0 },

  // Color swatch
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
  },

  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 6,
  },
  saveButtonText: { fontSize: 15, fontWeight: '700' },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
});