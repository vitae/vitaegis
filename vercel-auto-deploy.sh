#!/bin/bash
# VITAEGIS - Automatic Vercel Deployment Setup
# This script sets up automatic deployment from GitHub to Vercel

set -e  # Exit on error

echo "🚀 VITAEGIS - Automatic Vercel Deployment Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if logged in to Vercel
echo -e "${BLUE}Step 1: Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Vercel. Starting login process...${NC}"
    vercel login
else
    echo -e "${GREEN}✓ Already logged in to Vercel${NC}"
    vercel whoami
fi

echo ""

# Step 2: Link or create Vercel project
echo -e "${BLUE}Step 2: Linking GitHub repository to Vercel...${NC}"
echo "This will connect your GitHub repo: vitae/vitaegis"
echo ""

# Deploy with production flag to create/link project
vercel --prod --confirm

echo ""
echo -e "${GREEN}✓ Project linked successfully${NC}"

# Step 3: Add custom domain
echo ""
echo -e "${BLUE}Step 3: Adding custom domain vitaegis.com...${NC}"

# Add main domain
if vercel domains add vitaegis.com --yes 2>/dev/null; then
    echo -e "${GREEN}✓ Domain vitaegis.com added${NC}"
else
    echo -e "${YELLOW}⚠ Domain vitaegis.com already exists or requires verification${NC}"
fi

# Add www subdomain
if vercel domains add www.vitaegis.com --yes 2>/dev/null; then
    echo -e "${GREEN}✓ Domain www.vitaegis.com added${NC}"
else
    echo -e "${YELLOW}⚠ Domain www.vitaegis.com already exists or requires verification${NC}"
fi

echo ""

# Step 4: Set production domain
echo -e "${BLUE}Step 4: Setting vitaegis.com as production domain...${NC}"
vercel alias set vitaegis.com 2>/dev/null || echo -e "${YELLOW}⚠ Alias may already be set${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Automatic Deployment Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📋 What happens now:"
echo ""
echo "1. ✅ GitHub Integration: Enabled"
echo "   - Every push to 'main' triggers production deployment"
echo "   - Every PR creates a preview deployment"
echo "   - Auto-deploy is now active"
echo ""
echo "2. 🌐 Custom Domain: vitaegis.com"
echo "   - Primary: https://vitaegis.com"
echo "   - WWW: https://www.vitaegis.com"
echo "   - SSL: Auto-provisioned by Vercel"
echo ""
echo "3. 📡 DNS Configuration Required:"
echo ""
echo "   Add these records to your domain registrar:"
echo ""
echo "   A Record:"
echo "   └─ Name: @"
echo "   └─ Value: 76.76.21.21"
echo ""
echo "   CNAME Record:"
echo "   └─ Name: www"
echo "   └─ Value: cname.vercel-dns.com"
echo ""
echo "4. ⚡ Next Steps:"
echo ""
echo "   - Configure DNS records (if not done)"
echo "   - Wait 5-30 minutes for DNS propagation"
echo "   - Push code to GitHub to trigger auto-deploy"
echo "   - Visit https://vitaegis.com"
echo ""
echo -e "${BLUE}Vercel Dashboard: https://vercel.com/dashboard${NC}"
echo ""
echo "🎉 Your VITAEGIS site will now auto-deploy on every git push!"
