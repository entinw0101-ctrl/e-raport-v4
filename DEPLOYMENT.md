# Deployment Guide - E-RAPOT NUURUSH SHOLAAH

Panduan lengkap untuk deploy aplikasi E-RAPOT ke production.

## 🚀 Quick Deploy ke Vercel

### 1. Persiapan Repository

\`\`\`bash
# Clone dan setup project
git clone <repository-url>
cd e-rapot-nuurush-sholaah
npm install
\`\`\`

### 2. Setup Supabase Database

1. **Buat Project Supabase**
   - Login ke [supabase.com](https://supabase.com)
   - Create new project
   - Tunggu database setup selesai

2. **Setup Database Schema**
   \`\`\`bash
   # Copy environment variables dari Supabase dashboard
   cp .env.example .env.local
   
   # Edit .env.local dengan credentials Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DATABASE_URL=your_database_url
   \`\`\`

3. **Run Database Migration**
   \`\`\`bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   \`\`\`

### 3. Deploy ke Vercel

1. **Push ke GitHub**
   \`\`\`bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   \`\`\`

2. **Import ke Vercel**
   - Login ke [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import dari GitHub repository
   - Configure environment variables

3. **Environment Variables di Vercel**
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DATABASE_URL=your_database_url
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
   \`\`\`

4. **Deploy**
   - Click "Deploy"
   - Tunggu build process selesai
   - Aplikasi akan tersedia di URL Vercel

### 4. Post-Deployment Setup

1. **Update Supabase Auth Settings**
   - Buka Supabase Dashboard > Authentication > URL Configuration
   - Tambahkan production URL ke Site URL dan Redirect URLs
   - Format: `https://your-app.vercel.app`

2. **Test Production App**
   - Akses aplikasi di URL production
   - Test login/register functionality
   - Verify database operations

## 🔧 Advanced Configuration

### Custom Domain

1. **Add Domain di Vercel**
   - Project Settings > Domains
   - Add custom domain
   - Configure DNS records

2. **Update Supabase Settings**
   - Update Site URL dengan custom domain
   - Update redirect URLs

### Environment-Specific Configuration

\`\`\`env
# Production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Staging
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging-your-app.vercel.app
\`\`\`

### Database Backup Strategy

\`\`\`bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
\`\`\`

## 🔍 Monitoring & Maintenance

### 1. Vercel Analytics
- Enable di Project Settings > Analytics
- Monitor performance dan usage

### 2. Error Monitoring
- Check Vercel Functions logs
- Monitor Supabase logs

### 3. Database Monitoring
- Monitor Supabase dashboard
- Set up alerts untuk usage limits

## 🚨 Troubleshooting

### Common Deployment Issues

1. **Build Errors**
   \`\`\`bash
   # Test build locally
   npm run build
   
   # Check TypeScript errors
   npm run lint
   \`\`\`

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check Supabase project status
   - Verify IP restrictions

3. **Authentication Issues**
   - Check Supabase Auth settings
   - Verify redirect URLs
   - Check environment variables

4. **API Route Errors**
   - Check Vercel function logs
   - Verify environment variables
   - Test API endpoints locally

### Performance Optimization

1. **Database Optimization**
   - Add database indexes
   - Optimize queries
   - Use connection pooling

2. **Frontend Optimization**
   - Enable Next.js Image optimization
   - Use dynamic imports
   - Implement caching strategies

## 📋 Deployment Checklist

- [ ] Repository setup dan dependencies installed
- [ ] Supabase project created dan configured
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] GitHub repository connected to Vercel
- [ ] Production deployment successful
- [ ] Supabase Auth URLs updated
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Application tested in production
- [ ] Monitoring setup
- [ ] Backup strategy implemented

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
\`\`\`

## 📞 Support

Jika mengalami masalah deployment:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally dengan production build
4. Contact support team

---

**Happy Deploying! 🚀**
