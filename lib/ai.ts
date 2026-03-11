import { createXai } from '@ai-sdk/xai'

const xai = createXai({ apiKey: process.env.XAI_API_KEY! })
export const llmModel = xai(process.env.LLM_MODEL ?? 'grok-4-1-fast')
export { generateText, generateObject, streamText } from 'ai'
