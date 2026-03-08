# Land Runner

Land Runner is a location-based mobile application built with React Native and Expo. It gamifies outdoor running by allowing users to track their routes and claim real-world territories on a shared interactive map.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)

## Features

- **Route Tracking**: Utilizes the device's native GPS API to track user running routes precisely.
- **Dynamic Territory Claiming**: Dynamically plots and renders recorded running routes into custom territory polygons on the map.
- **Real-Time Synchronization**: Synchronizes claimed territory data across all active users immediately using a cloud database.
- **Cross-Platform Compatibility**: Built and optimized for both iOS and Android mobile platforms.

## Tech Stack

- **Frontend Framework**: React Native via Expo
- **Routing**: Expo Router (File-based routing)
- **Styling**: TailwindCSS integrated via NativeWind
- **Mapping Services**: React Native Maps
- **Backend & Authentication**: Firebase (Firestore, Auth)
- **Language**: TypeScript

## Prerequisites

Before running the project locally, ensure you have the following installed:
- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm
- Expo CLI
- Expo Go mobile application on your physical device (or an iOS Simulator/Android Emulator)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd land-runner
```

2. Install the application dependencies:
```bash
npm install
```

## Configuration

This application requires an active Firebase configuration to handle data synchronization and user authentication.

1. Navigate to the Firebase Console and create a new project.
2. Enable the Firestore Database and Authentication modules.
3. Obtain your application's web configuration object.
4. Apply the configuration keys inside the `lib/firebase.ts` initialization file.

## Usage

Start the Expo development server:

```bash
npm run dev
```

Once the Metro bundler processes the files, you have several options to view the application:
- Open the Expo Go app on your physical device and scan the terminal QR code.
- Press `i` in the terminal to launch the iOS simulator.
- Press `a` in the terminal to launch the Android emulator.

## Project Structure

- `/app`: Contains all application routes, tabs, and screen layouts.
- `/components`: Reusable UI components and primitive designs.
- `/context`: Application-wide React context providers (e.g., authentication state).
- `/lib`: Helper functions and third-party initializations.
- `/assets`: Static resources, fonts, and images.

---
**Developed by Team Dal Bhat**
