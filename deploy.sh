#!/bin/bash
set -e

echo "🚀 Deploying tenir.app..."
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "⚠️  GitHub CLI (gh) not found. Install from https://cli.github.com"; }

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Check for .env.local
if [ ! -f .env.local ]; then
  echo ""
  echo "⚠️  No .env.local found. Creating from template..."
  cp .env.local.example .env.local
  echo "📝 Please edit .env.local with your actual keys before deploying:"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - ANTHROPIC_API_KEY"
  echo ""
  read -p "Press Enter once you've updated .env.local..."
fi

# 3. Test build
echo "🔨 Building..."
npm run build

echo "✅ Build successful!"
echo ""

# 4. Create GitHub repo
echo "📂 Setting up GitHub repository..."
if ! gh auth status >/dev/null 2>&1; then
  echo "⚠️  Not logged into GitHub CLI. Running gh auth login..."
  gh auth login
fi

REPO_NAME="tenir-app"
if ! gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --private --source=. --push
  echo "✅ Created GitHub repo: $REPO_NAME"
else
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "$(gh repo view $REPO_NAME --json sshUrl -q .sshUrl)"
  git push -u origin main 2>/dev/null || git push -u origin master
  echo "✅ Pushed to existing repo: $REPO_NAME"
fi

echo ""

# 5. Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if ! command -v vercel >/dev/null 2>&1; then
  echo "Installing Vercel CLI..."
  npm install -g vercel
fi

echo ""
echo "Setting up Vercel project..."
echo "When prompted:"
echo "  - Link to existing project? No"
echo "  - Project name: tenir-app"
echo "  - Framework: Next.js"
echo "  - Root directory: ./"
echo ""

vercel --prod

echo ""
echo "🎉 tenir.app is live!"
echo ""
echo "Next steps:"
echo "  1. Set up Supabase project at https://supabase.com"
echo "  2. Run the migration: supabase db push"
echo "  3. Add environment variables in Vercel dashboard"
echo "  4. Set your custom domain: tenir.app"
