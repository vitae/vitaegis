# 🚀 VITAEGIS - Quick Deploy to vitaegis.com

## One Command Deployment

Run this single command in your terminal:

```bash
./vercel-auto-deploy.sh
```

---

## What This Does

1. **Authenticates with Vercel** (opens browser - no password needed in terminal)
2. **Links your GitHub repo** to Vercel
3. **Adds vitaegis.com** as your custom domain
4. **Enables auto-deployment** on every git push

---

## Authentication (Safe & Secure)

When you run the script, you'll see:

```
> We sent an email to your-email@example.com. Please follow the steps provided
  inside it and make sure the security code matches XXX XXXX.
```

### Steps:
1. Check your email
2. Click the verification link
3. Confirm the security code matches
4. Return to terminal - it will continue automatically

**Alternative:** The script may open a browser window:
1. Log in with your Vercel account (or sign up)
2. Click "Authorize"
3. Return to terminal

---

## After Deployment

Once complete, you'll see:

```
✓ Automatic Deployment Setup Complete!

Your site: https://vitaegis.com
```

### Final Step: DNS Configuration

Add these DNS records to your domain registrar:

**A Record:**
- Name: `@`
- Value: `76.76.21.21`

**CNAME Record:**
- Name: `www`
- Value: `cname.vercel-dns.com`

Wait 5-30 minutes for DNS to propagate.

---

## Future Deployments (Automatic!)

After this one-time setup, just:

```bash
git push
```

Vercel automatically deploys to vitaegis.com! 🎉

---

**No credentials needed from you. Everything is done securely through your browser.**
