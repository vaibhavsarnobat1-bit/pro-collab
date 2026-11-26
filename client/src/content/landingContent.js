// ─────────────────────────────────────────────────────────────
//  Single typed content source for the Pro-Collab landing page.
//  Sections import from here; no copy is hardcoded in layout.
// ─────────────────────────────────────────────────────────────

export const brand = {
  name: 'Pro-Collab',
  wordmark: 'Collab',
  demo: 'A calm workspace for teams that ship.',
};

export const nav = {
  links: [
    { id: 'product', label: 'Product' },
    { id: 'how', label: 'How it works' },
    { id: 'customers', label: 'Customers' },
    { id: 'projects', label: 'Projects' },
  ],
  signIn: 'Sign in',
  cta: 'Get started',
};

export const hero = {
  badge: { text: 'Now in public beta', arrow: true },
  title1: 'A workspace that',
  titleGradient: 'keeps its calm',
  title2: 'as your team ships.',
  subtitle:
    'A shared editor, live preview, chat and video — together in one quiet room. No noise, no churn, just the work.',
  ctaPrimary: 'Get started',
  ctaSecondary: 'See how it works',
  footnote: 'Free for up to 10 people. No card required.',
};

export const logoCloud = {
  eyebrow: 'Built into every Pro-Collab room',
  names: ['Shared Editor', 'Socket.IO Sync', 'WebRTC Video', 'Live Preview', 'AI Assistant', 'Live Cursors', 'Room Chat', 'Instant Rooms'],
  items: [
    { label: 'Shared Editor', sub: 'Monaco-powered', icon: 'code', color: '#ff7a45' },
    { label: 'Socket.IO Sync', sub: 'Sub-50ms patches', icon: 'sync', color: '#8b5cf6' },
    { label: 'WebRTC Video', sub: 'Docked room calls', icon: 'video', color: '#06b6d4' },
    { label: 'Live Preview', sub: 'Instant render', icon: 'preview', color: '#10b981' },
    { label: 'AI Assistant', sub: 'Inline pair help', icon: 'ai', color: '#f59e0b' },
    { label: 'Live Cursors', sub: 'See every edit', icon: 'cursor', color: '#ec4899' },
    { label: 'Room Chat', sub: 'In-context threads', icon: 'chat', color: '#3b82f6' },
    { label: 'Instant Rooms', sub: 'One-click invite', icon: 'share', color: '#14b8a6' },
  ],
};

export const features = {
  eyebrow: 'Features',
  heading: 'A shared room where the code, the call and the preview live together.',
  description: 'Everything your team needs to build in one live workspace — so real work can happen.',
  cards: [
    {
      title: 'Shared code editor',
      description: 'Write side by side — watch collaborators’ cursors move in real time as you type.',
      visual: 'code',
    },
    {
      title: 'Built-in video calls',
      description: 'Talk through the work in a call docked right next to the editor.',
      visual: 'call',
    },
    {
      title: 'Instant live preview',
      description: 'See your app run as you save — preview updates on every change.',
      visual: 'preview',
    },
    {
      title: 'AI pair assistance',
      description: 'Get inline help and suggestions without leaving your flow.',
      visual: 'ai',
    },
  ],
};

export const howItWorks = {
  eyebrow: 'How it works',
  heading: 'From blank page to shipped, in three quiet steps.',
  steps: [
    { num: '01', title: 'Import what you have', body: 'Bring in an existing folder or start from a template.' },
    { num: '02', title: 'Shape the week', body: 'Plan, edit and review alongside your code.' },
    { num: '03', title: 'Ship and learn', body: 'Preview live, get feedback, and move forward.' },
  ],
};

export const showcase = {
  eyebrow: 'Showcase',
  heading: 'One surface for the whole flow.',
  tabs: [
    { id: 'editor', label: 'Live Editor' },
    { id: 'preview', label: 'Instant Preview' },
    { id: 'collab', label: 'Call, Chat & AI' },
  ],
  editor: {
    file: 'src/Workspace.jsx',
    room: 'room/team-sync',
    lines: [
      { num: 1, tokens: [{ t: 'import ', c: 'var(--violet)' }, { t: '{ useRoom } ', c: 'var(--lp-fg)' }, { t: 'from ', c: 'var(--violet)' }, { t: "'@pro-collab/sync'", c: 'var(--cyan)' }] },
      { num: 2, tokens: [{ t: 'export function ', c: 'var(--violet)' }, { t: 'CollabRoom', c: 'var(--brand)' }, { t: '({ id }) {', c: 'var(--lp-fg)' }] },
      { num: 3, tokens: [{ t: '  const ', c: 'var(--violet)' }, { t: '{ files, peers } = ', c: 'var(--lp-fg)' }, { t: 'useRoom', c: 'var(--cyan)' }, { t: '(id)', c: 'var(--lp-fg)' }] },
      { num: 4, tokens: [{ t: '  return ', c: 'var(--violet)' }, { t: '<Editor ', c: 'var(--brand)' }, { t: 'files={files} peers={peers} />', c: 'var(--lp-fg)' }] },
      { num: 5, tokens: [{ t: '}', color: 'var(--lp-fg)', c: 'var(--lp-fg)' }] },
    ],
  },
  preview: {
    url: 'localhost:3000/room/team-sync',
    logs: [
      { text: '✓ Socket connected · 3 peers active', color: 'var(--cyan)' },
      { text: '✓ Hot-reloaded Workspace.jsx in 14ms', color: 'var(--brand)' },
      { text: '✓ Live preview synced across room', color: '#7ae582' },
    ],
  },
  collab: {
    peers: [
      { name: 'Aria', role: 'Speaking', color: 'var(--brand)', speaking: true },
      { name: 'Noah', role: 'Editing App.jsx', color: 'var(--violet)', speaking: false },
      { name: 'Maya', role: 'In preview', color: 'var(--cyan)', speaking: false },
    ],
    messages: [
      { sender: 'Aria', text: 'Pushed the debounced socket patch.', color: 'var(--brand)' },
      { sender: 'AI Assistant', text: 'Added error boundary & auto-reconnect to useRoom.', color: 'var(--violet)' },
      { sender: 'Noah', text: 'Looks clean on live preview — ready to ship!', color: 'var(--cyan)' },
    ],
  },
};

export const metrics = {
  items: [
    { value: 12000, suffix: '+', label: 'rooms live' },
    { value: 3.2, decimals: 1, suffix: 's', label: 'median join time' },
    { value: 41, suffix: '%', label: 'faster code reviews' },
    { value: 99.99, decimals: 2, suffix: '%', label: 'uptime' },
  ],
};

export const testimonials = [
  { quote: 'We review code inside the editor now — no tab switching, no context loss.', name: 'Aria Chen', role: 'Engineering Lead, Northwind', color: 'var(--brand)' },
  { quote: 'The live preview means the design handoff is just a link.', name: 'Noah Patel', role: 'Product, Vertex', color: 'var(--violet)' },
  { quote: 'Cursors moving in real time made pairing genuinely fun again.', name: 'Maya Singh', role: 'Design, Lumen', color: 'var(--cyan)' },
  { quote: 'Reports finally reflect what actually shipped, not what we planned.', name: 'Leo Martin', role: 'Data, Halcyon', color: '#b388ff' },
  { quote: 'Onboarding a new engineer is one invite instead of a week of setup.', name: 'Zara Iqbal', role: 'People, Fathom', color: '#4cc9f0' },
  { quote: 'One calm room replaced our whole toolchain — and it sticks.', name: 'Kai Nakamura', role: 'Founder, Orbital', color: '#7ae582' },
];

export const projects = {
  eyebrow: 'Projects',
  heading: 'Every plan, one calm place.',
  description: 'Rooms that hold your files, tasks and conversations together — so the whole project moves like one piece.',
  cards: [
    {
      name: 'Product launch',
      tag: 'Growth',
      members: ['AC', 'NP', 'MS'],
      progress: 72,
      status: 'In review',
      note: '12 tasks left this week.',
    },
    {
      name: 'Mobile app',
      tag: 'Engineering',
      members: ['LM', 'ZI', 'KN'],
      progress: 48,
      status: 'Shipping',
      note: 'Preview branch is live.',
    },
    {
      name: 'Brand refresh',
      tag: 'Design',
      members: ['MS', 'AC'],
      progress: 91,
      status: 'Nearly done',
      note: 'Final assets uploaded.',
    },
    {
      name: 'Q3 planning',
      tag: 'Ops',
      members: ['NP', 'LM', 'ZI', 'AC'],
      progress: 34,
      status: 'Gathering',
      note: '3 focus areas agreed.',
    },
  ],
  cta: 'See a live room',
};

export const faq = {
  heading: 'Questions, answered.',
  items: [
    {
      q: 'Can I import an existing project?',
      a: 'Yes — bring in a folder or repo and it becomes a room. The editor keeps your structure as-is.',
    },
    {
      q: 'Is the free plan really free?',
      a: 'Starter is free for up to 10 people with no card required. You can upgrade whenever you need more.',
    },
    {
      q: 'What about guest billing?',
      a: 'Guests are free. You only pay for seats in your team, so inviting a collaborator costs nothing.',
    },
    {
      q: 'Where is my data stored?',
      a: 'Your rooms, files and activity are stored on secure, region-pinned infrastructure. You can export at any time.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Plans are month-to-month and you can cancel from settings — your data stays downloadable.',
    },
    {
      q: 'Do you offer startup discounts?',
      a: 'We do. Startups under two years can write to us for a reduced rate on Team and Business plans.',
    },
  ],
};

export const finalCta = {
  headline: 'Start coding together in seconds.',
  copy: 'Open a shared room with a live editor, instant preview, voice call, and AI pair assistant.',
  inputPlaceholder: 'Enter room ID (e.g. team-sync)',
  submit: 'Open a room',
  success: 'Launching your Pro-Collab room…',
};

export const footer = {
  blurb: 'A calm workspace for teams that ship.',
  columns: [
    { title: 'Product', links: ['Features', 'How it works', 'Pricing', 'Changelog'] },
    { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
    { title: 'Resources', links: ['Docs', 'Guides', 'Community', 'Status'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
  ],
  copyright: 'Pro-Collab, Inc.',
};
