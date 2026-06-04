# 📋 User Stories & Sequence Diagrams

Complete catalog of user stories and sequence diagrams for the Collabryx AI networking platform. Organized by domain with actors, scenarios, and interaction flows.

---

## Table of Contents

- [Actors](#actors)
- [1. Authentication & Authorization](#1-authentication--authorization)
- [2. Onboarding](#2-onboarding)
- [3. Profile Management](#3-profile-management)
- [4. AI-Powered Matching](#4-ai-powered-matching)
- [5. Messaging & Real-time Chat](#5-messaging--real-time-chat)
- [6. Connections & Networking](#6-connections--networking)
- [7. Posts & Social Feed](#7-posts--social-feed)
- [8. AI Mentor & Assistant](#8-ai-mentor--assistant)
- [9. Notifications](#9-notifications)
- [10. Embedding Infrastructure](#10-embedding-infrastructure)
- [11. Settings & Account Management](#11-settings--account-management)
- [12. Landing Page & Public](#12-landing-page--public)
- [13. Security (Cross-cutting)](#13-security-cross-cutting)
- [14. Bookmarks](#14-bookmarks)
- [15. Billing (UI)](#15-billing-ui)
- [16. Help & Support](#16-help--support)
- [Master Summary](#master-summary)

---

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Unauthenticated user browsing the landing page |
| **User** | Authenticated user (Student, Founder, or Professional role) |
| **Admin** | Platform administrator with moderation and system management privileges |
| **System** | Automated processes (embedding worker, notification engine, feed scorer, circuit breaker) |

**Legend for Scenarios:**
- ✅ Happy path
- ⚠️ Edge case / warning
- ⛔ Error / blocked
- ⏳ Future / pending

---

## 1. Authentication & Authorization

**10 user stories · 6 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-01** | Email Registration | As a **Visitor**, I want to **create an account with email and password**, so that I can join the platform. | ✅ Valid email + strong password → Account created, verification email sent ⚠️ Weak password → Rejected with guidance ⛔ Duplicate email → "Account already exists" |
| **US-02** | OAuth Registration | As a **Visitor**, I want to **sign up using Google or GitHub**, so that I can skip manual form filling. | ✅ Click provider → OAuth consent → Account created, profile auto-populated ⚠️ OAuth consent denied → Return to register page ⛔ Provider error → Fallback message + suggest email sign-up |
| **US-03** | Email Sign-In | As a **Returning User**, I want to **sign in with email and password**, so that I can access my account. | ✅ Valid credentials → Dashboard ⚠️ Unverified email → Redirect to verification page ⛔ Wrong password 5x → Account temporarily locked |
| **US-04** | Email Verification | As a **New User**, I want to **verify my email via a link**, so that my account becomes fully active. | ✅ Click link → Email confirmed → Redirect to onboarding ⚠️ Expired link → "Resend verification" option ⛔ Already verified → Redirect to login |
| **US-05** | Password Reset | As a **User**, I want to **reset my forgotten password**, so that I can regain account access. | ✅ Enter email → Reset link sent → Set new password → Login ⚠️ Expired token → Request new link ⛔ Email not found → Generic message (security) |
| **US-06** | Session Persistence | As a **User**, I want to **stay logged in across browser sessions**, so that I don't sign in repeatedly. | ✅ Refresh token rotation → Session extended ⚠️ Token near expiry → Automatic refresh ⛔ Session revoked → Force re-login |
| **US-07** | Multi-Device Sessions | As a **User**, I want to **be signed in on multiple devices simultaneously**, so that I can switch between phone and desktop. | ✅ Sign in on phone → Both devices active ✅ Sign out on one → Only that session ends |
| **US-08** | Protected Route Access | As the **System**, I want to **redirect unauthenticated users to login**, so that protected resources remain secure. | ✅ Unauthenticated → /dashboard → Redirect to /login ✅ Authenticated → Dashboard renders ⚠️ Session expired mid-navigation → Graceful redirect |
| **US-09** | Role-Based RLS | As the **System**, I want to **enforce Row Level Security on every query**, so that users only access authorized data. | ✅ User queries own profile → Full data ✅ User queries another profile → Only public fields ⛔ Unauthorized table → Empty result |
| **US-10** | OAuth Account Linking | As a **User**, I want to **link multiple OAuth providers to my account**, so that I can sign in with any provider. | ✅ Settings → Link Google → OAuth flow → Linked ⛔ Already linked to another account → Error |

### Sequence Diagrams

**SD-01: Registration & Verification Flow**
```
Visitor → Register Form → Zod Validation → Supabase Auth SignUp
  → Email Verification Sent → User clicks link → /verify-email
  → Auth confirmed → Database Trigger → Profile row auto-created
  → Redirect to /onboarding
```

**SD-02: OAuth Registration/Login Flow**
```
Visitor → Click Provider → OAuth Consent → Callback (/api/auth/callback)
  → Supabase: Exchange code for session → Check if new user
  → [New] → Profile auto-created → /onboarding
  → [Existing] → Auth Sync → /dashboard
```

**SD-03: Password Reset Flow**
```
User → /forgot-password → Enter email → Supabase: send reset email
  → User clicks link → /reset-password?token=xxx → Token validation
  → [Valid] → New password → Supabase update → /login
  → [Expired] → "Link expired" → Offer resend
```

**SD-04: Session Lifecycle**
```
Browser Open → Supabase SSR Client → getSession() from cookies
  → [Valid] → User data loaded → App renders
  → [Expired] → Refresh token → New session
  → [Refresh fails] → Redirect to /login
  → onAuthStateChange → SIGNED_OUT → Clear state → Redirect
```

**SD-05: Middleware Protection Flow**
```
HTTP Request → middleware.ts → createServerClient → getSession()
  → [No session + /(auth)/*] → 302 Redirect to /login
  → [Session + /(public)/*] → 302 Redirect to /dashboard
  → [Session + /(auth)/*] → Pass through
```

**SD-06: RLS Query Enforcement**
```
Client Query → supabase.from('profiles').select() → Auth header attached
  → PostgreSQL: RLS policy evaluated → auth.uid() compared
  → [Policy: SELECT own] → Returns full row
  → [Policy: SELECT others] → Only public columns (id, name, headline, avatar)
  → [Policy: UPDATE] → Only if auth.uid() = id
```

---

## 2. Onboarding

**7 user stories · 3 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-11** | Multi-Step Wizard | As a **New User**, I want to **complete a 5-step onboarding wizard**, so that my profile is comprehensive. | ✅ Complete all 5 steps → Profile created → Embedding queued ⚠️ Abandon mid-way → Progress saved to localStorage |
| **US-12** | Role Selection | As a **New User**, I want to **select my role** (Student/Founder/Professional), so that the platform tailors my experience. | ✅ Select role → Subsequent steps adapt (Student → University, Founder → Startup stage) |
| **US-13** | Skills Selection | As a **New User**, I want to **add skills with proficiency levels**, so that matching finds complementary people. | ✅ Search/add skills → Set proficiency → Min 3 skills required ⚠️ <3 skills → Validation error |
| **US-14** | Experience Entry | As a **New User**, I want to **add work experience, education, and projects**, so that my background is visible. | ✅ Add role → Company → Duration → Description ✅ Multiple entries supported ⚠️ Invalid dates → Validation error |
| **US-15** | Form Persistence | As a **New User**, I want **onboarding progress saved automatically**, so that I don't lose data. | ✅ Close browser → Reopen → Resume at same step ⚠️ localStorage cleared → Restart |
| **US-16** | Onboarding Completion | As a **New User**, I want to **see a completion celebration and score**, so that I'm motivated to engage. | ✅ Complete Step 5 → Score display (0-100) → "Find Matches" CTA → Embedding triggered |
| **US-17** | Re-Onboarding | As a **User**, I want to **update onboarding answers via settings**, so that my profile evolves with my career. | ✅ Settings → Edit fields → Re-trigger embedding if bio/skills/goals changed |

### Sequence Diagrams

**SD-07: Onboarding Wizard Flow**
```
New User → /onboarding → Step 1 (Welcome + Avatar)
  → Step 2 (Full Name + Role + Headline + Bio)
  → Step 3 (Skills Picker with proficiency, min 3 required)
  → Step 4 (Experience: Work + Projects + Education)
  → Step 5 (Interests Picker + Goals text)
  → React Hook Form + Zod validation each step
  → localStorage persistence on every field change
  → Submit → Profile UPSERT → embedding_pending_queue INSERT
  → Redirect to /dashboard with celebration toast
```

**SD-08: Profile Auto-Creation Trigger**
```
auth.users INSERT → Database Trigger fires
  → INSERT INTO profiles (id, email, created_at, onboarding_completed=false)
  → Profile ready for onboarding
```

**SD-09: Re-Onboarding Update Flow**
```
User → Settings → Edit onboarding fields
  → Zod validation → Profile UPDATE
  → [Bio/skills/goals changed?] → constructSemanticText() → Queue embedding
  → [No semantic change] → Profile updated, no re-embedding needed
```

---

## 3. Profile Management

**9 user stories · 4 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-18** | View Own Profile | As a **User**, I want to **view my complete profile**, so that I can verify how others see me. | ✅ /my-profile → All sections visible ✅ See profile completion score |
| **US-19** | Edit Profile Fields | As a **User**, I want to **edit individual fields** (bio, headline, skills), so that info stays current. | ✅ Edit → Save → Updated → Embedding re-triggered if semantic ⚠️ Bio > 1000 chars → Validation error ⚠️ Headline > 140 chars → Warning |
| **US-20** | Avatar Upload | As a **User**, I want to **upload a profile avatar**, so that my profile is visually recognizable. | ✅ Select file → Client validation (JPEG/PNG/WebP, max 5MB) → Upload to Supabase Storage ⛔ File > 5MB → Rejected ⛔ Invalid format → Rejected |
| **US-21** | Banner Upload | As a **User**, I want to **upload a profile banner**, so that my profile stands out. | ✅ Same flow as avatar ⚠️ Remove → Default gradient shown |
| **US-22** | View Other Profiles | As a **User**, I want to **view another user's profile**, so that I can evaluate them before connecting. | ✅ Click match card → /profile/[id] → Skills, interests, experience ✅ Mutual connections count ⛔ Blocked user → Cannot view |
| **US-23** | Profile Verification | As a **User**, I want to **see verification badges on profiles**, so that I trust user identity. | ✅ Verified user → Badge (student/faculty/alumni) ⏳ Unverified → No badge |
| **US-24** | Profile Sharing | As a **User**, I want to **share my profile via a link**, so that I can network externally. | ✅ Copy profile link → Share → External visitor sees limited public view |
| **US-25** | Section Deletion | As a **User**, I want to **remove specific profile sections**, so that outdated info is cleaned up. | ✅ Remove skill → Optimistic UI update → Server sync ✅ Delete project entry → Removed |
| **US-26** | Profile Preview | As a **User**, I want to **preview my profile as others see it**, so that I ensure correct presentation. | ✅ Settings → "View as public" → Preview with limited fields |

### Sequence Diagrams

**SD-10: Profile View Flow**
```
User → /my-profile → Server Component: fetch full profile
  → Render: Avatar + Banner + Bio + Skills + Experience + Projects + Goals
  → Profile completion score (calculated from filled fields)
  → "Edit Profile" → /settings
```

**SD-11: Profile Edit Flow**
```
User → /settings → Profile tab
  → Edit field (bio/headline/skills) → React Hook Form
  → Zod validation → Supabase: UPDATE profiles SET ... WHERE id = auth.uid()
  → [Semantic fields changed] → constructSemanticText() → Queue embedding
  → [Avatar/Banner] → Supabase Storage upload → URL update
  → TanStack Query: invalidateQueries(['profile']) → Toast: "Profile updated"
```

**SD-12: Avatar Upload Flow**
```
User → Click avatar → File picker
  → Client: validate type + size
  → [Invalid] → Toast error, abort
  → Supabase Storage: upload to 'avatars/{userId}.{ext}' with upsert
  → Get public URL → UPDATE profiles SET avatar_url → Optimistic UI update
```

**SD-13: View Other Profile Flow**
```
User → Match card / Search → navigate(/profile/[id])
  → Server: fetch profile by ID, mutual connections count
  → RLS: returns public fields if not connected
  → Render: Profile header + Skills + Experience + Projects + Goals
  → "Connect" → Creates connection_request
  → [Already connected] → "Message" → Opens conversation
  → [Blocked] → "User unavailable"
```

---

## 4. AI-Powered Matching

**9 user stories · 5 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-27** | View Match Suggestions | As a **User**, I want to **see AI-ranked match suggestions**, so that I discover relevant collaborators. | ✅ Sorted by hybrid score (semantic 45% + skills 25% + interests 20% + reciprocity 10%) ✅ Cards: name, headline, %, top 3 common skills ⚠️ Empty → "Complete your profile" or "Check back soon" |
| **US-28** | Match Compatibility Breakdown | As a **User**, I want to **see WHY a match was suggested**, so that I understand the algorithm. | ✅ "Why this match?" → Modal: scores, common skills, shared interests, AI explanation |
| **US-29** | Accept / Dismiss Match | As a **User**, I want to **accept or dismiss suggestions**, so that I control my network. | ✅ Accept → Connection request → Notification ✅ Dismiss → Hidden → New suggestion surfaces ⚠️ "Undo" within 5s → Match restored |
| **US-30** | Semantic Search | As a **User**, I want to **search using natural language**, so that I find exactly who I need. | ✅ Type "React developer building fintech MVPs" → Query embedded → Cosine search → Results ⚠️ Query too short → "Be more specific" ⛔ No results > threshold → "Try different terms" |
| **US-31** | Filter Matches | As a **User**, I want to **filter by role, skills, interests, min%**, so that I narrow results. | ✅ Apply filters → Intersection logic ✅ Combine filters ⚠️ Zero results → "Broaden filters" |
| **US-32** | Update Match Preferences | As a **User**, I want to **set what I'm looking for**, so that matching aligns with my needs. | ✅ Update preferences → Match scores re-calculated ✅ Stored in match_preferences table |
| **US-33** | Match Quality Feedback | As a **User**, I want to **provide feedback on match quality**, so the algorithm improves. | ✅ "Not relevant" reasons → Thompson Sampling adjustment ✅ "Spam" selected → Flagged |
| **US-34** | Super-Like / Highlight | As a **User**, I want to **send a highlighted interest signal**, so the recipient knows I'm keen. | ✅ Super-like → ⭐ notification ✅ Limited: 3 per day |
| **US-36** | Match Refresh | As a **User**, I want to **manually refresh suggestions**, so I get new recommendations. | ✅ "Find New Matches" → Batch re-run → New suggestions ⚠️ Rate limited: 1 per 10 minutes |

### Sequence Diagrams

**SD-15: Match Generation Flow**
```
Profile Updated → constructSemanticText(profile)
  → embedding_pending_queue INSERT → Python Worker picks up
  → Sentence Transformers (all-MiniLM-L6-v2, 384-dim)
  → pgvector UPSERT → Realtime: 'embedding_ready'
  → Trigger batch match generation:
    1. Cosine similarity (pgvector HNSW index)
    2. Filter: not connected/requested/blocked
    3. Hybrid scores (semantic + skills + interests + reciprocity)
    4. INSERT INTO match_suggestions
  → User sees new match cards
```

**SD-16: Match Card Interaction Flow**
```
User → Dashboard / /matches → Fetch suggestions ORDER BY score DESC
  → Glass card: avatar, name, headline, %, common skills
  → Tap card → Full profile preview
  → "Why Match?" → Score breakdown + AI explanation
  → [Accept] → INSERT connection_request → Notification → Card removed
  → [Dismiss] → UPDATE status='dismissed' → Card removed
  → [Super-like] → Accept + highlighted notification + decrement quota
  → [Undo] → 5s window → Restore last dismissed
```

**SD-17: Semantic Search Flow**
```
User → Matches → "Semantic Search" dialog
  → Type query → Debounce 500ms → POST /api/search/semantic
  → Query text → Python Worker embed → pgvector cosine search
  → Results: profiles ranked by similarity > 0.5 threshold
  → Cards with match % and connection action
```

**SD-18: Match Filtering Flow**
```
User → Matches → Filter drawer
  → Select: role, minMatch%, skills
  → Client-side filter + Server-side query with WHERE clauses
  → Results update in real-time
  → [Zero results] → "No matches" + "Clear filters" button
```

**SD-19: Match Feedback Loop**
```
User dismisses match → "Tell us why" optional prompt
  → Reasons: Wrong role / Wrong skills / Not interesting / Spam
  → Feedback stored → Thompson Sampling parameters updated
  → Similar profiles deprioritized
```

---

## 5. Messaging & Real-time Chat

**9 user stories · 4 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-37** | Send Message | As a **User**, I want to **send messages in real-time**, so that we can collaborate instantly. | ✅ Type → Enter → Optimistic render → Supabase INSERT → Realtime broadcast ⚠️ Empty message → Disabled |
| **US-38** | Receive Messages | As a **User**, I want to **receive messages in real-time**, so that conversations flow naturally. | ✅ New message → Appears at bottom → Scroll into view ✅ Received while away → Badge on sidebar ⛔ From blocked user → Not delivered |
| **US-39** | Typing Indicators | As a **User**, I want to **see when others are typing**, so that I know they're engaged. | ✅ Other user types → "User is typing…" ✅ Stops → Indicator gone after 3s idle |
| **US-40** | Read Receipts | As a **User**, I want to **know when messages are read**, so that I can track communication. | ✅ Sent → "Sent" ✅ Recipient views → "Read" + timestamp |
| **US-41** | Conversation List | As a **User**, I want to **see all conversations with previews**, so that I can quickly navigate. | ✅ Sidebar: sorted by most recent ✅ Preview: last message + time ✅ Unread badge ⚠️ Empty → "No conversations yet" |
| **US-42** | Message Search | As a **User**, I want to **search within conversations**, so that I can find past discussions. | ✅ Search bar → Keyword → Messages highlighted → Jump to result ⚠️ No results → "No messages found" |
| **US-43** | Delete Conversation | As a **User**, I want to **delete or leave conversations**, so that I can clean up my list. | ✅ Swipe → Delete → Confirm → Hidden from list ⚠️ Messages NOT deleted for other participant |
| **US-44** | Message Pagination | As a **User**, I want to **load older messages on scroll**, so that I can review full history. | ✅ Scroll to top → Load more → Older messages appended ✅ "Jump to bottom" button when scrolled up |
| **US-45** | Online Status | As a **User**, I want to **see if connections are online**, so that I know availability. | ✅ Green dot: active in last 5 min ✅ Gray dot: offline ⚠️ User can hide status in privacy settings |

### Sequence Diagrams

**SD-20: Real-time Messaging Flow**
```
User A → Type → Enter → Optimistic: message appears (pending)
  → Supabase: INSERT INTO messages
  → Realtime: INSERT broadcast to conversation channel
  → User B's client: on('INSERT') → Add message → Mark unread if not viewing
  → User A's client: confirmed → Status: "Sent"
  → User B opens → UPDATE is_read=true → Read receipt broadcast
  → User A sees: "Read 2:30 PM"
```

**SD-21: Typing Indicator Flow**
```
User B types → onKeyDown → Throttled broadcast (every 2s):
  channel.send({ event: 'typing', payload: { userId } })
  → User A's client: on('typing') → "User B is typing…"
  → Idle 3s → Timer expires → Hide indicator
```

**SD-22: Conversation Lifecycle**
```
Connection accepted → INSERT conversation (participants: [A, B])
  → Appears in both sidebars
  → First message → updated_at → Sort order
  → Messages exchanged → History builds
  → User deletes → UPDATE deleted_for = [userId] → Hidden
  → [Both delete] → Soft-delete, data retained
```

**SD-23: Message Search Flow**
```
User → Chat → Search bar → Type keyword
  → Client: filter loaded OR Server: SELECT WHERE content ILIKE '%keyword%'
  → Results highlighted → Click → Scroll to position
```

---

## 6. Connections & Networking

**7 user stories · 3 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-46** | Send Connection Request | As a **User**, I want to **send connection requests**, so that I can build my network. | ✅ "Connect" on profile → Request sent → "Pending" → Notification ⚠️ Already sent → "Request pending" ⛔ Blocked → Cannot send |
| **US-47** | Accept Request | As a **User**, I want to **accept incoming requests**, so that I grow my curated network. | ✅ /requests → Received → Accept → Connection created → Conversation auto-created ✅ Bulk accept |
| **US-48** | Decline Request | As a **User**, I want to **decline unwanted requests**, so that my network stays curated. | ✅ Decline → Request removed ✅ "Decline + Block" option |
| **US-49** | View Connections | As a **User**, I want to **see all active connections**, so that I can browse my network. | ✅ /connections → Grid/list → Sort by: recent/name/role ✅ Search within ✅ Click → Profile/Chat |
| **US-50** | Remove Connection | As a **User**, I want to **remove connections**, so that my network reflects current relationships. | ✅ "Remove" → Confirm → Connection deleted → Conversation archived ⚠️ Other user NOT notified |
| **US-51** | View Pending Sent | As a **User**, I want to **see requests I've sent**, so that I can track outreach. | ✅ /requests → Sent tab → Pending status + time since sent ✅ Cancel pending |
| **US-52** | Block User | As a **User**, I want to **block another user**, so they cannot contact or view me. | ✅ Profile → "…" → Block → Confirm → blocked_users INSERT ⛔ Blocked: cannot send requests, messages, view private profile ⚠️ Unblock via Settings |

### Sequence Diagrams

**SD-24: Connection Request Lifecycle**
```
User A → Profile → "Connect"
  → Check: not connected, not blocked, no pending request
  → INSERT connection_request (sender=A, receiver=B, status='pending')
  → Notification Engine: sendNotification(B, 'connection_request', { from: A })
  → Button: "Pending ✓"

  User B → /requests → Received → See request
  → [Accept] → Status='accepted' → INSERT connection + conversation
    → Notification to A: "B accepted!"
  → [Decline] → Status='rejected' → Removed
  → [Block] → Decline + INSERT blocked_users
```

**SD-25: Connection Management Flow**
```
User → /connections → Fetch active connections
  → Grid: avatar, name, headline, connected_since
  → Click → /profile/[id] or /messages/[conversationId]
  → "Remove" → Confirm → DELETE connection → Archive conversation
  → Search: filter by name/role/skills
  → Sort: recent / alphabetical / role
```

**SD-26: Blocking Flow**
```
User → Profile → "…" → "Block User"
  → Confirm: "Blocked users cannot message or see full profile"
  → INSERT blocked_users → DELETE pending requests between them
  → RLS: blocked user denied private fields
  → Unblock: Settings → Blocked Users → "Unblock" → DELETE
```

---

## 7. Posts & Social Feed

**10 user stories · 5 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-53** | Create Post | As a **User**, I want to **create posts with intent tags**, so that I reach the right audience. | ✅ Dashboard → Create → Select type (Project Launch/Teammate Request/Announcement/General) + intent (Cofounder/Teammate/MVP/FYP) → Write → Attach files → Publish ⚠️ Empty → Validation ⚠️ >5000 chars → Warning |
| **US-54** | Personalized Feed | As a **User**, I want a **feed ranked by my interests**, so that I discover relevant content first. | ✅ Dashboard → Thompson Sampling + semantic similarity + recency decay + social boosts ✅ Infinite scroll ⚠️ Cold start → Popular content until preferences learned |
| **US-55** | Post Reactions | As a **User**, I want to **react to posts** (Like/Love/Celebrate/Insightful/Curious), so that I engage with nuance. | ✅ Click reaction → Applied → Counter updated → Author notified ⚠️ Click again → Toggle off |
| **US-56** | Comment on Posts | As a **User**, I want to **comment on posts**, so that I can participate in discussions. | ✅ Post → Comment input → Submit → Comment appears ✅ Author notified ⚠️ Empty → Disabled |
| **US-57** | Threaded Replies | As a **User**, I want to **reply to comments in threads**, so that conversations stay organized. | ✅ Comment → "Reply" → Nested input → Indented reply ✅ N-level nesting ⚠️ Deleted parent → Replies hidden but preserved |
| **US-58** | Edit / Delete Post | As a **User**, I want to **edit or delete my posts**, so that I can correct or remove content. | ✅ "…" → Edit → Modify → Save ✅ Delete → Confirm → Soft-delete (archive) ⛔ Cannot edit others' posts |
| **US-59** | Bookmark Post | As a **User**, I want to **bookmark posts**, so that I can save interesting content. | ✅ Post → Bookmark icon → Saved to /bookmarks ✅ Un-bookmark → Remove |
| **US-60** | Pin Post | As a **User**, I want to **pin important posts to my profile**, so visitors see key announcements. | ✅ Post → "…" → Pin → Top of profile ✅ Unpin → Normal position |
| **US-61** | Post Attachments | As a **User**, I want to **attach images and files to posts**, so that I share rich content. | ✅ Create → Attach image (≤10MB) / file (≤20MB) → Upload → Preview ⚠️ Invalid type → Rejected |
| **US-62** | Share Post | As a **User**, I want to **copy a shareable post link**, so that I can share externally. | ✅ Share button → Copy link → Share → External visitor sees public view |

### Sequence Diagrams

**SD-27: Post Creation Flow**
```
User → Dashboard → "Create Post" → Modal
  → Select type (Project Launch / Teammate Request / Announcement / General)
  → Select intent (Cofounder / Teammate / MVP / FYP)
  → Write content → [Optional] Attach files → POST /api/upload → Supabase Storage
  → Submit: Zod validation → INSERT posts → Feed Scorer indexes
  → Appears in followers' feeds
```

**SD-28: Personalized Feed Scoring**
```
User visits dashboard → POST /api/feed/score
  → Feed Scorer:
    1. Fetch Thompson Sampling params
    2. Fetch recent posts (7 days)
    3. Calculate: semantic similarity + recency decay + social boost + exploration/exploitation
    4. Rank by composite score → Return top N
  → Client: ranked post cards → Infinite scroll → Load next page
  → Interactions update Thompson Sampling params
```

**SD-29: Threaded Comments Flow**
```
User → Post → Comments section
  → Top-level comments loaded (paginated: 20/page)
  → Write comment → Submit → INSERT (parent_id=NULL)
  → Reactions: Like/Love/Celebrate/Insightful → INSERT comment_reactions
  → Reply: Click "Reply" → Nested input → Submit → INSERT parent_id=comment.id
  → Indented rendering (max 3 levels, then "View thread")
  → Real-time: new comments via Supabase Realtime
```

**SD-30: Post Engagement Flow**
```
User sees post → Actions:
  → Reaction (5 types) → Toggle → Counter updated → Server sync
  → Comment → Opens section → Write → Submit
  → Bookmark → INSERT/REMOVE → Icon toggled
  → Share → Copy link → Share count++
  → Report → "…" → Report Content dialog → Flagged
  Each action → Activity tracked → Feed scorer updated
```

**SD-31: Post Lifecycle**
```
Post created → Author's profile + followers' feeds
  → Author edits → Content updated → "edited" flag
  → Author deletes → Soft delete (archive) → Hidden
  → [Admin] hard delete violating posts
  → Analytics: views, reactions, comments, shares tracked
```

---

## 8. AI Mentor & Assistant

**8 user stories · 4 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-63** | Chat with AI Mentor | As a **User**, I want to **chat with an AI mentor that knows my profile**, so that I get personalized guidance. | ✅ /ai-mentor → Type question → AI responds with profile context ✅ Streaming (SSE) ✅ Session history |
| **US-64** | Startup Planning | As a **Founder**, I want **AI guidance on MVP checklist, Lean Canvas, startup stages**, so I can validate ideas. | ✅ Describe idea → AI: MVP checklist → Lean Canvas → Stage advice ⚠️ Vague → AI asks clarifying questions |
| **US-65** | Collaboration Advice | As a **User**, I want **AI advice on collaborating with specific users**, so I form effective partnerships. | ✅ Provide multiple user contexts → AI analyzes skill complementarity → Suggests approaches |
| **US-66** | Session Management | As a **User**, I want to **create, view, and archive AI sessions**, so that I can organize coaching. | ✅ New session → Named → History persisted ✅ Archive old → Clean up ✅ Reopen archived |
| **US-67** | Save AI Output | As a **User**, I want to **save AI-generated content to my profile**, so that I can reference it. | ✅ AI action items → "Save" → Stored in user_projects ✅ AI MVP checklist → Save as project |
| **US-68** | Streaming Responses | As a **User**, I want **AI text to stream in real-time**, so that I get immediate feedback. | ✅ Type → Response streams via SSE character-by-character ⚠️ Connection lost → Auto-reconnect |
| **US-69** | Provider Failover | As the **System**, I want to **auto-switch AI providers on failure**, so the mentor stays available. | ✅ Primary (OpenAI) fails → Secondary (Anthropic) → Tertiary (Groq/Together/Ollama) ⛔ All fail → "AI unavailable" |
| **US-70** | Multi-Provider Config | As an **Admin**, I want to **configure AI providers and priorities**, so we optimize cost and quality. | ✅ Env vars: AI_PROVIDER_N_TYPE, AI_PROVIDER_N_API_KEY, AI_PROVIDER_N_PRIORITY |

### Sequence Diagrams

**SD-32: AI Mentor Chat Flow**
```
User → /ai-mentor → Create/select session
  → Type message → POST /api/ai/stream
  → Context Assembler: fetch profile + skills + interests + goals
  → [Startup mode] + startupContext (idea, stage, industry)
  → [Collaboration mode] + multiUserContext
  → System prompt constructed → Provider Registry: get highest priority healthy provider
  → Stream via SSE → Client renders character by character
  → Save: INSERT ai_mentor_messages → Update session.updated_at
```

**SD-33: Startup Planning Flow**
```
User → AI Mentor → "Help me plan my fintech startup"
  → AI detects startup intent → Activates startupContext
  → Asks: What problem? Target users? Current stage?
  → User answers → Context assembled
  → AI generates:
    1. MVP Checklist (prioritized)
    2. Lean Canvas (problem, solution, UVP, channels, revenue, costs, metrics)
    3. Next Steps (actionable, with deadlines)
  → "Save to Profile" → CREATE user_project with AI data
  → Session: continue, iterate, follow-ups
```

**SD-34: Provider Failover Flow**
```
Request → providerRegistry.getProvider()
  → Try Primary (priority=1, OpenAI)
  → [Success] → Response
  → [RateLimitError] → Check retryAfterMs → Wait
  → [TimeoutError] → Mark degraded
  → Try Secondary (priority=2, Anthropic)
  → [Success] → Response
  → [Failure] → Try Tertiary (priority=3, Groq)
  → [All failed] → AllProvidersFailedError → "AI unavailable"
  → Background: health check → Restore providers
```

**SD-35: RAG Pipeline**
```
User query → Context Assembler → fetch profile(s)
  → Vector Retriever: embed query → search KB chunks
  → Session Summarizer: fetch history → summarize
  → Startup Prompts: if startup mode → load prompts
  → Assemble: [system prompt + profile + KB chunks + history + query]
  → Send to AI provider → Stream response
```

---

## 9. Notifications

**6 user stories · 3 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-71** | Real-time Notifications | As a **User**, I want **instant notifications for key events**, so I stay informed. | ✅ Events: connection request, message, like, comment ✅ Bell badge ✅ Realtime via Supabase broadcast |
| **US-72** | Notification Management | As a **User**, I want to **view, read, and delete notifications**, so I manage my inbox. | ✅ Click bell → dropdown → Click → Navigate + auto mark read ✅ "Mark all read" ✅ "Delete all read" |
| **US-73** | Notification Preferences | As a **User**, I want to **customize which notifications I receive**, so I control volume. | ✅ Settings → Per-type toggle: Connect/Message/Like/Comment/System/Match ✅ Per-channel: In-app / Email |
| **US-74** | Daily Digest | As the **System**, I want to **send daily email digests**, so users stay engaged offline. | ✅ Cron: aggregate → Summary email → Send ⚠️ No notifications → Skip |
| **US-75** | Notification Cleanup | As the **System**, I want to **auto-delete notifications >30 days**, so the DB stays lean. | ✅ Cron: DELETE WHERE created_at < 30 days AND is_read = true |
| **US-76** | Bulk Notifications | As the **System**, I want to **send notifications to multiple users**, so announcements scale. | ✅ Admin triggers → sendBulkNotifications(recipientIds, payload) → Batched INSERT |

### Sequence Diagrams

**SD-36: Notification Delivery Flow**
```
Event (B comments on A's post) → Notification Engine
  → verifyCallerAuthorization() → INSERT notification
  → Realtime: broadcast INSERT to user's channel
  → A's client: on('INSERT') → Unread count++ → Bell badge
  → Click bell → Fetch notifications ORDER BY created_at DESC
  → Click → navigate(resourceUrl) → Mark read
```

**SD-37: Notification Preferences**
```
User → Settings → Notifications tab
  → Fetch notification_preferences
  → Toggles:
    - Connection requests: [In-app: ON] [Email: ☐]
    - New messages: [In-app: ON] [Email: ☐]
    - Post likes: [In-app: ON] [Email: ☐]
    - Post comments: [In-app: ON] [Email: ☐]
    - System: [In-app: ON] [Email: ☑]
    - New matches: [In-app: ON] [Email: ☑]
  → Toggle → UPSERT → Immediate effect
```

**SD-38: Digest & Cleanup**
```
Cron (daily, 8 AM UTC) → POST /api/notifications/digest
  → SELECT unread per user (since last digest)
  → Group by type → Summary text
  → Filter by email preferences → Send via Supabase
  → POST /api/notifications/cleanup
  → DELETE WHERE created_at < 30 days AND is_read
  → Log to audit_logs
```

## 10. Embedding Infrastructure

**5 user stories · 3 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-82** | Generate Embeddings | As the **System**, I want to **generate 384-dim embeddings from profiles**, so that matching works. | ✅ Profile updated → constructSemanticText() → Python Worker → Sentence Transformers → pgvector UPSERT |
| **US-83** | Rate Limiting | As the **System**, I want to **limit to 3 requests/user/hour**, so the worker isn't overwhelmed. | ✅ Rate limiter → Allowed ✅ Rate limited → 429 → Queue deferred ⚠️ Admin override available |
| **US-84** | Dead Letter Queue | As the **System**, I want to **auto-retry failed embeddings 3x**, so profiles are searchable. | ✅ Fail → DLQ → Retry 1 → Retry 2 → Retry 3 → Manual needed |
| **US-85** | DLQ Admin Dashboard | As an **Admin**, I want to **view and retry failed embeddings**, so I can resolve persistent failures. | ✅ Admin panel → DLQ entries → Failure reason → "Retry" / "Retry All" |
| **US-86** | Embedding Status | As a **User**, I want to **see embedding generation status**, so I know matching availability. | ✅ Realtime: queued → processing → completed / failed ✅ Profile page shows status |

### Sequence Diagrams

**SD-41: Embedding Generation**
```
Profile updated → constructSemanticText(profile)
  → Rate limit check (3/hr/user) → [Exceeded] → 429
  → INSERT embedding_pending_queue → Python Worker polls
  → SentenceTransformer('all-MiniLM-L6-v2').encode(text) → 384-dim
  → Normalize → UPSERT profile_embeddings
  → [Success] → Status='completed' → Realtime: 'embedding_ready'
  → [Error] → INSERT embedding_dead_letter_queue
```

**SD-42: DLQ Retry**
```
Embedding fails → DLQ: { user_id, error, retry_count: 0, next_retry_at }
  → Retry Worker: SELECT WHERE next_retry_at <= NOW()
  → Attempt 1 → [Success] → Delete DLQ entry ✅
  → [Fail] → retry_count=1, next_retry_at = NOW() + 5min
  → Attempt 2 → [Success] → Done ✅
  → [Fail] → retry_count=2, next_retry_at = NOW() + 15min
  → Attempt 3 → [Success] → Done ✅
  → [Fail] → retry_count=3 → needs_manual_review → Admin intervenes
```

**SD-43: Status Monitoring**
```
User profile → useEffect: subscribe embedding_status channel
  → useEmbeddingQueueStatus(userId) → Initial status fetch
  → Realtime: on UPDATE to queue entry
  → Status: queued ⏳ → processing 🔄 → completed ✅ → failed ⚠️
```

## 11. Settings & Account Management

**6 user stories · 3 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-91** | Privacy Settings | As a **User**, I want to **control who sees my profile, email, connections**, so I maintain privacy. | ✅ /privacy → Toggle: profile visibility (public/connections/private), email, connections list ✅ Data download, search engine opt-out |
| **US-92** | Blocked Users | As a **User**, I want to **view and manage blocked users**, so I can reverse blocks. | ✅ Settings → Blocked Users → List with unblock ✅ Unblock → Can reconnect |
| **US-93** | Notification Prefs | As a **User**, I want to **toggle notification types and channels**, so I control volume. | ✅ Per-type toggles → Per-channel (In-app/Email) |
| **US-94** | Theme Preference | As a **User**, I want to **switch dark/light mode**, so the interface matches my preference. | ✅ Toggle → next-themes → Instant apply ✅ Persisted to DB ✅ System-default option |
| **US-95** | Delete Account | As a **User**, I want to **permanently delete my account**, so my data is removed. | ✅ Settings → Multi-step confirmation → Cascade delete all data → Redirect to landing ⚠️ "Are you sure? This cannot be undone." |
| **US-96** | Data Download | As a **User**, I want to **download all my data**, so that I have a personal copy. | ✅ Privacy settings → "Download my data" → Generate archive → Email link when ready |

### Sequence Diagrams

**SD-46: Privacy Settings**
```
User → /privacy → Fetch privacy_settings
  → Toggles: Profile visibility / Email / Connection list / Activity status
  → Toggle → UPSERT → RLS enforcement updated immediately
  → "Download my data" → Background job → ZIP → Email link
```

**SD-47: Account Deletion**
```
User → Settings → "Delete Account"
  → Step 1: Warning → "This is permanent. All data will be deleted."
  → Step 2: "Type DELETE to confirm"
  → Step 3: Enter password
  → Cascade delete: messages, conversations, requests, connections,
    embeddings, posts, comments, notifications,
    ai_mentor data, profile, auth user
  → Redirect / → Toast: "Account deleted"
```

**SD-48: Theme Toggle**
```
User → Header → AnimatedThemeToggler
  → next-themes: setTheme('dark' | 'light' | 'system')
  → CSS variables updated → Glassmorphism tier adjusted
  → UPSERT theme_preferences → Persisted
```

---

## 12. Landing Page & Public

**5 user stories · 2 sequence diagrams**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-97** | Explore Features | As a **Visitor**, I want to **scroll an engaging landing page**, so I understand the platform's value. | ✅ Hero (3D) → Problem → Features → Personas → Score Demo → Comparison → AI Preview → Stats → CTA |
| **US-98** | Interactive Demos | As a **Visitor**, I want **interactive demonstrations**, so I trust the technology. | ✅ 3D WebGL globe ✅ Animated match score ✅ Traditional vs semantic comparison ✅ AI mentor preview |
| **US-99** | Persona-Specific | As a **Visitor**, I want **role-specific use cases**, so I know the platform fits me. | ✅ Tabs: Student (teammates, FYP) / Founder (cofounders, adopters) / Professional (mentoring, networking) |
| **US-100** | Mobile Responsive | As a **Mobile Visitor**, I want **full responsiveness**, so I can browse on any device. | ✅ Mobile: stacked, simplified animations ✅ Tablet: adapted grid ✅ Optimized 3D for mobile |
| **US-101** | Quick Registration | As a **Visitor**, I want to **register from any landing section**, so I don't lose my place. | ✅ Sticky CTA ✅ Multiple CTA placements ✅ Direct to /register with return URL |

### Sequence Diagrams

**SD-49: Landing Page Journey**
```
Visitor → / → 1. Hero (3D viewer) → 2. Problem Statement
  → 3. Feature Cards → 4. Persona Use Cases (tabs)
  → 5. Compatibility Score Showcase → 6. Semantic Engine Comparison
  → 7. AI Mentor Preview → 8. Stats counters → 9. Final CTA → /register
```

**SD-50: 3D Interactive Elements**
```
Page load → Check WebGL support + memory
  → [High-end] Full 3D: R3F + GSAP + Lenis smooth scroll
  → [Mid-range] Simplified: fewer particles, reduced animations
  → [Low-end/Mobile] Static fallback, no 3D
  → Cobe Globe: auto-rotate + drag + zoom + markers
  → Mesh Gradient: animated CSS background
```

---

## 13. Security (Cross-cutting)

**5 system stories · 3 sequence diagrams**

### System Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **SYS-01** | Bot Detection | Analyze User-Agent, headless browser signatures, known bot patterns on every request. | ✅ Bot detected → Block/Challenge ✅ Legit → Pass through |
| **SYS-02** | CSRF Protection | Validate CSRF tokens on all mutations with session-bound, auto-rotated tokens. | ✅ Token valid → Pass ✅ Invalid/missing → 403 |
| **SYS-03** | Rate Limiting | Tiered limits: General 100/15min, Auth 10/15min, Upload 5/min, Embeddings 3/hr/user. | ✅ Within limit → Pass ⛔ Exceeded → 429 + Retry-After |
| **SYS-04** | Input Validation | Zod schemas on all inputs with HTML sanitization for user-generated content. | ✅ Valid → Pass ⛔ Invalid → 400 + error details |
| **SYS-05** | Circuit Breaker | Prevent cascade failures with CLOSED/OPEN/HALF-OPEN state transitions. | ✅ Service healthy → CLOSED ⛔ 5 failures in 60s → OPEN → Fallback → Half-open probe → Recover or remain open |

### Sequence Diagrams

**SD-51: Request Security Pipeline**
```
HTTP Request → Middleware
  → 1. Bot Detection → [Bot] → 403
  → 2. CSRF Validation → [Invalid] → 403
  → 3. Rate Limiting → [Exceeded] → 429 + Retry-After
  → 4. Zod Validation → [Invalid] → 400 + details
  → 5. RLS (Supabase) → Policy enforced
  → 6. Response + Secure Headers → Client
```

**SD-52: Circuit Breaker**
```
Service call → circuitBreaker.call(serviceFn)
  → State CLOSED → Execute
    → [Success] → Success counter++ → Return
    → [Failure] → Failure counter++ → Threshold (5 in 60s)? → OPEN + timeout 30s
  → State OPEN → Fallback immediately
    → [Timeout expires] → HALF-OPEN
  → State HALF-OPEN → Probe request
    → [Success] → CLOSED + reset counters
    → [Failure] → OPEN + reset timeout
```

**SD-53: Audit Logging**
```
User action → auditLogger.log(action, userId, resource, id, metadata, ip, ua)
  → INSERT audit_logs
  → Admin queries for investigation
  → Retention: auto-purge > 90 days
```

---

## 14. Bookmarks

**3 user stories · 1 sequence diagram**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-102** | Bookmark Post | As a **User**, I want to **bookmark any post**, so I can save it for later. | ✅ Post → Bookmark icon → Toggle on → Saved ✅ Visual feedback (icon fills) |
| **US-103** | View Bookmarks | As a **User**, I want to **see all bookmarked posts**, so I can find saved content. | ✅ /bookmarks → Grid/list sorted by date ✅ Click → Post ✅ Un-bookmark from list |
| **US-104** | Remove Bookmarks | As a **User**, I want to **remove unneeded bookmarks**, so my list stays relevant. | ✅ Individual remove from list ✅ Future: collections/folders |

### Sequence Diagrams

**SD-54: Bookmark Flow**
```
User → Post → Click bookmark icon
  → INSERT user_bookmarks (user_id, post_id)
  → Icon: outline → filled ✅
  → /bookmarks → SELECT posts JOIN bookmarks ORDER BY bookmarked_at DESC
  → Click → Navigate to post
  → Un-bookmark: DELETE → Icon: filled → outline
```

---

## 15. Billing (UI)

**3 user stories · 1 sequence diagram**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-105** | View Current Plan | As a **User**, I want to **see my subscription plan**, so I know my features. | ✅ /settings/billing → Current plan: Free/Pro ✅ Feature comparison |
| **US-106** | Upgrade Plan | As a **User**, I want to **upgrade to Pro**, so I access premium features. | ✅ "Upgrade to Pro" → [Future: payment integration] ⏳ Currently: UI mock |
| **US-107** | Billing History | As a **User**, I want to **see payment history and invoices**, so I track expenses. | ✅ Invoice list → [Future: downloadable PDFs] |

### Sequence Diagrams

**SD-55: Billing View Flow**
```
User → /settings/billing → Fetch plan info
  → Current plan card + feature list
  → "Upgrade to Pro" → [Future] Payment flow
  → Payment methods → [Future] Manage cards
  → Invoice history → [Future] Download PDFs
```

---

## 16. Help & Support

**3 user stories · 1 sequence diagram**

### User Stories

| ID | Title | Story | Key Scenarios |
|----|-------|-------|---------------|
| **US-108** | Knowledge Base | As a **User**, I want to **search the KB for help articles**, so I find answers. | ✅ /help → Search → Results ✅ Topic cards: KB, Forum, Email, Live Chat |
| **US-109** | Terms & Policies | As a **User**, I want to **view ToS and Privacy Policy**, so I understand the rules. | ✅ /terms → Full ToS ✅ /privacy → Full privacy policy |
| **US-110** | Contact Support | As a **User**, I want to **contact the support team**, so I get help with issues. | ✅ /help → "Email Support" → [Future: contact form / email] ✅ "Live Chat" → [Future: chat widget] |

### Sequence Diagrams

**SD-56: Help Center Flow**
```
User → /help → Search bar + topic cards
  → Type query → Filter KB articles → Results with previews
  → Click card:
    - Knowledge Base → Article list → Full article
    - Community Forum → [Future: Discord/Discourse]
    - Email Support → [Future: support@collabryx.com / form]
    - Live Chat → [Future: chat widget]
```

---

## Master Summary

### Totals

| # | Domain | User Stories | Sequence Diagrams |
|---|--------|:-----------:|:-----------------:|
| 1 | Authentication & Authorization | 10 | 6 |
| 2 | Onboarding | 7 | 3 |
| 3 | Profile Management | 9 | 4 |
| 4 | AI-Powered Matching | 9 | 5 |
| 5 | Messaging & Real-time Chat | 9 | 4 |
| 6 | Connections & Networking | 7 | 3 |
| 7 | Posts & Social Feed | 10 | 5 |
| 8 | AI Mentor & Assistant | 8 | 4 |
| 9 | Notifications | 6 | 3 |
| 10 | Embedding Infrastructure | 5 | 3 |
| 11 | Settings & Account | 6 | 3 |
| 12 | Landing Page & Public | 5 | 2 |
| 13 | Security (System) | 5 | 3 |
| 14 | Bookmarks | 3 | 1 |
| 15 | Billing (UI) | 3 | 1 |
| 16 | Help & Support | 3 | 1 |
| **TOTAL** | | **105** | **51** |

### By Priority

| Priority | Count | Description |
|----------|:-----:|-------------|
| **P0 — Core** | 39 | Auth, Onboarding, Profile, Matching, Messaging, Connections |
| **P1 — Engagement** | 30 | Posts/Feed, AI Mentor, Notifications |
| **P2 — Platform** | 21 | Embedding, Settings, Landing, Bookmarks, Billing, Help |
| **P3 — System** | 15 | Security, Circuit Breaker, Rate Limiting, RLS, Audit, DLQ |

### By Actor

| Actor | Stories |
|-------|:-------:|
| Visitor | 8 |
| User | 69 |
| Admin | 6 |
| System | 22 |

---

**Last Updated**: 2026-06-05  
**Version**: 1.1.0

[← Back to Architecture](../02-architecture/overview.md)
