const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { HfInference } = require('@huggingface/inference');
const OpenAI = require('openai');
const GeoTIFF = require('geotiff');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/tiff',
      'image/tif',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/octet-stream' // For COG files
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.tif') || file.originalname.endsWith('.tiff')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only GeoTIFF, COG, and regular images are allowed.'));
    }
  }
});

// Initialize AI clients
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// File upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;

    // Check if it's a GeoTIFF file
    let metadata = null;
    if (req.file.originalname.endsWith('.tif') || req.file.originalname.endsWith('.tiff') || req.file.mimetype.includes('tiff')) {
      try {
        const arrayBuffer = fs.readFileSync(filePath);
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const bbox = image.getBoundingBox();

        metadata = {
          width: image.getWidth(),
          height: image.getHeight(),
          bbox: bbox,
          crs: image.geoKeys?.ProjectedCSTypeGeoKey || 'EPSG:4326',
          bands: image.getSamplesPerPixel(),
          isGeoTIFF: true
        };
      } catch (geoError) {
        console.log('Not a valid GeoTIFF, treating as regular image');
        metadata = { isGeoTIFF: false };
      }
    }

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      metadata: metadata
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// AI labeling endpoint
app.get('/labels/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Mock AI labeling data for now
    // In production, this would call actual AI APIs
    const mockLabels = [
      {
        type: 'bbox',
        label: 'building',
        confidence: 0.85,
        coordinates: [[100, 100], [200, 100], [200, 200], [100, 200]]
      },
      {
        type: 'polygon',
        label: 'road',
        confidence: 0.92,
        coordinates: [[50, 150], [150, 140], [200, 160], [180, 170], [80, 165]]
      },
      {
        type: 'bbox',
        label: 'vehicle',
        confidence: 0.78,
        coordinates: [[300, 250], [350, 250], [350, 280], [300, 280]]
      }
    ];

    res.json(mockLabels);
  } catch (error) {
    console.error('AI labeling error:', error);
    res.status(500).json({ error: 'AI labeling failed' });
  }
});

// Change detection endpoint
app.post('/change-detection', upload.fields([
  { name: 'before', maxCount: 1 },
  { name: 'after', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files.before || !req.files.after) {
      return res.status(400).json({ error: 'Both before and after images are required' });
    }

    const beforePath = req.files.before[0].path;
    const afterPath = req.files.after[0].path;

    // Mock change detection result
    // In production, would use ML models for actual change detection
    const changes = [
      {
        type: 'addition',
        geometry: { type: 'Polygon', coordinates: [[[100, 100], [150, 100], [150, 150], [100, 150], [100, 100]]] },
        confidence: 0.87,
        description: 'New building construction'
      },
      {
        type: 'removal',
        geometry: { type: 'Polygon', coordinates: [[[200, 200], [250, 200], [250, 250], [200, 250], [200, 200]]] },
        confidence: 0.91,
        description: 'Vegetation removal'
      }
    ];

    res.json({
      success: true,
      changes: changes,
      beforeUrl: `/uploads/${req.files.before[0].filename}`,
      afterUrl: `/uploads/${req.files.after[0].filename}`
    });
  } catch (error) {
    console.error('Change detection error:', error);
    res.status(500).json({ error: 'Change detection failed' });
  }
});

// Dataset management endpoints
app.get('/datasets', (req, res) => {
  // Mock dataset list - in production would query database
  const datasets = [
    {
      id: '1',
      name: 'Urban Planning Dataset',
      description: 'Satellite imagery for urban planning analysis',
      images: 150,
      labels: 450,
      created: new Date().toISOString(),
      status: 'completed'
    },
    {
      id: '2',
      name: 'Agricultural Monitoring',
      description: 'Crop monitoring and yield prediction data',
      images: 200,
      labels: 600,
      created: new Date().toISOString(),
      status: 'in_progress'
    }
  ];

  res.json(datasets);
});

app.post('/datasets', express.json(), (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Dataset name is required' });
  }

  // Mock dataset creation
  const newDataset = {
    id: Date.now().toString(),
    name,
    description: description || '',
    images: 0,
    labels: 0,
    created: new Date().toISOString(),
    status: 'empty'
  };

  res.status(201).json(newDataset);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`GeoLabel.AI backend server running on port ${PORT}`);
  console.log(`Hugging Face API: ${process.env.HUGGINGFACE_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
});