const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../../nextjs/src');
const DEST = path.join(__dirname, '../src');

const FILE_MAP = {
  'lib/utils.ts': 'lib/utils.js',
  'lib/firebase.ts': 'lib/firebase.js',
  'lib/chat.ts': 'lib/chat.js',
  'utils/mockData.ts': 'utils/mockData.js',
  'contexts/AuthContext.tsx': 'contexts/AuthContext.jsx',
  'components/layout/Layout.tsx': 'components/layout/Layout.jsx',
  'components/layout/Navbar.tsx': 'components/layout/Navbar.jsx',
  'components/layout/BottomNav.tsx': 'components/layout/BottomNav.jsx',
  'components/social/PostCard.tsx': 'components/social/PostCard.jsx',
  'components/social/CreatePost.tsx': 'components/social/CreatePost.jsx',
  'components/social/CommentSection.tsx': 'components/social/CommentSection.jsx',
  'components/marketplace/ListingCard.tsx': 'components/marketplace/ListingCard.jsx',
  'components/vendors/ReviewsSection.tsx': 'components/vendors/ReviewsSection.jsx',
  'pages/FeedPage.tsx': 'pages/FeedPage.jsx',
  'pages/MarketplacePage.tsx': 'pages/MarketplacePage.jsx',
  'pages/CommunityPage.tsx': 'pages/CommunityPage.jsx',
  'pages/VendorsPage.tsx': 'pages/VendorsPage.jsx',
  'pages/LoginPage.tsx': 'pages/LoginPage.jsx',
  'pages/ProfilePage.tsx': 'pages/ProfilePage.jsx',
  'pages/ProductPage.tsx': 'pages/ProductPage.jsx',
  'pages/AddListingPage.tsx': 'pages/AddListingPage.jsx',
  'pages/VendorDashboard.tsx': 'pages/VendorDashboard.jsx',
  'pages/VendorProfilePage.tsx': 'pages/VendorProfilePage.jsx',
  'pages/ChatPage.tsx': 'pages/ChatPage.jsx',
  'pages/AdminDashboard.tsx': 'pages/AdminDashboard.jsx',
  'pages/SeedPage.tsx': 'pages/SeedPage.jsx',
  'App.tsx': 'App.jsx',
};

function stripTypeScript(content, isJsx) {
  let result = content;

  // Remove type-only imports
  result = result.replace(/^import\s+type\s+.+;\n/gm, '');
  result = result.replace(/import\s+\{([^}]+)\}\s+from/g, (match, imports) => {
    const cleaned = imports.split(',').map(i => i.trim()).filter(i => !i.startsWith('type ')).join(', ');
    return cleaned ? `import { ${cleaned} } from` : '';
  });

  // Remove interface/type/enum blocks
  result = result.replace(/^export\s+(type|interface|enum)\s+[\s\S]*?^}\n/gm, '');
  result = result.replace(/^interface\s+\w+[\s\S]*?^}\n/gm, '');

  // Remove React.FC and similar
  result = result.replace(/:\s*React\.FC(?:<[^>]*>)?/g, '');
  result = result.replace(/React\.FC<[^>]*>/g, '');

  // Remove generic type params on functions/components
  result = result.replace(/(<[^>]+>)\s*\(/g, '(');

  // Remove variable type annotations
  result = result.replace(/:\s*React\.FormEvent(?:<[^>]*>)?/g, '');
  result = result.replace(/:\s*React\.ChangeEvent(?:<[^>]*>)?/g, '');
  result = result.replace(/:\s*React\.ReactNode/g, '');
  result = result.replace(/:\s*ConfirmationResult/g, '');
  result = result.replace(/:\s*any\b/g, '');
  result = result.replace(/:\s*string\b/g, '');
  result = result.replace(/:\s*number\b/g, '');
  result = result.replace(/:\s*boolean\b/g, '');
  result = result.replace(/:\s*'[^']*'\s*\|\s*'[^']*'(?:\s*\|\s*'[^']*')*/g, '');

  // Remove parameter types in destructuring props
  result = result.replace(/\(\{\s*([^}]+)\s*\}\s*:\s*\{[^}]+\}\)/g, '({ $1 })');
  result = result.replace(/\(\{\s*([^}]+)\s*\}\s*:\s*\w+\)/g, '({ $1 })');

  // Remove `as Type` casts
  result = result.replace(/\s+as\s+\w+(?:<[^>]+>)?/g, '');
  result = result.replace(/\s+as\s+\w+\[\]/g, '');

  // Remove return type annotations
  result = result.replace(/\):\s*Promise<[^>]+>/g, ')');
  result = result.replace(/\):\s*\w+(?:<[^>]+>)?\s*\{/g, ') {');
  result = result.replace(/\):\s*string\s*\{/g, ') {');
  result = result.replace(/\):\s*void\s*\{/g, ') {');

  // Remove OperationType enum - keep as object
  result = result.replace(/^export enum OperationType \{[\s\S]*?\}\n/gm, `export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

`);

  // Point Firebase imports at the env-based config module
  result = result.replace(
    /from ['"][^'"]*firebase-applet-config\.json['"]/g,
    "from './firebaseConfig'"
  );

  // Fix image paths for CRA public folder
  result = result.replace(/\/src\/assets\/images\//g, '/assets/images/');

  // Remove unused type imports from types
  result = result.replace(/from '\.\.\/types'/g, "from '../types'");
  result = result.replace(/from '\.\.\/\.\.\/types'/g, "from '../../types'");
  result = result.replace(/import\s+\{[^}]*\}\s+from\s+['"]\.\.\/types['"];?\n/g, '');

  // Remove `: Type` on useState
  result = result.replace(/useState<[^>]+>/g, 'useState');

  // Clean up double newlines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

const GEM_IMAGES = [
  'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1603561596112-0a132b757442?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1617038210897-9e438aeec8f5?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=800&auto=format&fit=crop',
];

for (const [srcFile, destFile] of Object.entries(FILE_MAP)) {
  const srcPath = path.join(SRC, srcFile);
  const destPath = path.join(DEST, destFile);
  if (!fs.existsSync(srcPath)) {
    console.warn('Missing:', srcPath);
    continue;
  }
  let content = fs.readFileSync(srcPath, 'utf8');
  content = stripTypeScript(content, destFile.endsWith('.jsx'));

  if (srcFile === 'utils/mockData.ts') {
    content = content.replace(
      /const GEM_IMAGES = \[[\s\S]*?\];/,
      `const GEM_IMAGES = ${JSON.stringify(GEM_IMAGES, null, 2)};`
    );
    content = content.replace(/from '\.\.\/types'/g, '');
    content = content.replace(/:\s*UserProfile\[\]/g, '');
    content = content.replace(/:\s*VendorProfile\[\]/g, '');
    content = content.replace(/:\s*GemListing\[\]/g, '');
    content = content.replace(/:\s*SocialPost\[\]/g, '');
    content = content.replace(/:\s*UserProfile/g, '');
    content = content.replace(/:\s*VendorProfile/g, '');
    content = content.replace(/:\s*GemListing/g, '');
    content = content.replace(/:\s*SocialPost/g, '');
    content = content.replace(/as UserRole\[\]/g, '');
    content = content.replace(/as VerificationLevel\[\]/g, '');
    content = content.replace(/as PostType\[\]/g, '');
    content = content.replace(/as UserProfile/g, '');
  }

  if (srcFile === 'components/layout/Navbar.tsx') {
    content = content.replace(
      'src="/assets/images/GemBook Logo.png"',
      'src="/assets/images/gembook-logo.svg"'
    );
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content);
  console.log('Converted:', destFile);
}

console.log('Done!');
