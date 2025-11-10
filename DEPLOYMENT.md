# Deployment Guide - SafePay AI

This guide covers deploying SafePay AI to production on Netlify.

## Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No console errors in browser
- [ ] Environment variables configured (if needed)
- [ ] Security headers verified
- [ ] Performance optimizations enabled

## Netlify Deployment Steps

### 1. Prepare Your Repository

Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Connect to Netlify

**Option A: Via Netlify Dashboard**
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Authenticate with your Git provider
4. Select your repository

**Option B: Via Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify init
```

### 3. Configure Build Settings

In Netlify dashboard, go to **Site settings → Build & deploy**:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18 (or higher)

### 4. Set Environment Variables

Go to **Site settings → Environment variables**:

- `NODE_ENV` = `production`

Add any other environment variables your app needs.

### 5. Deploy

**Automatic Deploys:**
- Netlify will automatically deploy on every push to your main branch
- Preview deployments are created for pull requests

**Manual Deploy:**
```bash
netlify deploy --prod
```

## Post-Deployment Verification

1. **Check Build Logs**
   - Verify build completed successfully
   - Check for any warnings or errors

2. **Test the Application**
   - Visit your deployed site
   - Test wallet connection
   - Verify all features work correctly

3. **Check Security Headers**
   - Use [SecurityHeaders.com](https://securityheaders.com) to verify headers
   - Ensure CSP is properly configured

4. **Performance Check**
   - Use Lighthouse to audit performance
   - Verify bundle sizes are optimized

## Custom Domain Setup

1. Go to **Site settings → Domain management**
2. Click "Add custom domain"
3. Follow Netlify's DNS configuration instructions

## Continuous Deployment

Netlify automatically deploys when you push to your main branch. To disable:

1. Go to **Site settings → Build & deploy → Continuous Deployment**
2. Uncheck "Automatically deploy"

## Environment-Specific Configurations

### Production
- `NODE_ENV=production`
- Minified and optimized builds
- Console.logs removed
- Source maps enabled (for debugging)

### Preview/Staging
- Uses same production build
- Can have different environment variables
- Useful for testing before production

## Troubleshooting

### Build Fails

**Check:**
- Node version compatibility
- Missing dependencies
- TypeScript errors
- Webpack configuration

**Solution:**
```bash
# Test build locally
npm run build

# Check for errors
npm run build:dev
```

### Assets Not Loading

**Check:**
- Public path configuration in webpack
- Asset paths in HTML
- Netlify redirects configuration

**Solution:**
- Verify `publicPath: '/'` in webpack.config.js
- Check `_redirects` file in public folder

### Wallet Connection Issues

**Check:**
- CSP headers allow wallet providers
- HTTPS is enabled (required for Web3)
- Wallet extension is installed

**Solution:**
- Verify CSP in `netlify.toml`
- Ensure site is served over HTTPS

## Monitoring

### Netlify Analytics
- Enable in **Site settings → Analytics**
- Track page views and performance

### Error Tracking
- Consider adding error tracking (Sentry, etc.)
- Monitor console errors in production

## Rollback

If deployment has issues:

1. Go to **Deploys** tab
2. Find the last working deployment
3. Click "Publish deploy"

## Performance Optimization

After deployment, verify:
- ✅ Bundle sizes are optimized
- ✅ Assets are cached properly
- ✅ Code splitting is working
- ✅ Images are optimized (if any)

## Security Checklist

- ✅ CSP headers configured
- ✅ XSS protection enabled
- ✅ HTTPS enforced
- ✅ Input sanitization working
- ✅ No sensitive data in client code

---

For more information, see [Netlify Documentation](https://docs.netlify.com/)

