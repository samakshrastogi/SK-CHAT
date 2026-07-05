# SK Connect — Premium Real-Time Messaging & Collaboration Hub

SK Connect is a state-of-the-art, feature-rich instant messaging and communication platform designed to provide users with an immersive, secure, and beautiful social experience. Built with a modern glassmorphic interface, SK Connect features real-time text chats, WebRTC audio/video calls, expiring story sharing, Discord-style role-based communities, and an integrated AI companion.

---

## Table of Contents
- [Overview](#overview)
- [Purpose](#purpose)
- [User Experience Flowcharts](#user-experience-flowcharts)
  - [Flowchart 1: User Onboarding & Quick Connect Pairing](#flowchart-1-user-onboarding--quick-connect-pairing)
  - [Flowchart 2: Real-Time Interactive Messaging & File Sharing](#flowchart-2-real-time-interactive-messaging--file-sharing)
  - [Flowchart 3: High-Definition WebRTC Calling Loop](#flowchart-3-high-definition-webrtc-calling-loop)
  - [Flowchart 4: Expiring Stories & Engagement Flow](#flowchart-4-expiring-stories--engagement-flow)
  - [Flowchart 5: Communities & Sub-channels System](#flowchart-5-communities--sub-channels-system)
- [Detailed Section Working (User Prospectus)](#detailed-section-working-user-prospectus)
  - [1. Getting Started & Connecting with Friends](#1-getting-started--connecting-with-friends)
  - [2. Conversing, Sharing Files, & Interactive Polls](#2-conversing-sharing-files--interactive-polls)
  - [3. Expiring Stories & Media Widgets](#3-expiring-stories--media-widgets)
  - [4. Seamless Voice & Video Calling](#4-seamless-voice--video-calling)
  - [5. Role-Based Communities & Channels](#5-role-based-communities--channels)
  - [6. AI Copilot & Personal Settings](#6-ai-copilot--personal-settings)
- [Testing & Seeder Credentials](#testing--seeder-credentials)

---

## Overview

SK Connect bridges the gap between clean visual aesthetics and premium features. Users can interact in real-time with single and double-tick status indicators, add emoji reactions, participate in interactive polls, share files with live upload progress feedback, publish 24-hour expiring stories with rich text widgets, and organize large groups into communities with designated channel types (Text, Announcements, Q&As, Media, and Voice Rooms).

---

## Purpose

The main objective of SK Connect is to provide a single, unified communication hub that values user experience above all else. By offering zero-refresh real-time state synchronization, users can stay connected without the frustration of constant manual page reloads. Whether pairing instantly using short-lived 4-digit verification codes, enjoying voice rooms, or summarizing long group chat histories using an AI assistant, SK Connect makes digital interaction frictionless, expressive, and highly engaging.

---

## User Experience Flowcharts

### Flowchart 1: User Onboarding & Quick Connect Pairing
This flowchart describes the path from landing on SK Connect, registering or authenticating via Google SSO, to pairing instantly with another user using a 4-digit code.

```mermaid
graph TD
  Start([User opens SK Connect]) --> Landing{Has Account?}
  
  Landing -->|No| Register[Register Page - Enter credentials & Confirm Password]
  Landing -->|Yes| Login[Login Page - Enter email & password OR Google SSO]
  
  Register --> AutoVerify[Auto-Verification / Welcome Setup]
  AutoVerify --> Login
  
  Login --> Dash[Dashboard Sidebar Loaded]
  
  Dash --> OpenProfile[Open User Profile]
  OpenProfile --> GenerateCode[Click 'Generate Connection Code']
  GenerateCode --> DisplayCode[Show 4-digit code to friend]
  
  Dash --> InputCode[Enter Friend's 4-digit Connection Code]
  InputCode --> TriggerConnect[Click 'Connect']
  
  DisplayCode & TriggerConnect --> NewChat[Instant Direct Chat Window Opens]
```

### Flowchart 2: Real-Time Interactive Messaging & File Sharing
This flowchart illustrates the messaging interface activities, including file selection previews, interactive polls, message reactions, and disappearing timers.

```mermaid
graph TD
  StartChat[Open Active Conversation] --> SelectInput{What to send?}
  
  SelectInput -->|Text Message| EnterText[Type message text]
  SelectInput -->|Self-Destruct Message| SelectTimer[Pick timer: 5s, 1m, 1h, 1d] --> EnterText
  SelectInput -->|Attach File| ClickPaperclip[Click Paperclip Icon]
  SelectInput -->|Create Poll| ChoosePoll[Click Create Poll Option]
  
  ClickPaperclip --> SelectLocalFile[Select Image/Video/Doc from device]
  SelectLocalFile --> ShowPreview[Selected File Chip appears showing name & size]
  ShowPreview -->|Change mind| ClearPreview[Click 'X' to remove file]
  ShowPreview --> SendFile[Press Send]
  
  ChoosePoll --> SetPollQuestions[Input Question & Custom Options]
  SetPollQuestions --> SendPoll[Press Send]
  
  EnterText & SendFile & SendPoll --> DispatchMessage[Message appends to thread optimistically]
  
  DispatchMessage --> SocketTransmit[Socket.io Gateway delivers message to recipient]
  
  SocketTransmit --> ReceiptUpdate{Recipient state?}
  ReceiptUpdate -->|Online & Active Chat| BlueTick[Emits 'seen' receipt -> Double Blue Ticks]
  ReceiptUpdate -->|Online but Tab Closed| GreyTick[Emits 'delivered' receipt -> Double Grey Ticks]
  ReceiptUpdate -->|Offline| SingleTick[Single Grey Tick]
```

### Flowchart 3: High-Definition WebRTC Calling Loop
This flowchart describes how a user starts a voice or video call, exchanges live streams, and interacts with media controls.

```mermaid
graph TD
  StartCall[Open Direct Chat Screen] --> ClickCallBtn{Click Phone or Video Icon}
  
  ClickCallBtn --> OutgoingScreen[Outgoing Call Overlay opens with ringback sound]
  
  OutgoingScreen --> Signalling[WebRTC Handshake exchanges SDP & ICE Candidates]
  
  Signalling --> RecipientRinger[Recipient sees incoming call overlay screen & hears ringtone]
  
  RecipientRinger --> Choice{Recipient Action}
  Choice -->|Decline / Ignore| Hangup[Call terminates & call logged as 'missed']
  Choice -->|Accept| ConnectStreams[Audio/Video streams bind instantly]
  
  ConnectStreams --> ActionControls[Toggle Mic, Video feeds, or Screen Share]
  ActionControls --> EndCall[Click Red End Call button to terminate]
```

### Flowchart 4: Expiring Stories & Engagement Flow
This flowchart describes the creation of 24-hour status slides, widgets configurations, and friend engagements.

```mermaid
graph TD
  DashBar[Horizontal Stories Drawer] --> ClickAddStory[Click 'Add Story']
  
  ClickAddStory --> SelectBG[Choose text slide with colorful gradient background]
  ClickAddStory --> UploadMedia[Select photos/videos from device]
  
  SelectBG & UploadMedia --> StoryWidgets[Add widget content: locations, hashtags, mentions, Q&As]
  
  StoryWidgets --> PublishStory[Publish Story]
  
  PublishStory --> RealtimeBroadcast[Broadcasting status:new event via socket]
  RealtimeBroadcast --> SidebarDrawer[Friend's horizontal stories drawer updates instantly]
  
  SidebarDrawer --> ViewStory[Friend opens and views story]
  ViewStory --> SendReply[Friend writes a comment reply]
  
  SendReply --> InboxDeliver[Story reply lands directly in your private message thread]
```

### Flowchart 5: Communities & Sub-channels System
This flowchart illustrates the Discord-style community structure, from joining via secure links to interacting in categorized channels.

```mermaid
graph TD
  ExploreTab[Click Explore Tab] --> FindCommunity{Action?}
  
  FindCommunity -->|Create| FillDetails[Upload Avatar, Banner & Input Details]
  FindCommunity -->|Join| EnterLink[Enter invite code or click secure invite link]
  
  FillDetails --> BuildCommunity[Community auto-generates announcements general media qa channels]
  EnterLink --> AccessChannels[Joined Community and granted sub-channels access]
  
  AccessChannels --> ViewAnnouncements[Read official Announcements]
  AccessChannels --> GeneralChat[Discuss in general text channels]
  AccessChannels --> MediaChannel[Share documents, files & links in Media Hub]
  AccessChannels --> VoiceRoom[Join drop-in audio Voice Room]
```

---

## Detailed Section Working (User Prospectus)

### 1. Getting Started & Connecting with Friends
* **Google SSO & Credentials Log In**: When you first visit SK Connect, you can log in securely using your Google Account with a single tap, or register using a standard email. If you register, the password confirmation field helps prevent spelling mistakes.
* **4-Digit Quick Connect Pairing**: Instead of asking friends for complex, case-sensitive usernames, you can connect instantly. One user click **Generate Connection Code** to receive a 4-digit code. The other user inputs this code into their **Quick Connect** box and hits **Connect**. A private direct chat thread opens instantly on both dashboards.

### 2. Conversing, Sharing Files, & Interactive Polls
* **Premium Real-Time Chatting**: All message actions—including sending, editing, and deleting messages—update instantly for both participants. Centered reaction panels let you tap on an emoji to react to messages in real time.
* **Visual File Attachments**: Clicking the paperclip icon opens your device file selector. When a file is chosen, a preview chip appears showing the filename and size, letting you double-check your selection before sending or click the close icon to remove it. Once sent, it appears as a clean card showing the filename and download button.
* **Self-Destruct Messages**: If you are sharing sensitive information, select a self-destruct duration next to the text input. Once the countdown expires, the message bubble automatically dissolves from both screens.
* **Interactive Polls**: Write a question and add options to gather group opinions. Friends click directly on options to vote, and percentage bars animate in real time.

### 3. Expiring Stories & Media Widgets
* **Status Updates drawer**: View expiring stories posted by your contacts in a horizontal bar at the top of the chat panel. A colorful ring around a contact's avatar indicates a new, unviewed story.
* **Interactive Widgets**: Create status slides featuring custom gradient backgrounds or local photos. Add mentions, locations, hashtags, or interactive Q&A sliders to gather feedback.
* **Direct Inbox Replies**: While viewing stories, you can type a comment reply. This sends your reply directly into your private chat thread with that contact, along with a context snippet of the story.

### 4. Seamless Voice & Video Calling
* ** Ringer Overlay System**: Tapping the call icons rings the recipient's device. Both devices show a blurred backdrop overlay showing the caller's avatar and a ringing notification, accompanied by a premium ringtone.
* **HD In-Call Toggles**: During calls, you can toggle your microphone or camera feed on and off, switch to screen sharing, or hang up. If a call is declined or missed, it is immediately logged in the **Calls** history tab.

### 5. Role-Based Communities & Channels
* **Discord-Style Channels**: Communities organize large group interactions into structured channel lists, preventing cluttered feeds.
* **Category Channels**: Channels are pre-categorized for clean communication:
  * **Announcements**: Broadcasters share important notifications; standard members are muted.
  * **General**: Standard open discussion panel.
  * **Q&A**: A specialized thread where users can ask questions and resolve answers.
  * **Media Hub**: Dedicated grid displaying all links, files, and photos shared inside the community.
  * **Voice Room**: Drop-in audio channel. Click it to immediately join a voice room and talk with other active members.

### 6. AI Copilot & Personal Settings
* **AI Copilot Sidebar**: Click the Sparkles icon to open the AI sidebar helper. It reviews the recent message history of the chat and provides quick bulleted summaries or facts checking.
* **Drafting Helpers**: Smart suggested replies appear as chips below your chat input for quick one-tap sending. You can also click the sparkles next to the input text field to translate your message or change its tone.
* **Session Manager & Blocking**: In the **Settings** panel, view details of all active logins. Revoke specific device logins remotely if you suspect unauthorized access. You can also toggle blocking for specific contacts to restrict them from messaging or calling you.

---

## Testing & Seeder Credentials

To help test the platform's multi-device real-time sync, WebRTC calls, and moderator capabilities, the database is preloaded with testing profiles:

* **Default Password for All Seeded Users**: `password123`
* **Seeded Sandbox Accounts**:
  * **Alice** (`alice@connect.chat` / Username: `alice`)
  * **Bob** (`bob@connect.chat` / Username: `bob`)
  * **Charlie** (`charlie@connect.chat` / Username: `charlie`)
  * **System Administrator** (`admin@connect.chat` / Username: `admin` — has moderator privileges to view the admin analytic panels)

*Tip: Open a normal browser tab and an Incognito window side-by-side to log in as Alice and Bob and test real-time features!*
