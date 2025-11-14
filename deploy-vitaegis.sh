#!/bin/bash
# deploy-vitaegis.sh
# Fully reset and deploy Vitaegis to GitHub

# --- CONFIG ---
REPO_SSH="git@github.com:vitae/vitaegis.git"
BRANCH="main"

echo "⚠️  This will reset your local git history and force push!"
read -p "Are you sure you want to continue? (y/n) " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  echo "Aborted."
  exit 1
fi

# --- Step 1: Remove old git history ---
if [ -d ".git" ]; then
    echo "Removing existing .git folder..."
    rm -rf .git
fi

# --- Step 2: Initialize new git repo ---
echo "Initializing new git repository..."
git init
git checkout -b $BRANCH

# --- Step 3: Add all files ---
echo "Adding all files..."
git add .

# --- Step 4: Commit ---
echo "Committing files..."
git commit -m "Initial commit for Vitaegis"

# --- Step 5: Set remote ---
echo "Setting remote repository..."
git remote add origin $REPO_SSH 2>/dev/null || git remote set-url origin $REPO_SSH

# --- Step 6: Force push to GitHub ---
echo "Pushing to GitHub (force)..."
git push -u origin $BRANCH --force

echo "✅ Deployment complete!"
echo "Your GitHub repository has been reset and updated."
echo "You can now trigger a deploy on Vercel if needed."
