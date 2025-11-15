#!/bin/bash
# Deployment script for VITAEGIS to Vercel with custom domain

echo "🚀 VITAEGIS Vercel Deployment Script"
echo "===================================="
echo ""

# Step 1: Login to Vercel (if not already logged in)
echo "Step 1: Authenticating with Vercel..."
vercel login

# Step 2: Deploy to production
echo ""
echo "Step 2: Deploying to Vercel production..."
vercel --prod

# Step 3: Add custom domain
echo ""
echo "Step 3: Adding custom domain vitaegis.com..."
vercel domains add vitaegis.com --yes

# Step 4: Set as primary domain
echo ""
echo "Step 4: Setting vitaegis.com as primary domain..."
vercel alias set vitaegis.com

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your site is now live at:"
echo "  - https://vitaegis.com"
echo "  - https://www.vitaegis.com (if configured)"
echo ""
echo "⚠️  DNS Configuration Required:"
echo "Add these records to your domain registrar:"
echo ""
echo "A Record:"
echo "  Name: @"
echo "  Value: 76.76.21.21"
echo ""
echo "CNAME Record:"
echo "  Name: www"
echo "  Value: cname.vercel-dns.com"
echo ""
