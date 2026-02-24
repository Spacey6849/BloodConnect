export type FAQ = {
  q: string
  a: string
  keywords?: string[]
}

export const faqs: FAQ[] = [
  {
    q: 'What is this platform about?',
    a: 'BloodConnect helps donors, blood banks, and hospitals coordinate blood donations and fulfill urgent requests efficiently.'
  },
  {
    q: 'How does donor matching work?',
    a: 'We use blood type compatibility and proximity to match donors to hospitals or banks. Donor verification and availability help ensure safe, timely donations.'
  },
  {
    q: 'Who can register as a donor?',
    a: 'Healthy adults (typically 18–60) who meet medical criteria can register. Local guidelines may vary. Always consult screening instructions before donating.'
  },
  {
    q: 'What is the universal blood type?',
    a: 'O negative (O−) is considered the universal donor for red cells. AB positive (AB+) is the universal recipient.'
  },
  {
    q: 'How can I request blood urgently?',
    a: 'Hospitals can create emergency requests from their dashboard. The system notifies nearby banks and eligible donors for rapid response.'
  },
  // About the platform
  {
    q: 'How does BloodConnect work end to end?',
    a: 'Hospitals post emergency requests, nearby blood banks respond, hospitals accept a response, then use stock and mark delivery. Donors discover banks and donate to help replenish supply.',
    keywords: ['overview', 'flow', 'lifecycle', 'how it works', 'process']
  },
  {
    q: 'What roles are supported?',
    a: 'Donor, Blood Bank, Hospital, and NGO organizers. Each role has tailored dashboards and permissions.',
    keywords: ['roles', 'permissions', 'accounts']
  },
  {
    q: 'Is there a map of nearby resources?',
    a: 'Yes, the dashboard includes a map that shows nearby banks, hospitals, and donors with privacy rules applied.',
    keywords: ['map', 'leaflet', 'nearby', 'location']
  },
  {
    q: 'Do I need to enable location services?',
    a: 'It helps. Location improves recommendations and proximity-based notifications, but you can also set a saved location in your profile.',
    keywords: ['geolocation', 'GPS', 'permissions']
  },
  {
    q: 'Which browsers are supported?',
    a: 'Modern browsers like Chrome, Edge, Firefox, and Safari are supported. For best results, use the latest version.',
    keywords: ['browser', 'support']
  },
  // Accounts & authentication
  {
    q: 'How do I sign up as a donor?',
    a: 'Click Sign Up, choose Donor, fill in your details and location, then verify your email if prompted.',
    keywords: ['register', 'create account', 'donor signup']
  },
  {
    q: 'How do hospitals or banks get access?',
    a: 'Authorized staff should sign up with the Hospital or Blood Bank role. Admins may verify your organization before granting full access.',
    keywords: ['hospital signup', 'bank signup', 'verification']
  },
  {
    q: 'I forgot my password. What do I do?',
    a: 'Use the Forgot Password link on the login page to request a reset email.',
    keywords: ['password', 'reset', 'forgot']
  },
  {
    q: 'Can I change my role later?',
    a: 'Contact support or an administrator. For security, role changes may require verification.',
    keywords: ['change role', 'switch role']
  },
  {
    q: 'Why do I see limited features?',
    a: 'Role-based access controls limit features to your role. Switch accounts or request the correct role if needed.',
    keywords: ['rbac', 'permissions', 'access denied']
  },
  // Donor experience
  {
    q: 'How do I find a place to donate?',
    a: 'Open the Donate page to see nearby blood banks on the map and their availability. Pick a bank and follow on-screen steps.',
    keywords: ['donate', 'nearby banks', 'map']
  },
  {
    q: 'How often can I donate blood?',
    a: 'Typical guidance is every 8–12 weeks depending on local regulations and your health. Always follow medical advice.',
    keywords: ['frequency', 'eligibility', 'interval']
  },
  {
    q: 'How do I know if I am eligible to donate?',
    a: 'The Donate page shows a next-eligible date and common criteria. Final eligibility is determined at screening.',
    keywords: ['eligible', 'screening', 'requirements']
  },
  {
    q: 'Can I schedule a donation?',
    a: 'Some banks accept appointments. Use the contact info provided after selecting a bank or walk in if allowed.',
    keywords: ['appointment', 'schedule']
  },
  {
    q: 'Will I get reminders to donate again?',
    a: 'If you enable notifications, we may send reminders when you are eligible again or when nearby hospitals need your type.',
    keywords: ['reminder', 'notifications']
  },
  {
    q: 'Can I hide my name from blood banks?',
    a: 'Yes. Banks can notify donors through the platform without seeing donor names on the map, protecting your privacy.',
    keywords: ['privacy', 'anonymity', 'map']
  },
  {
    q: 'How are my donations tracked?',
    a: 'When you record a donation, it updates your history and contributes to the leaderboard and impact metrics.',
    keywords: ['history', 'records', 'leaderboard']
  },
  {
    q: 'Can I delete my donor account?',
    a: 'Yes. You can request account deletion from settings or by contacting support. Some records may be retained where required by law.',
    keywords: ['delete account', 'gdpr', 'privacy']
  },
  {
    q: 'How do I set or update my blood type?',
    a: 'Edit your profile and select your blood type. If unknown, leave it blank and update after testing.',
    keywords: ['profile', 'blood type', 'settings']
  },
  {
    q: 'Why don’t I see any nearby banks?',
    a: 'Check location permissions, or set a saved location in your profile. Zoom out on the map to broaden the search.',
    keywords: ['nearby', 'no results', 'location']
  },
  {
    q: 'Do you support plasma or platelet donations?',
    a: 'The current release focuses on whole blood units. Plasma and platelets are on the roadmap.',
    keywords: ['plasma', 'platelets', 'components']
  },
  {
    q: 'Can I get a donation certificate?',
    a: 'Some banks provide certificates. After recording a donation, use the bank’s provided contact to request one.',
    keywords: ['certificate', 'proof']
  },
  {
    q: 'How do I opt out of notifications?',
    a: 'In settings, disable email or push notifications. You can also remove the Expo push token by logging out from mobile.',
    keywords: ['opt out', 'unsubscribe', 'push', 'email']
  },
  // Hospital requests & approvals
  {
    q: 'How do hospitals create an emergency request?',
    a: 'From the Requests page, click New Request, enter blood type, units, urgency, and optional location address.',
    keywords: ['create request', 'emergency', 'hospital']
  },
  {
    q: 'How are banks notified of a new request?',
    a: 'Nearby blood banks are notified via email and push (if configured). NGOs may also be notified.',
    keywords: ['notify', 'email', 'push']
  },
  {
    q: 'What is a bank response?',
    a: 'A bank can respond to your request indicating available units. Responses appear under Recommended Banks and Fulfillments.',
    keywords: ['respond', 'response', 'fulfillment']
  },
  {
    q: 'When can I approve a bank response?',
    a: 'The Approve action appears after the bank has responded. Approving marks that response as accepted by your hospital.',
    keywords: ['approve', 'accept', 'gating']
  },
  {
    q: 'Why can’t I approve yet?',
    a: 'Approval is hidden until a bank actually responds to your request. Wait for a response or contact banks directly.',
    keywords: ['approve', 'hidden', 'not visible']
  },
  {
    q: 'How do I use stock from an accepted bank?',
    a: 'Click Use on the accepted bank. The overlay shows its inventory by blood type. Select a compatible type and units, then confirm.',
    keywords: ['use stock', 'overlay', 'inventory']
  },
  {
    q: 'Can I pick a different but compatible blood type?',
    a: 'Yes. The Use overlay highlights compatible types and lets you choose any available compatible type, not just the requested one.',
    keywords: ['compatible', 'selection', 'type']
  },
  {
    q: 'Why is the units field clamped?',
    a: 'Units are limited to the available quantity for the selected blood type to prevent over-allocation.',
    keywords: ['units', 'quantity', 'limit']
  },
  {
    q: 'What prevents double deduction of stock?',
    a: 'The backend detects undelivered fulfillments and avoids decrementing inventory multiple times for the same request/bank.',
    keywords: ['double deduction', 'merge', 'fulfillment']
  },
  {
    q: 'How do I mark a fulfillment as delivered?',
    a: 'On the fulfillments list, click Deliver when the units arrive. Delivered units count toward your request progress.',
    keywords: ['deliver', 'received', 'mark delivered']
  },
  {
    q: 'When can I approve the overall request?',
    a: 'After at least one delivery, you can approve the request to finalize and record donation history.',
    keywords: ['approve request', 'finalize', 'complete']
  },
  {
    q: 'Can I cancel a request?',
    a: 'Yes, pending requests can be cancelled from the request details page.',
    keywords: ['cancel', 'withdraw', 'close']
  },
  {
    q: 'How are request statuses tracked?',
    a: 'Requests track units needed, units fulfilled, and status (pending/fulfilled/cancelled).',
    keywords: ['status', 'progress', 'tracking']
  },
  {
    q: 'Why do completed requests disappear from the list?',
    a: 'The default view hides completed requests to keep focus on active cases. Toggle filters to show all.',
    keywords: ['filter', 'completed', 'hidden']
  },
  // Blood bank inventory & responses
  {
    q: 'How do banks manage inventory?',
    a: 'Banks update quantities per blood type with expiry dates in the Inventory section. The system uses atomic updates.',
    keywords: ['inventory', 'manage', 'expiry']
  },
  {
    q: 'What happens when a bank responds to a request?',
    a: 'The bank indicates available units. If the hospital accepts and uses stock, inventory is decremented per selected type.',
    keywords: ['response', 'availability', 'decrement']
  },
  {
    q: 'Can responses be merged?',
    a: 'Yes. Duplicate pending fulfillments for the same request/bank and type are merged to avoid duplicates.',
    keywords: ['merge', 'duplicate', 'fulfillment']
  },
  {
    q: 'How is compatibility enforced at the bank?',
    a: 'UI disables incompatible types and the API validates compatibility on use to prevent errors.',
    keywords: ['compatibility', 'validation']
  },
  {
    q: 'Can banks see donor identities?',
    a: 'No, donor names are not shown to banks on the map. Banks can notify donors through the platform.',
    keywords: ['privacy', 'donor visibility']
  },
  {
    q: 'How do banks get notified when hospitals accept?',
    a: 'Banks receive in-app notifications and may get email or push notifications if configured.',
    keywords: ['notify', 'accept', 'email', 'push']
  },
  {
    q: 'Can banks organize blood camps?',
    a: 'Yes, NGOs and banks can publish camps. Details are sent to NGOs and nearby donors via email/push when created.',
    keywords: ['camps', 'events', 'ngo']
  },
  {
    q: 'How do expiry dates affect usage?',
    a: 'Older inventory should be used first. The UI shows expiries and the bank manages rotations to minimize waste.',
    keywords: ['expiry', 'fifo', 'wastage']
  },
  {
    q: 'What if the requested type is out of stock?',
    a: 'Hospitals can choose a compatible alternative type from the bank’s available inventory.',
    keywords: ['out of stock', 'alternative', 'compatible']
  },
  // Compatibility matrix
  {
    q: 'Which blood types are compatible with O+ recipients?',
    a: 'O+ recipients can receive O+ and O− blood.',
    keywords: ['compatibility', 'O+', 'recipient']
  },
  {
    q: 'Which blood types are compatible with O− recipients?',
    a: 'O− recipients can receive only O− blood.',
    keywords: ['compatibility', 'O−', 'recipient']
  },
  {
    q: 'Which blood types are compatible with A+ recipients?',
    a: 'A+ recipients can receive A+, A−, O+, and O−.',
    keywords: ['compatibility', 'A+', 'recipient']
  },
  {
    q: 'Which blood types are compatible with A− recipients?',
    a: 'A− recipients can receive A− and O−.',
    keywords: ['compatibility', 'A−', 'recipient']
  },
  {
    q: 'Which blood types are compatible with B+ recipients?',
    a: 'B+ recipients can receive B+, B−, O+, and O−.',
    keywords: ['compatibility', 'B+', 'recipient']
  },
  {
    q: 'Which blood types are compatible with B− recipients?',
    a: 'B− recipients can receive B− and O−.',
    keywords: ['compatibility', 'B−', 'recipient']
  },
  {
    q: 'Which blood types are compatible with AB+ recipients?',
    a: 'AB+ recipients can receive all blood types and are considered universal recipients.',
    keywords: ['compatibility', 'AB+', 'recipient']
  },
  {
    q: 'Which blood types are compatible with AB− recipients?',
    a: 'AB− recipients can receive AB−, A−, B−, and O−.',
    keywords: ['compatibility', 'AB−', 'recipient']
  },
  // Notifications
  {
    q: 'What kinds of notifications are sent?',
    a: 'In-app notifications are always created. Optional email and push notifications can be enabled for requests and camps.',
    keywords: ['notifications', 'email', 'push', 'in-app']
  },
  {
    q: 'How do I enable push notifications?',
    a: 'Log in from a device that supports Expo push and allow notifications. Your Expo push token is saved to your profile.',
    keywords: ['expo', 'push', 'token']
  },
  {
    q: 'Emails are not arriving. What can I check?',
    a: 'Verify your SMTP settings in environment variables and check your spam folder.',
    keywords: ['smtp', 'email', 'not receiving']
  },
  {
    q: 'Can I mute notifications for a specific request?',
    a: 'Currently, notifications are global per channel. Per-request mutes are planned.',
    keywords: ['mute', 'per request']
  },
  {
    q: 'Do NGOs get notified of new requests?',
    a: 'Yes, NGOs may receive email/push summaries so they can help coordinate donors and camps.',
    keywords: ['ngo', 'notify']
  },
  {
    q: 'Are notification failures blocking?',
    a: 'No. The core action succeeds even if email/push fails; errors are logged for review.',
    keywords: ['non-blocking', 'fail']
  },
  // Map & geospatial
  {
    q: 'How do you determine nearby banks or donors?',
    a: 'We use PostGIS proximity queries around your set or detected location.',
    keywords: ['nearby', 'postgis', 'radius']
  },
  {
    q: 'Why is my location inaccurate?',
    a: 'Browser geolocation can vary indoors. Set a precise saved location in your profile as a fallback.',
    keywords: ['location', 'accuracy']
  },
  {
    q: 'Can I search other areas on the map?',
    a: 'Yes. Pan and zoom the map; nearby results update based on the current center.',
    keywords: ['map', 'pan', 'zoom']
  },
  {
    q: 'Do you show live traffic or ETAs?',
    a: 'Not currently. You can open addresses in your preferred maps app to view traffic conditions.',
    keywords: ['traffic', 'eta']
  },
  {
    q: 'Why are donor names hidden on the map?',
    a: 'To protect donor privacy. Banks and hospitals can still notify donors through the platform.',
    keywords: ['privacy', 'map', 'donor names']
  },
  // Camps and NGOs
  {
    q: 'How do I create a blood donation camp?',
    a: 'NGOs or banks can create camps with name, time, and location. Nearby donors may be notified.',
    keywords: ['create camp', 'event', 'donation camp']
  },
  {
    q: 'How are donors notified about camps?',
    a: 'Nearby donors (based on coordinates) can receive email/push with camp details.',
    keywords: ['camp', 'notify donors']
  },
  {
    q: 'Can I edit or cancel a camp?',
    a: 'Yes, organizers can edit details or cancel a camp from the camp page.',
    keywords: ['camp', 'edit', 'cancel']
  },
  {
    q: 'What details are shown for a camp?',
    a: 'Camps include name, date/time, organizer, and address. Contact info may be included.',
    keywords: ['camp details', 'address', 'time']
  },
  {
    q: 'Do NGOs have a special dashboard?',
    a: 'Yes, NGOs see events and relevant notifications to help coordinate donors.',
    keywords: ['ngo dashboard', 'organizer']
  },
  {
    q: 'Can donors RSVP to a camp?',
    a: 'RSVP is not required in the current version. You can attend directly or contact the organizer.',
    keywords: ['rsvp', 'attendance']
  },
  // Leaderboard & impact
  {
    q: 'How does the Top Donors leaderboard work?',
    a: 'It ranks donors by total donation count, with engagement as a tie-breaker. Data is aggregated from donation history and metrics views.',
    keywords: ['leaderboard', 'top donors', 'ranking']
  },
  {
    q: 'Where do the impact metrics come from?',
    a: 'They are computed from the database (donation history, donors, requests) and shown via a server-side widget.',
    keywords: ['impact', 'metrics', 'widget']
  },
  {
    q: 'Why am I not on the leaderboard yet?',
    a: 'You need at least one recorded donation or a non-zero donation count in your profile.',
    keywords: ['leaderboard', 'not listed']
  },
  {
    q: 'Do delivered units count immediately in impact?',
    a: 'Yes. When fulfillments are marked delivered, totals update and may affect impact metrics.',
    keywords: ['delivered', 'impact update']
  },
  {
    q: 'Can I filter the leaderboard by blood type?',
    a: 'Not yet. Filters like blood type and region are planned for a future release.',
    keywords: ['filter', 'leaderboard', 'blood type']
  },
  {
    q: 'Is there a badge or recognition for frequent donors?',
    a: 'We are exploring badges and milestones to encourage repeat donations.',
    keywords: ['badge', 'milestone', 'gamification']
  },
  // Security, privacy, and data
  {
    q: 'How is my data protected?',
    a: 'We use database row-level security and server-side access controls. Sensitive actions require authenticated sessions.',
    keywords: ['security', 'rls', 'auth']
  },
  {
    q: 'Do you share my contact information?',
    a: 'Your contact details are not shared publicly. Banks can notify donors without seeing their personal info.',
    keywords: ['privacy', 'contact', 'sharing']
  },
  {
    q: 'Can I download my data?',
    a: 'You can request an export of your profile and donation history via support.',
    keywords: ['export', 'data', 'download']
  },
  {
    q: 'How long do you retain records?',
    a: 'Retention follows legal and operational requirements. Some records may be anonymized over time.',
    keywords: ['retention', 'policy']
  },
  {
    q: 'Is email required?',
    a: 'An email is recommended for password recovery and notifications, but some features work with in-app notifications only.',
    keywords: ['email', 'required']
  },
  {
    q: 'Can I use two-factor authentication?',
    a: 'Two-factor auth is not yet available. It is planned for a future update.',
    keywords: ['2fa', 'mfa']
  },
  {
    q: 'How do I report inaccurate data?',
    a: 'Use the feedback link or contact support with details. We will review and correct records as needed.',
    keywords: ['report', 'incorrect', 'support']
  },
  {
    q: 'Do you support multiple languages?',
    a: 'The current UI is in English. Localization is on the roadmap.',
    keywords: ['i18n', 'localization', 'languages']
  },
  // Troubleshooting
  {
    q: 'Why do I see a Dynamic server usage warning on build?',
    a: 'Some API routes read cookies for auth. The warning is expected and not an error.',
    keywords: ['build', 'dynamic server usage', 'warning']
  },
  {
    q: 'Use overlay shows no inventory. What should I check?',
    a: 'Ensure the bank has inventory rows with quantity > 0 and the correct bank ID. Try another bank if none are available.',
    keywords: ['use overlay', 'no inventory']
  },
  {
    q: 'I cannot see Approve button for a response.',
    a: 'Approve is hidden until a bank responds. Wait for a response; then Approve appears in the bank row.',
    keywords: ['approve', 'button', 'not showing']
  },
  {
    q: 'Units keep resetting when I change the type in Use overlay.',
    a: 'The units field reclamps to the selected type’s available quantity to prevent overuse.',
    keywords: ['units', 'clamp', 'reset']
  },
  {
    q: 'Email sending fails.',
    a: 'Verify SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and FROM_EMAIL in your environment. Check provider logs.',
    keywords: ['smtp', 'email', 'env']
  },
  {
    q: 'Push notifications are not received.',
    a: 'Make sure your device registered an Expo push token and notifications are enabled. Check network or device settings.',
    keywords: ['expo', 'push', 'token', 'not receiving']
  },
  {
    q: 'Map is blank or slow.',
    a: 'Check network connectivity and browser console for map tile errors. Try refreshing or using a different browser.',
    keywords: ['map', 'tiles', 'slow']
  },
  {
    q: 'Leaderboard shows empty.',
    a: 'Ensure donation history exists or donor counts are set. Apply database schema including metrics view and index.',
    keywords: ['leaderboard', 'empty', 'schema']
  },
  {
    q: 'I cannot log in.',
    a: 'Verify your email and password, reset if necessary, and ensure your role is correct. Check if cookies are enabled.',
    keywords: ['login', 'auth', 'cookies']
  },
  {
    q: 'Why do bank emails go to spam?',
    a: 'Configure proper SPF/DKIM/DMARC for your sender domain and use a reputable SMTP provider.',
    keywords: ['spam', 'email deliverability', 'smtp']
  },
  {
    q: 'How do I test notifications in development?',
    a: 'Use a test SMTP service for emails and an Expo device or simulator for push. Check server logs for failures.',
    keywords: ['dev', 'test', 'notifications']
  },
  {
    q: 'Why can’t I see donors on the map?',
    a: 'Donor names are hidden for privacy. Only approximate locations or counts may be visible to certain roles.',
    keywords: ['donor', 'map', 'hidden']
  },
  // Deployment and environment
  {
    q: 'Which environment variables are required?',
    a: 'NEXT_PUBLIC_BASE_URL, DATABASE_URL (or Supabase URL and Service Key), and SMTP settings for email. Push is optional.',
    keywords: ['env', 'variables', 'configuration']
  },
  {
    q: 'How do I run the app on Windows?',
    a: 'From the webapp folder: npm install; npm run dev. For production: npm run build; npm run start.',
    keywords: ['windows', 'powershell', 'run']
  },
  {
    q: 'What database features are needed?',
    a: 'PostgreSQL with PostGIS and pgcrypto. Apply db/schema.sql to create tables, RLS, triggers, and views.',
    keywords: ['postgres', 'postgis', 'schema']
  },
  {
    q: 'Do I need Supabase?',
    a: 'You can use Supabase for convenient Postgres access and RLS policies, or point to your own Postgres with equivalent setup.',
    keywords: ['supabase', 'database']
  },
  {
    q: 'How do I deploy behind a proxy?',
    a: 'Set NEXT_PUBLIC_BASE_URL to your public URL so server-side fetches build absolute links.',
    keywords: ['deploy', 'proxy', 'base url']
  },
  // Extra practical questions
  {
    q: 'What is the minimum unit size?',
    a: 'Units are tracked as integer counts of standard whole blood units per type.',
    keywords: ['unit', 'size']
  },
  {
    q: 'Can I track individual blood bags?',
    a: 'The current model aggregates by type. Per-bag tracking is possible with schema changes planned for the future.',
    keywords: ['bag', 'traceability']
  },
  {
    q: 'How do I update my organization details?',
    a: 'Organization admins can edit profile details from the settings page.',
    keywords: ['organization', 'settings', 'profile']
  },
  {
    q: 'Can multiple hospitals coordinate on one request?',
    a: 'Each request belongs to a single hospital account. You can create separate requests and reference the same case if needed.',
    keywords: ['multi hospital', 'collaboration']
  },
  {
    q: 'Is there audit logging?',
    a: 'Yes. Significant events like responses, approvals, and deliveries are recorded in activity/history tables.',
    keywords: ['audit', 'history', 'logs']
  },
  {
    q: 'What time zone is used?',
    a: 'Timestamps are stored in UTC and displayed in your local time zone in the UI.',
    keywords: ['timezone', 'utc', 'local']
  },
  {
    q: 'How do I contact support?',
    a: 'Use the Help link in the footer or the Feedback option in your profile menu to submit an issue.',
    keywords: ['support', 'help', 'contact']
  },
  {
    q: 'Can I export request reports?',
    a: 'Basic exports are planned. For now, copy the table or use the API endpoints to generate custom reports.',
    keywords: ['export', 'reports', 'api']
  },
  {
    q: 'Do you validate addresses?',
    a: 'Addresses are stored as provided. Geocoding may be applied if coordinates are given for proximity features.',
    keywords: ['address', 'geocode', 'location']
  },
  {
    q: 'How do I change notification preferences?',
    a: 'Open Settings and toggle email or push notifications according to your preference.',
    keywords: ['notifications', 'settings', 'preferences']
  },
  {
    q: 'What happens if a bank overstates stock?',
    a: 'Inventory is decremented atomically on use. If stock is insufficient, the operation fails and the hospital is notified.',
    keywords: ['stock', 'insufficient', 'atomic']
  },
  {
    q: 'Can I attach documents to a request?',
    a: 'Attachments are not supported in the current version.',
    keywords: ['attachments', 'documents']
  },
  {
    q: 'How do I correct a mistaken delivery?',
    a: 'Contact an administrator. Edits to delivered fulfillments may require admin review for audit integrity.',
    keywords: ['delivery', 'correction', 'admin']
  },
  {
    q: 'Can notifications include directions or maps?',
    a: 'Emails include addresses and links you can open in your maps app. Deep links for directions are planned.',
    keywords: ['directions', 'maps', 'links']
  },
  {
    q: 'Do banks get a dashboard of pending requests?',
    a: 'Yes. Banks see nearby or assigned requests and can respond directly from their dashboard.',
    keywords: ['bank dashboard', 'pending requests']
  },
  {
    q: 'How are hospitals ranked in recommendations for banks?',
    a: 'Priority is based on urgency, proximity, and stock fit. Details may evolve over time.',
    keywords: ['ranking', 'recommendations', 'priority']
  },
  {
    q: 'Can I resend a request notification?',
    a: 'You can update the request or contact banks directly. Automatic re-notification may occur when details change.',
    keywords: ['resend', 'notify', 'update']
  },
  {
    q: 'Does the system support cold chain tracking?',
    a: 'Not yet. Cold chain tracking requires per-unit logistics integration planned for later.',
    keywords: ['cold chain', 'temperature']
  },
  {
    q: 'How do I verify a donor?',
    a: 'Use the donor verification action in the donors list if you are authorized. Verification status appears in donor profiles.',
    keywords: ['verify donor', 'verification']
  },
  {
    q: 'What if I entered the wrong blood type in my profile?',
    a: 'Update your profile with the correct type. Banks and hospitals rely on accurate typing for safety.',
    keywords: ['wrong type', 'update profile']
  },
  {
    q: 'Can hospitals search banks by stock?',
    a: 'Hospitals see recommended banks with stock summaries relevant to their request.',
    keywords: ['search', 'stock', 'recommendations']
  },
  {
    q: 'Are there API endpoints for integration?',
    a: 'Yes, the app provides REST endpoints for requests, fulfillments, donors, and inventory. See the API routes section.',
    keywords: ['api', 'integration', 'endpoints']
  },
  {
    q: 'How can NGOs collaborate with hospitals?',
    a: 'NGOs receive notifications for new requests and camps, helping coordinate donors and resources.',
    keywords: ['ngo', 'collaboration']
  },
  {
    q: 'What is the difference between Approve response and Approve request?',
    a: 'Approve response accepts a specific bank’s offer. Approve request finalizes the overall request after deliveries.',
    keywords: ['approve response', 'approve request', 'difference']
  },
  {
    q: 'Does the system support negative stock?',
    a: 'No. Inventory decrements are validated; operations fail if requested units exceed available stock.',
    keywords: ['negative stock', 'validation']
  },
  {
    q: 'How do I update bank hours and contact details?',
    a: 'Bank admins can edit organization profile details from settings to show accurate hours and contact info.',
    keywords: ['bank profile', 'hours', 'contact']
  },
  {
    q: 'Can hospitals see bank contact information?',
    a: 'Yes. Accepted responses show contact details to coordinate pickup or delivery.',
    keywords: ['contact', 'coordination']
  },
  {
    q: 'How are deliveries recorded?',
    a: 'When a hospital marks a fulfillment delivered, the system timestamps the event and updates request progress.',
    keywords: ['deliveries', 'timestamp', 'progress']
  },
  {
    q: 'Do you support multiple facilities per hospital account?',
    a: 'A single account represents a hospital organization. Multi-facility support can be modeled via location data and teams.',
    keywords: ['multi site', 'organization']
  },
  {
    q: 'Can I upload a logo for my organization?',
    a: 'Yes, organization settings may allow uploading a logo for display across the dashboard.',
    keywords: ['logo', 'branding']
  },
  {
    q: 'How do request priorities work?',
    a: 'Urgency levels affect sorting and notifications to encourage faster responses for critical cases.',
    keywords: ['priority', 'urgent', 'critical']
  },
  {
    q: 'Is there an audit for who approved or delivered?',
    a: 'Yes. The system captures actor and timestamps for approvals and deliveries.',
    keywords: ['audit', 'actor', 'timestamp']
  },
  {
    q: 'Can I print a summary of a request?',
    a: 'Printing from the browser provides a quick summary. A dedicated export is planned.',
    keywords: ['print', 'summary']
  },
  {
    q: 'How does the system handle partial deliveries?',
    a: 'Multiple fulfillments can contribute to a single request; each delivery adds to the total units fulfilled.',
    keywords: ['partial', 'multiple deliveries']
  },
  {
    q: 'What if a delivery fails to arrive?',
    a: 'Do not mark it delivered. You may use another bank’s response or contact the bank to resolve the issue.',
    keywords: ['failed delivery', 'not delivered']
  },
  {
    q: 'Where can I see all fulfillments for a request?',
    a: 'Open the request details; the Fulfillments tab lists all responses, acceptances, and delivery states.',
    keywords: ['fulfillments', 'list', 'details']
  }
]

export function findFAQ(query: string): FAQ | null {
  const q = query.toLowerCase().trim()
  // Direct match
  const exact = faqs.find(f => f.q.toLowerCase() === q)
  if (exact) return exact
  // Keyword contains match
  const scored = faqs
    .map(f => {
      const hay = (f.q + ' ' + (f.keywords || []).join(' ')).toLowerCase()
      let score = 0
      q.split(/\s+/).forEach(w => {
        if (w && hay.includes(w)) score += 1
      })
      return { f, score }
    })
    .sort((a, b) => b.score - a.score)
  return scored[0]?.score ? scored[0].f : null
}
