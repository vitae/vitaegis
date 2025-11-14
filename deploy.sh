#!/bin/bash

# ===========================================
# Vitaegis One-Shot Web3 Deployment Script
# ===========================================

# --- Configuration ---
GITHUB_SSH_URL="git@github.com:vitae/vitaegis.git"
VERCEL_PROJECT_NAME="vitaegis"

# --- Ensure inside vitaegis folder ---
echo "Current directory: $(pwd)"

# --- Step 1: Initialize Git if not already ---
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
fi

# --- Step 2: Stage all files and commit ---
echo "Adding all files..."
git add .

echo "Committing files..."
git commit -m "Initial commit - full Vitaegis Vitality Web3 Store" || echo "No changes to commit"

# --- Step 3: Add GitHub remote if missing ---
if ! git remote | grep origin; then
    echo "Adding GitHub remote..."
    git remote add origin $GITHUB_SSH_URL
fi

# --- Step 4: Push to GitHub ---
echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

# --- Step 5: Install dependencies ---
echo "Installing npm dependencies..."
npm install

# --- Step 6: Deploy to Vercel ---
echo "Deploying to Vercel..."
vercel --prod --confirm --name $VERCEL_PROJECT_NAME

echo "✅ Deployment complete! Check https://$VERCEL_PROJECT_NAME.com"
