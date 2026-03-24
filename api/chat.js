export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Extract user personalization context from request
    const { userName = '', userEmail = '', userPhone = '', userService = '', ...restBody } = req.body;
    
    // Build personalization context
    let personalizedSystemPrompt = restBody.system || '';
    if (userName) {
      personalizedSystemPrompt += `\n\nYou are speaking with ${userName}.`;
    }
    if (userService) {
      personalizedSystemPrompt += `\n\nThe user is interested in: ${userService}.`;
    }
    if (userEmail || userPhone) {
      personalizedSystemPrompt += `\n\nContact: ${userEmail || ''} ${userPhone || ''}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        ...restBody,
        system: personalizedSystemPrompt
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}