# GeoLabel.AI - Geospatial Satellite Image Labeling Platform

A complete MVP for AI-powered satellite image labeling and change detection, built with Next.js, OpenLayers, and Supabase.

## 🌟 Features

- **GeoTIFF & COG Support**: Native handling of geospatial image formats
- **Interactive Map Viewer**: Pan, zoom, and visualize satellite imagery with OpenLayers
- **Spectral Band Toggle**: Switch between RGB, Infrared, and NDVI bands
- **Advanced Annotation Tools**: Draw bounding boxes, polygons, and points
- **AI Assistant**: Placeholder for ML-powered pre-labeling suggestions
- **Change Detection**: Compare two images and highlight differences
- **User Authentication**: Secure login/signup with Supabase Auth
- **Project Management**: Organize and manage your labeling projects
- **Responsive Design**: Modern UI built with TailwindCSS
- **Payment Integration**: Stripe integration for subscriptions

## 🚀 Tech Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Mapping**: OpenLayers, geotiff.js
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Deployment**: Vercel

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account (for payments)

### 1. Clone and Install
```bash
git clone <repository-url>
cd geospatial-labeler
npm install
```

### 2. Environment Variables
Copy `.env.local` and fill in your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_PUBLIC_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

### 3. Supabase Setup
1. Create a new Supabase project
2. Run the SQL schema from `src/lib/supabase-schema.sql`
3. Create a storage bucket called `geotiffs`
4. Configure authentication providers

### 4. Stripe Setup
1. Create products and prices in Stripe dashboard
2. Update price IDs in the frontend components

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── pricing/           # Pricing page
│   ├── upload/            # Upload page
│   └── change-detection/  # Change detection page
├── components/            # Reusable UI components
│   ├── MapViewer.tsx      # OpenLayers map component
│   ├── FileUploader.tsx   # Drag-and-drop file uploader
│   ├── LandingPage.tsx    # Landing page component
│   └── ...
└── lib/                   # Utility functions and configurations
    ├── supabase.ts        # Supabase client
    ├── stripe.ts          # Stripe client
    └── supabase-schema.sql # Database schema
```

## 🔧 Configuration

### Next.js Config
- Webpack configuration for handling GeoTIFF files
- Image domains configuration

### Vercel Deployment
- Environment variables setup
- Function timeout configurations

## 🌐 API Routes

- `/api/upload` - File upload endpoint
- `/api/projects` - Project management
- `/api/payments` - Stripe payment processing
- `/api/auth/[...nextauth]` - Authentication

## 🚀 Deployment

### Vercel
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@geolabel.ai or join our Discord community.

---

Built with ❤️ for geospatial data scientists and AI researchers.