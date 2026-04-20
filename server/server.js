const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/restrooms', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    // Using Refuge Restrooms API
    const response = await axios.get(`https://www.refugerestrooms.org/api/v1/restrooms/search`, {
      params: {
        lat,
        lng,
        page: 1,
        per_page: 20
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching restrooms:', error);
    res.status(500).json({ error: 'Failed to fetch restrooms' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});