#!/bin/bash
# deploy-vitaegis-clean.sh
# Clean repo setup for Vitaegis and push to GitHub + trigger Vercel deploy

# 1. Remove old git data (start fresh)
rm -rf .git

# 2. Initialize a new git repo
git init

# 3. Add remote GitHub repo (replace with your own repo URL if different)
git remote add origin git@github.com:vitae/vitaegis.git

# 4. Create proper .gitignore for Node + Next.js
cat > .gitignore <<EOL
# Node modules
node_modules/

# Next.js build output
.next/
out/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db

# Env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
EOL

# 5. Stage all files except ignored ones
git add .

# 6. Commit changes
git commit -m "Initial commit - cleaned repo for Vercel deployment"

# 7. Push to GitHub (force push to overwrite history if needed)
git branch -M main
git push -u origin main --force

echo "✅ GitHub repo cleaned and pushed. Now Vercel will build the site on its next deployment."
echo "💡 Make sure your Vercel project is connected to this GitHub repo."
