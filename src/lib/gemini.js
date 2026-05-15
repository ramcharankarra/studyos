import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM_PROMPT = `
You are a highly intelligent, encouraging, and helpful academic mentor for StudyOS, a modern educational platform.
Your goal is to help students learn, understand complex topics, summarize notes, and prepare for exams.

Guidelines:
- Be EXTREMELY concise and structured. Use markdown formatting (bolding, bullet points) to make answers easy to read.
- If the user asks a short or simple question, give a short 1-3 sentence answer. Only provide lengthy explanations if explicitly asked to "explain in detail".
- Avoid robotic or overly generic chatbot language. Sound like an enthusiastic, knowledgeable tutor.
- If asked for a quiz, generate 3-5 multiple choice questions with the correct answers explained at the end.
- If the user asks for code, provide clean, commented snippets.
- Keep your answers focused on education, productivity, and learning.
`;

export async function askAssistant(messages) {
  try {
    if (!apiKey || apiKey.includes('your_gemini_key')) {
      throw new Error("Missing or invalid Gemini API Key in .env.local");
    }

    // Use Gemini 2.5 Flash for fast, reliable mentoring
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT
    });

    // Convert OpenAI style messages to Gemini style history
    // Gemini history expects { role: "user" | "model", parts: [{ text: "..." }] }
    // The last message is the actual prompt being sent, so we exclude it from history
    
    if (messages.length === 0) return "";
    
    const currentMessage = messages[messages.length - 1].content;
    const rawHistory = messages.slice(0, messages.length - 1);
    const historyMessages = [];
    
    for (const msg of rawHistory) {
      // Skip error messages from being passed to history
      if (msg.content.startsWith('**Error:**')) continue;
      
      const role = msg.role === 'assistant' ? 'model' : 'user';
      
      // Gemini history MUST start with 'user'
      if (historyMessages.length === 0) {
        if (role === 'user') {
          historyMessages.push({ role, parts: [{ text: msg.content }] });
        }
      } else {
        // Gemini history MUST strictly alternate
        if (historyMessages[historyMessages.length - 1].role !== role) {
          historyMessages.push({ role, parts: [{ text: msg.content }] });
        }
      }
    }

    const chat = model.startChat({
      history: historyMessages,
    });

    const result = await chat.sendMessage(currentMessage);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

export async function processStudyMaterial(material, actionType) {
  try {
    if (!apiKey || apiKey.includes('your_gemini_key')) {
      throw new Error("Missing or invalid Gemini API Key in .env.local");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    let prompt = "";
    if (actionType === 'summarize') {
      prompt = `Please provide a comprehensive and highly structured summary of the following study material. Use headings, bullet points, and bold text for key terms. Focus on educational clarity.`;
    } else if (actionType === 'extract') {
      prompt = `Extract the most important key points, definitions, and core concepts from the following study material. Format as a clean, easy-to-read list.`;
    } else if (actionType === 'questions') {
      prompt = `Generate 5-10 important exam-style questions (a mix of conceptual and multiple-choice) based on the following study material. Include the correct answers and a brief explanation at the very end.`;
    } else if (actionType === 'revision') {
      prompt = `Create a concise, high-yield revision sheet for the following study material. Focus only on the absolute must-know facts, formulas (if any), and critical summaries needed for an exam.`;
    } else {
      prompt = `Analyze this material.`;
    }

    let contents = [prompt];

    if (material.type === 'text') {
      contents = [`${prompt}\n\nMaterial:\n${material.data}`];
    } else if (material.type === 'image') {
      const imagePart = {
        inlineData: {
          data: material.data, // base64 string
          mimeType: material.mimeType
        }
      };
      contents = [prompt, imagePart];
    }

    const result = await model.generateContent(contents);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error (Notes):", error);
    throw new Error(`Failed to process material: ${error.message}`);
  }
}

export async function generateQuiz(topic, contextText = "", numQuestions = 5) {
  try {
    if (!apiKey || apiKey.includes('your_gemini_key')) {
      throw new Error("Missing or invalid Gemini API Key in .env.local");
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      // Force JSON output
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    
    let prompt = `You are an expert educator. Generate a multiple-choice quiz about "${topic}".
Create exactly ${numQuestions} questions.

If context material is provided below, base the questions strictly on that material. If no material is provided, use your general knowledge.

REQUIREMENTS:
- Return ONLY a valid JSON array of question objects.
- Each object MUST have this exact schema:
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The exact string from the options array that is correct",
    "explanation": "A short 1-2 sentence explanation of why it is correct"
  }

Context Material:
${contextText || "None provided."}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Parse the JSON response
    const jsonString = response.text();
    const quizData = JSON.parse(jsonString);
    
    return quizData;
  } catch (error) {
    console.error("Gemini Quiz Generation Error:", error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
}

export const generateLearningProfile = async (attemptsSummary, subjectsContext) => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("Missing Gemini API Key");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `You are a personalized AI academic tutor analyzing a student's performance data.
    
    Here is the summary of the student's past quiz attempts:
    ${JSON.stringify(attemptsSummary, null, 2)}
    
    Here are the subjects the student is enrolled in:
    ${JSON.stringify(subjectsContext, null, 2)}
    
    Analyze this data and generate a personalized learning profile. Focus on identifying weak topics, evaluating mastery levels per subject, and setting actionable daily goals.
    
    You MUST return ONLY a raw JSON string with the following EXACT schema:
    {
      "masteryLevels": [
        { "subject": "Subject Name", "level": "Intermediate", "progress": 65 } // level: Beginner, Intermediate, or Advanced
      ],
      "weakTopics": [
        "String representation of weak concept 1",
        "String representation of weak concept 2"
      ],
      "dailyGoals": [
        "Actionable goal 1",
        "Actionable goal 2"
      ],
      "aiInsight": "A personalized 2-3 sentence paragraph directly addressing the student, summarizing their performance, praising strengths, and pointing out areas to focus on."
    }`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error generating learning profile:", error);
    throw new Error("Failed to generate personalized learning profile. Please try again.");
  }
};

export const generateAssignmentFeedback = async (assignmentDescription, submissionContent) => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("Missing Gemini API Key");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `You are an expert AI Teaching Assistant. 
    A student has submitted an assignment.
    
    Assignment Description:
    ${assignmentDescription}
    
    Student Submission:
    ${submissionContent}
    
    Analyze the student's submission against the assignment requirements. 
    Identify missing concepts, point out strengths, and provide actionable suggestions for improvement.
    Be constructive, encouraging, and specific. Keep it under 3 paragraphs.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    return responseText.trim();
  } catch (error) {
    console.error("Gemini Assignment Feedback Error:", error);
    throw error;
  }
};

export const generateProfileInsights = async (performanceData) => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("Missing Gemini API Key");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `You are an expert Academic Advisor AI. 
    Analyze the following student performance data:
    
    ${JSON.stringify(performanceData, null, 2)}
    
    Based on this data, provide:
    1. The student's strongest subject.
    2. The subject that needs the most improvement.
    3. A brief, encouraging 2-sentence motivational insight directly addressing the student.
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "strongestSubject": "Subject Name",
      "weakestSubject": "Subject Name",
      "insight": "Motivational message here."
    }`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Clean up potential markdown formatting
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Profile Insight Error:", error);
    throw error;
  }
};
