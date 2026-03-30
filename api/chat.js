export default async function handler(req, res) {
  // ✅ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const geminiKey = process.env.GOOGLE_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

  try {
    // ✅ Extract personalization & messages
    const { userName = '', userEmail = '', userPhone = '', userService = '', messages = [], system = '' } = req.body;

    let personalizedSystemPrompt = system || '';
    if (userName) personalizedSystemPrompt += `\n\nYou are speaking with ${userName}.`;
    if (userService) personalizedSystemPrompt += `\n\nThe user is interested in: ${userService}.`;
    if (userEmail || userPhone) personalizedSystemPrompt += `\n\nContact: ${userEmail || ''} ${userPhone || ''}`;

    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // ✅ Predefined answers (fixed responses)
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

    if (lastMessage.includes('price')) {
      return res.status(200).json({
        content: [{ type: 'text', text: "Our price starts from $100." }]
      });
    }

    if (lastMessage.includes('contact')) {
      return res.status(200).json({
        content: [{ type: 'text', text: "You can contact us via email or phone." }]
      });
    }

    if (!lastMessage.trim()) {
      return res.status(200).json({
        content: [{ type: 'text', text: "Please enter a valid message." }]
      });
    }

    // ✅ Call Gemini API for dynamic questions
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + geminiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: personalizedSystemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 180 }
        })
      }
    );

    const data = await response.json();

    // 🔍 Debug logs
    console.log("Gemini FULL RESPONSE:", JSON.stringify(data, null, 2));

    // ✅ Safe extraction of AI reply
    let replyText = "Sorry, I am having trouble right now.";
    if (data?.candidates?.length > 0) {
      const parts = data.candidates[0].content?.parts;
      if (parts && parts.length > 0) {
        replyText = parts.map(p => p.text).join(" ");
      }
    }

    console.log("FINAL REPLY:", replyText);

    // ✅ Return frontend-compatible response
    return res.status(200).json({
      content: [{ type: 'text', text: replyText }]
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: "AI is temporarily unavailable. Try again later." });
  }
}
