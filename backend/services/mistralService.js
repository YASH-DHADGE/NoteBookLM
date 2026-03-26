import axios from 'axios';

const mistralService = {
    async query(prompt, options = {}) {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            throw new Error("MISTRAL_API_KEY is not configured in .env");
        }

        try {
            const payload = {
                model: options.model || 'mistral-large-latest',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: options.temperature || 0.2
            };

            // Mistral supports native JSON response format constraint
            if (options.jsonFormat) {
                payload.response_format = { type: "json_object" };
            }

            const response = await axios.post(
                'https://api.mistral.ai/v1/chat/completions',
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60s timeout for large generation
                }
            );

            const answer = response.data.choices[0].message.content;
            
            return {
                answer,
                thinking: null // Mistral API doesn't expose native thinking logs like DeepSeek R1
            };
        } catch (error) {
            console.error("Mistral API Error:", error.response?.data || error.message);
            throw new Error(`Mistral API failed: ${error.response?.data?.message || error.message}`);
        }
    }
};

export default mistralService;
