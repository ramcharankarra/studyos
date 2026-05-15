import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

async function main() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say this is a test' }],
    });
    console.log("Success:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error details:", error);
  }
}

main();
