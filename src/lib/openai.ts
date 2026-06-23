import OpenAI from 'openai'

let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/** @deprecated Use getOpenAI() instead */
export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as Record<string | symbol, unknown>)[prop]
  },
})
