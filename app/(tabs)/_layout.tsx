import * as React from 'react';
import { Label, NativeTabs, Icon } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" key="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <Label>Maps</Label>
        <Icon sf="map" key="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="record">
        <Label>Record</Label>
        <Icon sf="camera" key="record" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leaderboard">
        <Label>Leaderboard</Label>
        <Icon sf="trophy" key="leaderboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" key="settings" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
