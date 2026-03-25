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

  const geminiKey = process.env.GOOGLE_API_KEY;

  if (!geminiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    // Extract personalization context from request
    const { userName = '', userEmail = '', userPhone = '', userService = '', messages = [], system = '' } = req.body;

    // Build system prompt
    let personalizedSystemPrompt = system || '';
    if (userName) {
      personalizedSystemPrompt += `\n\nYou are speaking with ${userName}.`;
    }
    if (userService) {
      personalizedSystemPrompt += `\n\nThe user is interested in: ${userService}.`;
    }
    if (userEmail || userPhone) {
      personalizedSystemPrompt += `\n\nContact: ${userEmail || ''} ${userPhone || ''}`;
    }

    // Convert messages for Gemini
    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: personalizedSystemPrompt }]
          },
          contents,
          generationConfig: { maxOutputTokens: 180 }
        })
      }
    );

    const data = await response.json();

    // Make Gemini's response compatible with front-end expectations
    if (data.candidates && data.candidates[0]) {
      return res.status(200).json({
        content: [{
          type: 'text',
          text: data.candidates[0].content.parts[0].text
        }]
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
