// api/chat.js
// Этот файл будет запущен на Vercel (сервере) и будет скрывать ваш API-ключ.
// This function acts as a proxy to securely call the Gemini API.

// 1. Установите URL Google API (без ключа, ключ будет добавлен с помощью process.env)
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// 2. Основная функция-обработчик для Vercel
export default async function handler(req, res) {
    // Установка заголовков CORS в начале, чтобы они применялись ко всем ответам (успех/ошибка)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка CORS preflight (Vercel часто делает это сам, но для надежности)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Проверка, что запрос пришел методом POST
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    // Проверка наличия API-ключа в переменных окружения Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        res.status(500).json({ error: 'Server configuration error: API Key missing.' });
        return;
    }

    try {
        // Ожидаем получить полный массив истории чата (chatHistory) и systemPrompt
        const { chatHistory, systemPrompt } = req.body;

        if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
            res.status(400).json({ error: 'Missing or invalid chatHistory array in request body.' });
            return;
        }

        // Формирование Payload для Gemini
        // *** ИСПОЛЬЗУЕМ ВЕСЬ МАССИВ chatHistory для contents ***
        const payload = {
            contents: chatHistory,
            tools: [{ "google_search": {} }],
            systemInstruction: {
                parts: [{ text: systemPrompt || "Ты — Личный Тренер по развитию, который мотивирует, поддерживает и дает полезные советы." }]
            },
        };

        // 3. Вызов реального Gemini API с использованием скрытого ключа
        const apiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await apiResponse.json();
        
        if (!apiResponse.ok) {
             // Возврат ошибок, если Gemini вернул их (например, ошибка 400)
            console.error("Gemini API Error Response:", data);
            res.status(apiResponse.status).json({ error: 'Gemini API call failed', details: data });
            return;
        }

        // 4. Передача ответа от Gemini обратно клиенту
        res.status(200).json(data);

    } catch (error) {
        console.error("Serverless function error:", error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

