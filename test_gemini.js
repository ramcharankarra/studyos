import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

async function main() {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.VITE_GEMINI_API_KEY);
    const data = await response.json();
    const generateModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
    console.log("Supported Models for generateContent:");
    generateModels.forEach(m => console.log(m.name));
  } catch (error) {
    console.error("Error details:", error);
  }
}

main();
