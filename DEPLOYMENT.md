# VITAEGIS Vercel Deployment Guide

## Quick Deploy with Custom Domain (vitaegis.com)

### Option 1: Automated Script (Recommended)

```bash
./deploy-to-vercel.sh
```

This will:
1. Authenticate with Vercel
2. Deploy to production
3. Add vitaegis.com domain
4. Configure domain settings

---

### Option 2: Manual CLI Deployment

#### Step 1: Authenticate
```bash
vercel login
```
Follow the browser authentication flow.

#### Step 2: Deploy to Production
```bash
vercel --prod
```
Select or create your project when prompted.

#### Step 3: Add Custom Domain
```bash
vercel domains add vitaegis.com
```

#### Step 4: Link Domain to Project
```bash
vercel alias set vitaegis.com
```

---

### Option 3: Vercel Dashboard (Easiest for Custom Domains)

1. **Deploy First:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import `vitae/vitaegis` repository
   - Branch: `claude/professional-development-01KKEuytgBUUwFCFDswHXTkm`
   - Click Deploy

2. **Add Custom Domain:**
   - Go to Project Settings → Domains
   - Enter: `vitaegis.com`
   - Click "Add"
   - Follow DNS configuration instructions

---

## DNS Configuration

### Required DNS Records

Add these records to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare):

#### A Record (for root domain)
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

#### CNAME Record (for www subdomain)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### Alternative: Use Vercel Nameservers

For easier management, transfer DNS to Vercel nameservers:

1. Go to your domain registrar
2. Update nameservers to:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

---

## Verify Deployment

After deployment and DNS propagation (5-30 minutes):

- ✅ https://vitaegis.com
- ✅ https://www.vitaegis.com
- ✅ Auto HTTPS/SSL certificate
- ✅ Global CDN deployment

---

## Troubleshooting

### Domain Not Working
- **Wait 5-30 minutes** for DNS propagation
- Verify DNS records: `nslookup vitaegis.com`
- Check Vercel dashboard for domain status

### SSL Certificate Issues
- Vercel automatically provisions SSL
- Can take 5-10 minutes after DNS propagation
- Check domain settings in Vercel dashboard

### Deployment Errors
- Run: `npm run build` locally to verify
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json

---

## Environment Variables

If you need to add environment variables:

```bash
vercel env add VARIABLE_NAME
```

Or add via Vercel Dashboard → Settings → Environment Variables

---

## Production URLs

After deployment, your site will be available at:

- **Custom Domain:** https://vitaegis.com
- **Vercel URL:** https://vitaegis-[hash].vercel.app
- **Preview URL:** Auto-generated for each branch/PR

---

## Continuous Deployment

Once connected to GitHub:
- Every push to `main` → Production deployment
- Every PR → Preview deployment
- Automatic builds on commit

---

## Support

- Vercel Docs: https://vercel.com/docs
- Domain Setup: https://vercel.com/docs/custom-domains
- DNS Help: https://vercel.com/docs/edge-network/domains

---

**Built with Next.js 14, React Three Fiber, and Matrix Magic** 🟢
