const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-nano',
            messages: [{ role: 'user', content: 'Hello, world!' }],
        });
        console.log('OpenAI Response:', response.choices[0].message.content);
    } catch (error) {
        console.error('OpenAI Error:', error);
    }
}

test();