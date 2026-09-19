// ai-analysis.js
// دالة Netlify آمنة تستقبل بيانات المشروع من التطبيق وتستدعي Anthropic API
// من طرف الخادم، بحيث يبقى مفتاح الـ API سرياً ولا يظهر أبداً في المتصفح.
//
// ضع هذا الملف في مستودعك على GitHub في المسار التالي بالضبط:
//   netlify/functions/ai-analysis.js
//
// ثم أضف متغير البيئة ANTHROPIC_API_KEY من إعدادات Netlify (شرح كامل في الرد).

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'مفتاح خدمة الذكاء الاصطناعي غير مُعد على الخادم بعد.' })
    };
  }

  let prompt;
  try {
    const parsed = JSON.parse(event.body || '{}');
    prompt = parsed.prompt;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'بيانات الطلب غير صحيحة.' }) };
  }

  if (!prompt || typeof prompt !== 'string' || prompt.length > 4000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'بيانات المشروع ناقصة أو غير صالحة.' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: (data.error && data.error.message) || 'تعذّر الاتصال بخدمة الذكاء الاصطناعي.' })
      };
    }

    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!text) {
      return { statusCode: 502, body: JSON.stringify({ error: 'لم يصل رد من خدمة التحليل.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'خطأ داخلي في الخادم، حاول مرة أخرى.' }) };
  }
};
