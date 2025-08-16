module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const mockLeads = [
      { id: '1', name: 'Test User 1', status: 'lead' },
      { id: '2', name: 'Test User 2', status: 'assessment_done' }
    ];

    res.status(200).json({
      leads: mockLeads,
      message: 'Leads test endpoint working!'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
