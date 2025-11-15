# VITAEGIS - Automatic Deployment from GitHub to Vercel

This guide will set up **automatic deployment** so that every time you push code to GitHub, it automatically deploys to **vitaegis.com**.

---

## 🚀 Quick Setup (One Command)

Run this script to automatically configure everything:

```bash
./vercel-auto-deploy.sh
```

This will:
- ✅ Authenticate with Vercel
- ✅ Link your GitHub repository
- ✅ Add vitaegis.com domain
- ✅ Enable auto-deployment on every push
- ✅ Configure production settings

**That's it!** After running this script, every git push will trigger a deployment.

---

## 📋 Manual Setup (Step-by-Step)

If you prefer to set it up manually:

### Step 1: Authenticate with Vercel

```bash
vercel login
```

Follow the browser authentication flow.

### Step 2: Link GitHub Repository

```bash
cd /home/user/vitaegis
vercel --prod
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No** (or Yes if you already created one)
- What's your project's name? **vitaegis**
- In which directory is your code located? **./`**
- Override settings? **No**

### Step 3: Connect to GitHub (Web Dashboard)

1. Go to: https://vercel.com/dashboard
2. Find your **vitaegis** project
3. Click **Settings** → **Git**
4. Click **Connect Git Repository**
5. Select **GitHub**
6. Choose repository: **vitae/vitaegis**
7. Branch: **claude/professional-development-01KKEuytgBUUwFCFDswHXTkm** (or main)

### Step 4: Add Custom Domain

In Vercel Dashboard:
1. Go to **Project Settings** → **Domains**
2. Add domain: `vitaegis.com`
3. Add domain: `www.vitaegis.com`
4. Follow DNS configuration instructions

Or via CLI:
```bash
vercel domains add vitaegis.com
vercel domains add www.vitaegis.com
vercel alias set vitaegis.com
```

---

## 🌐 DNS Configuration

Add these DNS records to your domain registrar (GoDaddy, Namecheap, etc.):

### A Record (Root Domain)
```
Type: A
Name: @ (or leave blank for root)
Value: 76.76.21.21
TTL: 3600
```

### CNAME Record (WWW Subdomain)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**DNS Propagation:** Takes 5-30 minutes. Use [dnschecker.org](https://dnschecker.org) to verify.

---

## ⚡ How Automatic Deployment Works

Once configured, here's what happens automatically:

### When you push to GitHub:

```bash
git add .
git commit -m "Update website"
git push origin claude/professional-development-01KKEuytgBUUwFCFDswHXTkm
```

**Vercel automatically:**
1. Detects the push
2. Clones your repository
3. Runs `npm install`
4. Runs `npm run build`
5. Deploys to production
6. Updates vitaegis.com
7. Sends you a notification (if enabled)

**Total time:** ~2 minutes from push to live!

### Production vs Preview Deployments

- **Production:** Pushes to your main/production branch → Deploys to vitaegis.com
- **Preview:** Pull requests and other branches → Unique preview URL

---

## 🔧 Configuration Files

Your project includes these auto-deployment configurations:

### `vercel.json`
Main Vercel configuration with:
- Build commands
- Framework detection (Next.js)
- Domain aliases (vitaegis.com)
- GitHub integration settings
- Multi-region deployment

### `.vercelrc`
Additional Vercel settings:
- Auto-aliasing enabled
- GitHub auto-deployment enabled
- Region preferences

---

## 📊 Monitoring Deployments

### Via Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Click on **vitaegis** project
3. View deployment history
4. See build logs in real-time
5. Check domain status

### Via CLI
```bash
# List deployments
vercel ls

# View logs for latest deployment
vercel logs

# Check domain status
vercel domains ls
```

---

## 🎯 Deployment Workflow

Your typical workflow:

```bash
# 1. Make changes to your code
vim components/Layout.js

# 2. Test locally
npm run dev

# 3. Commit changes
git add .
git commit -m "Update navigation design"

# 4. Push to GitHub
git push origin claude/professional-development-01KKEuytgBUUwFCFDswHXTkm

# 5. Vercel automatically deploys!
# Check: https://vitaegis.com (live in ~2 minutes)
```

---

## 🔐 Environment Variables

If you need to add environment variables (API keys, secrets):

### Via CLI:
```bash
vercel env add VARIABLE_NAME production
```

### Via Dashboard:
1. Project Settings → Environment Variables
2. Add variable name and value
3. Select environments (Production, Preview, Development)
4. Save

---

## 🐛 Troubleshooting

### Deployment Failed
- Check build logs in Vercel dashboard
- Verify `npm run build` works locally
- Check for missing dependencies in package.json

### Domain Not Working
- Verify DNS records are correct
- Wait 30 minutes for DNS propagation
- Check domain status in Vercel dashboard
- Use: `nslookup vitaegis.com`

### GitHub Not Auto-Deploying
- Ensure GitHub integration is connected
- Check branch name matches production branch
- Verify webhook is active (Settings → Git in Vercel)

### Build Errors
- Run `npm run build` locally first
- Check Node version compatibility
- Clear Vercel cache: Settings → General → Clear Cache

---

## 📱 Notifications

Enable deployment notifications:

1. Vercel Dashboard → Settings → Notifications
2. Choose notification channels:
   - Email
   - Slack
   - Discord
   - Webhook

Get notified for:
- ✅ Successful deployments
- ❌ Failed deployments
- 🔔 Domain updates

---

## 🎨 Branch-Based Deployments

Configure different branches for different environments:

### Production Branch
- Branch: `main` or `claude/professional-development-01KKEuytgBUUwFCFDswHXTkm`
- Domain: vitaegis.com
- Auto-deploy: Enabled

### Preview Branches
- Any other branch or PR
- Domain: Auto-generated preview URL
- Perfect for testing before going live

---

## 📈 Deployment Analytics

Monitor your site performance:
1. Vercel Dashboard → Analytics
2. View:
   - Page views
   - Load times
   - Error rates
   - Traffic sources

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `./vercel-auto-deploy.sh` runs successfully
- [ ] GitHub repository is connected
- [ ] vitaegis.com domain is added
- [ ] DNS records are configured
- [ ] Test push triggers auto-deployment
- [ ] Visit https://vitaegis.com (works!)
- [ ] SSL certificate is active (🔒 in browser)
- [ ] Deployment notifications enabled

---

## 🆘 Support

- **Vercel Docs:** https://vercel.com/docs
- **GitHub Integration:** https://vercel.com/docs/git
- **Custom Domains:** https://vercel.com/docs/custom-domains
- **Support:** https://vercel.com/support

---

## 🎉 Success!

Once configured, you never have to manually deploy again!

```bash
# Your new workflow:
git push  # That's it! Auto-deploys to vitaegis.com
```

**Built with Next.js 14, React Three Fiber, and automated with Vercel** 🚀
